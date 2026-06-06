# Módulo 3 — Base de Datos y Flyway (Persistencia)

---

## 1. QUÉ ES FLYWAY Y POR QUÉ SE USA

### El problema que resuelve

Sin Flyway, el esquema de la base de datos vive solo en la cabeza del equipo. Fernando Tapia crea una tabla nueva, la tiene en su PC, pero el compañero que clona el repo no la tiene. En producción tampoco existe. La BD de desarrollo y la de producción divergen silenciosamente hasta que algo explota.

Flyway es un **sistema de control de versiones para la base de datos**, exactamente como Git es control de versiones para el código. Cada cambio al esquema se guarda como un archivo SQL con número de versión. Flyway registra qué versiones ya aplicó en cada servidor, y al arrancar Spring Boot aplica automáticamente las versiones que faltan.

Analogía: es como tener un historial de actualizaciones de Windows. Cada PC tiene registrado qué parches instaló. El servidor solo aplica los que le faltan, en orden.

---

### Cómo funciona el versionado V1, V2, V3...

`Producto/backend/src/main/resources/db/migration/`

El nombre del archivo sigue el patrón: `V<número>__<descripción>.sql`

- `V` = prefijo fijo que Flyway reconoce como "migración versionada"
- `<número>` = versión, puede ser entero o decimal (`V1`, `V2`, `V7.1`)
- `__` = doble guion bajo (separador obligatorio)
- `<descripción>` = texto libre para humanos

Al arrancar Spring Boot, Flyway:
1. Escanea `db/migration/` buscando archivos `V*.sql`
2. Consulta su tabla de historial en MySQL
3. Aplica en orden numérico los archivos que aún no están registrados
4. Actualiza el historial con cada migración aplicada

**Regla de oro**: una vez que un archivo `V*.sql` fue aplicado en cualquier entorno, **nunca se modifica**. Si hay que cambiar algo, se crea un nuevo `V<siguiente>__...sql`. Modificar un archivo ya aplicado causa el error de checksum.

---

### Qué es el checksum y por qué causó el error al cambiar de PC

Cuando Flyway aplica una migración por primera vez, calcula un **hash del contenido del archivo** (como un MD5) y lo guarda en su historial. Cada vez que Spring Boot arranca, recalcula el hash del archivo en disco y lo compara con el registrado.

Si coinciden → todo bien.
Si no coinciden → Flyway lanza: `Migration checksum mismatch for migration V3`.

Esto pasa cuando:
- Alguien edita un archivo de migración ya aplicado
- Se copia el archivo entre PCs y el editor de texto cambia los saltos de línea (`\n` Linux vs `\r\n` Windows)
- Se cambia el encoding del archivo

En el proyecto tuvieron este problema al cambiar de PC: Windows guardó los archivos con `CRLF` (salto de línea Windows) y la PC original los tenía con `LF` (Unix). El contenido "visible" es el mismo, pero el hash es distinto.

**Solución**: configurar Git para no convertir saltos de línea (`autocrlf = false`), o en casos extremos, reparar usando `flyway repair` que actualiza el checksum registrado al actual.

---

### Qué es la tabla `flyway_schema_history`

Es la tabla que Flyway crea automáticamente en la BD (no la creas tú). Tiene una fila por cada migración aplicada:

```sql
installed_rank | version | description          | type | script                         | checksum    | installed_by | installed_on        | execution_time | success
1              | 1       | schema auth          | SQL  | V1__schema_auth.sql            | -748291034  | flowsense    | 2025-03-15 10:22:11 | 142            | 1
2              | 2       | schema recintos zonas| SQL  | V2__schema_recintos_zonas.sql  | 892103847   | flowsense    | 2025-03-15 10:22:11 | 89             | 1
...
```

Si ves `success = 0` en alguna fila, esa migración falló a mitad y la BD puede estar en estado inconsistente. Requiere intervención manual.

---

## 2. RECORRIDO POR CADA MIGRACIÓN

### V1 — `V1__schema_auth.sql` — Autenticación

`Producto/backend/src/main/resources/db/migration/V1__schema_auth.sql`

Crea tres tablas que forman el sistema de identidad:

**`ORGANIZACIONES`**: La unidad raíz del sistema. Todo usuario pertenece a una organización. En el MVP solo hay una organización por deploy, pero el modelo ya soporta multi-tenant.

**`USUARIOS`**: Los administradores del sistema. Columnas clave:
- `password_hash`: nunca texto plano, siempre BCrypt
- `rol`: solo `'ADMIN'` en el MVP
- `activo`: soft-delete (marcar inactivo en lugar de borrar)
- `ultimo_login`: para auditoría y seguridad

**`TOKENS_AUTH`**: Tokens de un solo uso para dos flujos:
- `INVITACION_ORG`: invitar a otro admin a la organización
- `PASSWORD_RESET`: recuperación de contraseña

El campo `usado = BOOLEAN DEFAULT FALSE` es crítico: al usar un token (hacer click en el link), se marca `usado = TRUE`. Si alguien intercepta el mismo link y lo intenta de nuevo, el sistema lo rechaza.

---

### V2 — `V2__schema_recintos_zonas.sql` — El negocio

`Producto/backend/src/main/resources/db/migration/V2__schema_recintos_zonas.sql`

**`RECINTOS`**: Los espacios comerciales que el admin gestiona (un mall, una galería). Tiene `precio_base_clp` para guardar el precio de referencia que el admin usa para calcular precios sugeridos.

**`ZONAS`**: Las áreas que el admin dibuja sobre el frame del video. Columnas clave:
- `x_norm`, `y_norm`, `ancho_norm`, `alto_norm`: coordenadas en `DECIMAL(6,4)` → rango 0.0000 a 9.9999, precisión de 4 decimales. Suficiente para ubicación subpíxel
- `color_hex`: el color del rectángulo en el editor (`#3498db`)
- `orden`: para mostrar las zonas en el mismo orden que el admin las dibujó
- `ON DELETE CASCADE`: si se borra el recinto, todas sus zonas desaparecen automáticamente

---

### V3 — `V3__schema_videos.sql` — Los videos

`Producto/backend/src/main/resources/db/migration/V3__schema_videos.sql`

**`VIDEOS`**: Un video subido por el admin. Columnas clave:
- `ruta_archivo`: la ruta en disco del MP4. No se guarda el binario en BD (imposible para archivos de cientos de MB)
- `ruta_frame_preview`: la ruta del PNG extraído del segundo 5, que sirve de fondo al editor de zonas
- `tamano_bytes`: para mostrar al usuario cuánto espacio ocupa
- `estado`: `VARCHAR(30)` con valores del enum `EstadoVideo`. Se usa `VARCHAR` y no un `ENUM` de MySQL para que Spring Boot controle los valores válidos, no el esquema
- `fecha_actualizacion ... ON UPDATE CURRENT_TIMESTAMP`: se actualiza automáticamente cada vez que cualquier campo de la fila cambia (útil para saber cuándo cambió el estado)

---

### V4 — `V4__schema_detecciones_metricas.sql` — El corazón del análisis

`Producto/backend/src/main/resources/db/migration/V4__schema_detecciones_metricas.sql`

Esta es la migración más importante funcionalmente. Hace tres cosas:

**1. Extiende VIDEOS** con columnas de resultado:
```sql
ADD COLUMN frames_procesados   INT NULL
ADD COLUMN detecciones_totales INT NULL
```

**2. Crea `DETECCIONES`**: una fila por cada persona detectada en cada frame. Es la tabla de hechos del sistema. Puede tener millones de filas. Las columnas `x_centro_norm` y `y_centro_norm` son las únicas coordenadas guardadas — sin imágenes, sin píxeles, sin identidad.

La FK a zonas usa `ON DELETE SET NULL` (en lugar de CASCADE). Si se borra una zona, las detecciones quedan "huérfanas" con `id_zona = NULL` en lugar de borrarse. Esto preserva el historial incluso si el admin reorganiza las zonas.

**3. Crea `METRICAS`**: una fila por combinación (video, zona), calculada al terminar el procesamiento. El `UNIQUE KEY uk_metricas_video_zona (id_video, id_zona)` garantiza que nunca haya dos registros de métricas para el mismo video+zona.

---

### V5 — `V5__add_detenida_detecciones.sql`

`Producto/backend/src/main/resources/db/migration/V5__add_detenida_detecciones.sql`

```sql
ALTER TABLE DETECCIONES ADD COLUMN detenida BOOLEAN NOT NULL DEFAULT FALSE;
```

Una sola línea. Agrega la columna `detenida` que Python calcula en post-proceso. Se hizo como migración separada porque esta funcionalidad se implementó en un sprint posterior al diseño inicial de V4.

**Por qué `DEFAULT FALSE`**: al agregar la columna a una tabla con datos existentes, MySQL necesita un valor para todas las filas previas. `FALSE` es conservador: las detecciones antiguas quedan como "no detenidas" en lugar de invalidar datos.

---

### V6 — `V6__add_conf_modelo_videos.sql`

`Producto/backend/src/main/resources/db/migration/V6__add_conf_modelo_videos.sql`

```sql
ALTER TABLE VIDEOS ADD COLUMN conf_usado DECIMAL(4,3) NULL;
ALTER TABLE VIDEOS ADD COLUMN modelo_usado VARCHAR(20) NULL;
```

Guarda los parámetros con los que se procesó el video. Necesario para reproducibilidad: si dos análisis del mismo video dan resultados distintos, se puede saber si usaron `conf=0.3` vs `conf=0.45`, o `yolov8n` vs `yolov8m`.

---

### V7 — `V7__schema_metricas_avanzadas.sql`

`Producto/backend/src/main/resources/db/migration/V7__schema_metricas_avanzadas.sql`

Dos cambios:

**1. Extiende METRICAS** con las métricas finales del producto:
- `tasa_detencion`: % de detecciones marcadas como detenidas
- `score_compuesto`: el número único que el admin ve como resultado principal

**2. Crea `METRICAS_TEMPORALES`**: una fila por cada combinación (video, zona, franja horaria). Si el video tiene 5 franjas, y hay 3 zonas, esta tabla tendrá 15 filas por video. Habilita el heatmap temporal del dashboard.

---

### V8 — `V8__tracking_columns.sql` — ByteTrack

`Producto/backend/src/main/resources/db/migration/V8__tracking_columns.sql`

Agrega soporte para el tracking individual de personas:

**Extiende DETECCIONES** con `track_id INT NOT NULL DEFAULT -1`: el ID de la persona asignado por ByteTrack. `-1` para compatibilidad hacia atrás con videos procesados antes de esta versión.

**Crea `TRACKS`**: un resumen del ciclo de vida de cada persona rastreada. Por cada `track_id` en un video:
- `zona_inicio_id`, `zona_fin_id`: en qué zona entró y en qué zona terminó
- `primer_frame`, `ultimo_frame`, `frames_total`: cuánto tiempo estuvo en el video
- `segundos_total`, `velocidad_prom`: métricas de movimiento

**Crea `FLUJO_ENTRE_ZONAS`**: cuántas personas fueron de Zona A a Zona B. Una fila por combinación (video, origen, destino). Habilita el diagrama de flujo del dashboard.

---

### V9 — `V9__metricas_tracking.sql`

`Producto/backend/src/main/resources/db/migration/V9__metricas_tracking.sql`

Crea `METRICAS_TRACKING`: una fila por (video, zona, track_id). Registra cuántos segundos pasó cada persona identificada en cada zona. Permite calcular el OTS sin doble conteo.

Nota en el comentario de la migración: "las 8 columnas de METRICAS... ya fueron aplicadas en un intento previo". Esto documenta que durante el desarrollo se hicieron cambios manuales a la BD (sin Flyway), y V9 formaliza solo lo que faltaba. Esta situación llevó a la técnica idempotente de V10.

---

### V10 — `V10__metricas_tracking_columns.sql` — Migración idempotente

`Producto/backend/src/main/resources/db/migration/V10__metricas_tracking_columns.sql`

Esta migración usa una técnica avanzada de SQL para ser **idempotente** (puede ejecutarse múltiples veces sin error):

```sql
SET @q = (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE METRICAS ADD COLUMN personas_unicas INT NULL',
    'DO 0')
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'METRICAS'
      AND COLUMN_NAME = 'personas_unicas');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;
```

En lenguaje simple: "si la columna `personas_unicas` no existe en METRICAS, créala; si ya existe, ejecuta `DO 0` (no hacer nada)". Esto se repite para las 8 columnas de tracking.

Fue necesario porque algunos integrantes tenían esas columnas (aplicadas manualmente en desarrollo) y otros no. Una migración `ADD COLUMN` normal fallaría con "Duplicate column name" en las BDs donde ya existía.

---

### V11 — `V11__confiabilidad_video.sql` — Sistema de confiabilidad

`Producto/backend/src/main/resources/db/migration/V11__confiabilidad_video.sql`

Agrega columnas a `VIDEOS` para el sistema de calificación del análisis (ALTO/MEDIO/BAJO):
- `confianza_promedio`: promedio de confianza de todas las detecciones
- `calidad_tracking`: qué tan bien funcionó ByteTrack (% de detecciones con track_id válido)
- `score_confiabilidad`: número compuesto 0-1
- `nivel_confiabilidad`: `'ALTO'`, `'MEDIO'` o `'BAJO'`
- `video_overlay_path`: ruta del MP4 con trayectorias dibujadas
- `eventos_json_path`: ruta del JSON de eventos por zona
- `video_original_disponible`: flag para saber si el admin ya borró el MP4 original

También usa la técnica idempotente con `INFORMATION_SCHEMA` por las mismas razones que V10.

---

## 3. EL MODELO ENTIDAD-RELACIÓN

### Diagrama de texto

```
ORGANIZACIONES
│  id, nombre, fecha_creacion
│
├──< USUARIOS (1:N)
│   │  id, id_organizacion, email, password_hash, nombre, apellido, rol
│   │
│   └── (los usuarios no tienen hijos directos en este esquema)
│
├──< TOKENS_AUTH (1:N)
│   id, token, tipo, id_organizacion, email_destino, fecha_expiracion, usado
│
└──< RECINTOS (1:N)
    │  id, id_organizacion, nombre, direccion, precio_base_clp
    │
    ├──< ZONAS (1:N)
    │   │  id, id_recinto, nombre, color_hex, x_norm, y_norm, ancho_norm, alto_norm
    │   │
    │   ├──< DETECCIONES (1:N) — via id_zona (SET NULL al borrar zona)
    │   ├──< METRICAS (1:N)
    │   ├──< METRICAS_TEMPORALES (1:N)
    │   └──< METRICAS_TRACKING (1:N)
    │
    └──< VIDEOS (1:N)
        │  id, id_recinto, nombre_archivo, ruta_archivo, estado, ...
        │
        ├──< DETECCIONES (1:N) — via id_video (CASCADE)
        ├──< METRICAS (1:N) — via id_video (CASCADE)
        ├──< METRICAS_TEMPORALES (1:N) — via id_video (CASCADE)
        ├──< METRICAS_TRACKING (1:N) — via id_video (CASCADE)
        ├──< TRACKS (1:N) — via id_video (CASCADE)
        └──< FLUJO_ENTRE_ZONAS (1:N) — via id_video (CASCADE)
```

---

### Qué significa cada relación 1:N

| Relación | Lectura natural |
|----------|----------------|
| ORGANIZACIONES → USUARIOS | Una organización tiene muchos usuarios; cada usuario pertenece a exactamente una organización |
| ORGANIZACIONES → RECINTOS | Una organización administra muchos recintos |
| RECINTOS → ZONAS | Un recinto tiene muchas zonas definidas |
| RECINTOS → VIDEOS | Un recinto tiene muchos videos analizados |
| VIDEOS → DETECCIONES | Un video genera miles de detecciones individuales |
| VIDEOS → METRICAS | Un video genera exactamente una fila de métricas por zona (UNIQUE constraint) |
| ZONAS → DETECCIONES | Una zona "recibió" muchas detecciones a lo largo del video |

---

### Las cascadas de borrado

**Si borro una ORGANIZACIÓN:**
```
ORGANIZACION ─ borra → USUARIOS (cascade implícito por FK)
              ─ borra → RECINTOS → ZONAS (cascade)
                                 → VIDEOS → DETECCIONES (cascade)
                                          → METRICAS (cascade)
                                          → TRACKS (cascade)
                                          → FLUJO_ENTRE_ZONAS (cascade)
```
Borrar una organización destruye todo su árbol. Implementa el derecho al olvido de la Ley 21.719.

**Si borro un RECINTO:**
```
RECINTO ─ borra → ZONAS (cascade)
        ─ borra → VIDEOS → todos sus hijos (cascade)
```
Todos los análisis del recinto desaparecen.

**Si borro un VIDEO:**
```
VIDEO ─ borra → DETECCIONES (cascade)
      ─ borra → METRICAS (cascade)
      ─ borra → METRICAS_TEMPORALES (cascade)
      ─ borra → TRACKS (cascade)
      ─ borra → FLUJO_ENTRE_ZONAS (cascade)
```
Se limpian todos los resultados del análisis. El admin puede luego subir el mismo video de nuevo y procesarlo otra vez.

**Si borro una ZONA:**
```
ZONA ─ SET NULL → DETECCIONES.id_zona (las detecciones quedan huérfanas, no se borran)
     ─ CASCADE  → METRICAS (se borran las métricas de esa zona)
     ─ CASCADE  → METRICAS_TEMPORALES
```
Nota: la FK de DETECCIONES a ZONAS usa `SET NULL` (V4), pero la de METRICAS usa `CASCADE` (V4). Esta inconsistencia es intencional: las detecciones son datos crudos históricos que vale la pena preservar, las métricas derivadas de esa zona ya no tienen sentido sin ella.

---

## 4. TABLAS CLAVE EN DETALLE

### DETECCIONES — La tabla de hechos

Una fila = "en este frame, en esta zona, había una persona, en esta posición"

```sql
-- Ejemplo de 3 filas reales
id_video | frame_num | zona_id | track_id | x_centro | y_centro | confianza | detenida
42       | 300       | 1       | 5        | 0.4702   | 0.6125   | 0.8200    | false
42       | 300       | 2       | 8        | 0.7312   | 0.2843   | 0.9100    | false
42       | 310       | 1       | 5        | 0.4501   | 0.5800   | 0.7700    | true
```

La tercera fila dice: "en el frame 310, el track_id 5 (la misma persona que en el frame 300) sigue en la zona 1, pero ahora está detenida (se movió < 8% del frame entre frame 300 y 310)".

Un video de 15 minutos a 10 fps = 9.000 frames muestreados. Si hay en promedio 3 personas por frame, son ~27.000 filas. Los índices `(id_video, id_zona)` y `(id_video, track_id)` son críticos para que los `GROUP BY` del cálculo de métricas sean rápidos.

---

### METRICAS — El resultado del análisis por zona

Una fila = "resumen de todo lo que pasó en esta zona durante este video"

| Columna | Qué mide | Ejemplo |
|---------|----------|---------|
| `total_detecciones` | Cuántas veces se detectó una persona aquí | 1.847 |
| `porcentaje_del_total` | % del total del recinto | 32.5% |
| `densidad_promedio` | Detecciones / frames procesados | 2.05 personas/frame |
| `pico_maximo` | Máximo de personas simultáneas en un frame | 7 |
| `frames_con_actividad` | Cuántos frames tuvieron al menos 1 persona | 720 |
| `confianza_promedio` | Confianza promedio de YOLO en esta zona | 0.812 |
| `area_zona` | Área normalizada de la zona (ancho × alto) | 0.12 (12% del frame) |
| `densidad_por_area` | Detecciones / (frames × área) | 17.08 |
| `indice_valor_relativo` | Detecciones zona / promedio recinto | 1.8x |
| `tasa_detencion` | % detecciones marcadas detenida | 0.38 (38%) |
| `score_compuesto` | Número único resultado del análisis | 2.1 |
| `personas_unicas` | Tracks distintos (con ByteTrack) | 94 |
| `tiempo_permanencia_prom` | Segundos promedio por persona | 19.6s |
| `entradas` | Veces que un track apareció en esta zona | 97 |
| `salidas` | Veces que un track desapareció de esta zona | 91 |
| `ots_tracking` | Frames totales de todos los tracks en esta zona | 1.847 |
| `velocidad_flujo_prom` | Velocidad de desplazamiento promedio (normalizada) | 0.034 |
| `tasa_conversion` | entradas / personas_unicas_total | 0.40 |
| `score_compuesto_v2` | Score mejorado con datos de tracking | 2.3 |

Los campos de tracking (últimas 8 filas) son `NULL` si el video se procesó con `--tracker none`.

---

### METRICAS_TEMPORALES — Las franjas horarias

Una fila = "en esta zona, durante este intervalo del video, hubo esta actividad"

```
id_video=42, id_zona=1, franja_numero=1, segundo_inicio=0,   segundo_fin=180,  total=420
id_video=42, id_zona=1, franja_numero=2, segundo_inicio=180, segundo_fin=360,  total=310
id_video=42, id_zona=1, franja_numero=3, segundo_inicio=360, segundo_fin=540,  total=580
id_video=42, id_zona=1, franja_numero=4, segundo_inicio=540, segundo_fin=720,  total=390
id_video=42, id_zona=1, franja_numero=5, segundo_inicio=720, segundo_fin=900,  total=147
```

El video se divide en 5 franjas iguales. Si el video dura 15 minutos (900 segundos), cada franja son 3 minutos. La franja 3 tuvo pico de 580 detecciones en la zona 1 → mayor actividad entre el minuto 6 y 9. Esta tabla habilita la columna de patrones temporales del dashboard.

`densidad_relativa` = `total_detecciones` de esta franja dividido por el promedio de detecciones por franja para esa zona → cuánto más o menos activa fue esta franja respecto al promedio propio de la zona.

---

### ZONAS — Las coordenadas normalizadas

```sql
id | id_recinto | nombre      | color_hex | x_norm | y_norm | ancho_norm | alto_norm | orden
1  | 5          | Entrada     | #e74c3c   | 0.0500 | 0.1000 | 0.2000     | 0.3500    | 0
2  | 5          | Zona A      | #3498db   | 0.3000 | 0.1500 | 0.3500     | 0.7000    | 1
3  | 5          | Fondo       | #2ecc71   | 0.7500 | 0.1000 | 0.2000     | 0.8000    | 2
```

`DECIMAL(6,4)` significa: hasta 6 dígitos totales, 4 después del punto decimal. Valores posibles: `0.0000` a `9.9999`. Para coordenadas entre 0 y 1, tienes 4 decimales de precisión (0.0001 = 0.01% del frame, suficiente).

---

## 5. CONEXIÓN ENTIDAD JPA ↔ TABLA SQL

### Cómo Video.java se mapea a la tabla VIDEOS

`Producto/backend/src/main/java/cl/duoc/flowsense/videos/Video.java`

```java
@Entity                    // "esta clase es una tabla en la BD"
@Table(name = "VIDEOS")    // "la tabla se llama exactamente VIDEOS (en mayúsculas)"
@Data                      // Lombok: genera getters, setters, equals, hashCode, toString
@Builder                   // Lombok: patrón builder para crear instancias
public class Video {

    @Id                              // columna PRIMARY KEY
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // AUTO_INCREMENT
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)   // relación N:1 (muchos videos, un recinto)
    @JoinColumn(name = "id_recinto")     // la FK en esta tabla se llama "id_recinto"
    private Recinto recinto;             // Java trabaja con objetos, no con IDs

    @Column(name = "nombre_archivo")     // el campo Java se llama distinto a la columna
    private String nombreArchivo;        // Java: camelCase; SQL: snake_case

    @Enumerated(EnumType.STRING)         // guarda el enum como texto ("PENDIENTE")
    private EstadoVideo estado;          // no como número entero

    @CreationTimestamp                   // Hibernate lo setea automáticamente al INSERT
    @Column(updatable = false)           // nunca se actualiza después de la primera inserción
    private LocalDateTime fechaSubida;

    @UpdateTimestamp                     // Hibernate lo setea en cada UPDATE
    private LocalDateTime fechaActualizacion;
}
```

**Analogía del mapping**: `@Entity` es el "pasaporte" de la clase que le dice a JPA "yo vivo en la base de datos". `@Column` es la "traducción" entre el nombre Java (camelCase) y el nombre SQL (snake_case). Sin `@Column(name=...)`, JPA intenta usar el nombre del campo Java directamente como nombre de columna, lo que puede no coincidir.

---

### Qué hace `FetchType.LAZY`

```java
@ManyToOne(fetch = FetchType.LAZY)
private Recinto recinto;
```

`LAZY` = "no cargues el Recinto de la BD hasta que alguien llame a `video.getRecinto()`". Sin esto (`EAGER`), cada vez que cargas un Video, JPA también haría un `JOIN` para traer todo el Recinto. Si cargas 100 videos, harías 100 queries adicionales a recintos sin necesitarlo.

`@ToString.Exclude` en los campos `@ManyToOne` previene que Lombok genere un `toString()` que llame al getter de la relación lazy, lo que podría disparar una query inesperada o una `LazyInitializationException` si la sesión ya cerró.

---

### Por qué algunos campos necesitan `@JsonProperty`

`Producto/backend/src/main/java/cl/duoc/flowsense/recintos/dto/ZonaRequest.java`
`Producto/backend/src/main/java/cl/duoc/flowsense/recintos/dto/ZonaResponse.java`

```java
@JsonProperty("xNorm")
private BigDecimal xNorm;
```

**El problema**: el campo Java se llama `xNorm`. Lombok genera el getter `getxNorm()` (la 'x' es un solo carácter, seguido de 'N' mayúscula). Jackson, al descubrir propiedades desde getters, puede interpretar este nombre de forma inconsistente entre la serialización (Java → JSON) y la deserialización (JSON → Java), resultando en que el frontend envía `"xNorm"` pero Java lo busca como `"xnorm"` (todo minúsculas).

`@JsonProperty("xNorm")` **fija el nombre exacto del campo JSON**, tanto para leer (request) como para escribir (response). Elimina la ambigüedad y garantiza que React envíe `xNorm` y Java reciba `xNorm` sin conversión incorrecta.

Este tipo de bug es difícil de detectar: el endpoint responde 200 pero las coordenadas llegan como `null` porque el JSON tiene `xNorm` y Java buscaba `xnorm`.

---

## 6. DECISIONES DE DISEÑO

### Por qué las coordenadas se guardan normalizadas (0-1) y no en píxeles

`V2__schema_recintos_zonas.sql`, `Zona.java`

Si guardas "la zona empieza en el píxel 192, 108 y mide 384×216 píxeles", ese dato es inútil la próxima vez que el admin suba un video grabado con otra cámara que tiene resolución diferente.

Con coordenadas normalizadas:
- "La zona empieza al 10% del ancho y 10% del alto, mide 20% × 20%"
- Eso es válido para un video 1920×1080, 1280×720, o cualquier resolución
- Python puede comparar `x_centro_norm` (0.47) con `zona.x_norm` (0.10) directamente, sin saber la resolución del video

La conversión solo ocurre en el frontend (en `coordenadas.js`) donde el canvas tiene píxeles reales. La BD y Python trabajan siempre en [0,1].

---

### Por qué DETECCIONES no guarda imágenes

`V4__schema_detecciones_metricas.sql`

Las restricciones éticas (Ley 19.628, Ley 21.719 de Chile) son no negociables. Las columnas de DETECCIONES son:
```
frame_numero, x_centro_norm, y_centro_norm, confianza, detenida, track_id
```

Ninguna de estas permite identificar a una persona:
- `x_centro_norm` = el 47% del ancho del frame. Cientos de personas distintas pasan por esa coordenada en un día.
- `track_id` = un entero que dura solo mientras dura el video. El mismo entero `5` puede referirse a personas completamente distintas en dos videos distintos.
- `confianza` = qué tan seguro estaba el modelo. No identifica a nadie.

Si se agregara `foto_recortada BLOB` o `color_ropa VARCHAR`, eso cambiaría el perfil ético del sistema completamente. La columna `detenida BOOLEAN` también es segura: saber que "alguien estaba quieto" no identifica a nadie.

---

### Por qué METRICAS y METRICAS_TEMPORALES son tablas separadas

`V4__schema_detecciones_metricas.sql` + `V7__schema_metricas_avanzadas.sql`

**METRICAS** tiene una fila por (video, zona): es el resumen total del período analizado. Cardinalidad baja: si hay 5 zonas y 10 videos, son exactamente 50 filas.

**METRICAS_TEMPORALES** tiene hasta 5 filas por (video, zona): una por cada franja temporal. Para 5 zonas y 10 videos = hasta 250 filas.

Si fueran una sola tabla, tendrías dos opciones igualmente malas:
1. Repetir las métricas globales en cada fila de franja → redundancia masiva y problemas de sincronización
2. Meter las 5 franjas como columnas (`detecciones_franja_1`, `detecciones_franja_2`...) → esquema rígido que no escala y es difícil de consultar con SQL

Con dos tablas separadas, cada consulta del dashboard ataca exactamente la tabla que necesita: `SELECT * FROM METRICAS WHERE id_video = ?` para la tabla resumen, `SELECT * FROM METRICAS_TEMPORALES WHERE id_video = ? ORDER BY franja_numero` para el heatmap temporal.

---

## 5 PREGUNTAS TIPO EXAMEN

**Pregunta 1**
Un integrante del equipo editó `V3__schema_videos.sql` para agregar una columna que olvidó, después de que la migración ya estaba aplicada en su PC. Al día siguiente arranca Spring Boot y falla. ¿Qué error exacto muestra Flyway, qué lo causó, y cómo debe resolverse correctamente sin romper la BD de los otros integrantes?

**Pregunta 2**
La tabla `DETECCIONES` usa `ON DELETE SET NULL` para la FK hacia `ZONAS`, pero la tabla `METRICAS` usa `ON DELETE CASCADE` para la misma FK. ¿Cuál es el razonamiento detrás de esta inconsistencia aparente? ¿Qué pasaría si DETECCIONES también usara CASCADE?

**Pregunta 3**
`DECIMAL(6,4)` se usa para las coordenadas normalizadas. ¿Cuál es el valor máximo que puede almacenar ese tipo? ¿Por qué ese rango es suficiente para coordenadas normalizadas entre 0 y 1? ¿Qué precisión da en un frame de 1920 píxeles de ancho?

**Pregunta 4**
V10 usa `INFORMATION_SCHEMA.COLUMNS` con `PREPARE/EXECUTE` para hacer la migración idempotente. ¿Por qué no bastó simplemente escribir `ALTER TABLE METRICAS ADD COLUMN IF NOT EXISTS personas_unicas INT NULL`? ¿Qué versión/configuración de MySQL haría necesaria esa técnica más verbosa?

**Pregunta 5**
En `ZonaRequest.java`, los campos `xNorm`, `yNorm`, `anchoNorm` y `altoNorm` tienen `@JsonProperty`. Sin embargo en `Zona.java` (la entidad JPA) esos mismos campos no lo tienen. ¿Por qué la entidad no necesita `@JsonProperty` aunque tiene los mismos campos? ¿Qué diferencia de propósito hay entre un DTO y una entidad JPA en este contexto?
