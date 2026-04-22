# CLAUDE.md — Capa Database / MySQL

Este archivo da contexto específico del esquema de base de datos de FlowSense. Complementa el `CLAUDE.md` raíz. El MER completo está en `ALCANCE_COMPLETO.md` sección 5.

## Rol de este módulo

Esquema MySQL 8 que almacena toda la información persistente del sistema: organizaciones, usuarios, tokens de autenticación, recintos, zonas, videos analizados, detecciones anónimas y métricas agregadas. Las migraciones se manejan con Flyway desde el backend Spring Boot.

## Stack del módulo

- MySQL 8.x
- Flyway como herramienta de migraciones (ejecutado por Spring Boot al arranque)
- MySQL Workbench para diseño del MER
- Dockerizado vía `docker-compose.yml`

## Estructura del módulo

```
Producto/database/
├── CLAUDE.md
├── README.md
├── MER.png                          ← diagrama entidad-relación (EV-03)
├── MER.mwb                          ← fuente MySQL Workbench
├── migrations/
│   ├── V1__tablas_base.sql
│   ├── V2__auth_tables.sql
│   ├── V3__indices_rendimiento.sql
│   └── ...
├── seeds/
│   ├── dev_seed.sql                 ← datos de prueba para desarrollo
│   └── demo_seed.sql                ← datos para la demo del docente
└── docs/
    └── decisiones_esquema.md        ← justificaciones de tipos, índices, FKs
```

Las migraciones en `migrations/` son la fuente de verdad. Flyway las ejecuta en orden numérico.

## Tablas del esquema (8 tablas)

### ORGANIZACIONES

```sql
CREATE TABLE organizaciones (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_org_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### USUARIOS

```sql
CREATE TABLE usuarios (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_organizacion  BIGINT NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  nombre           VARCHAR(100) NOT NULL,
  apellido         VARCHAR(100) NOT NULL,
  telefono         VARCHAR(20) NULL,
  empresa          VARCHAR(150) NULL,
  rol              ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login     DATETIME NULL,
  CONSTRAINT fk_usuarios_organizacion
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id)
    ON DELETE RESTRICT,
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_org (id_organizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### TOKENS_AUTH

```sql
CREATE TABLE tokens_auth (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario       BIGINT NULL,
  email_destino    VARCHAR(150) NULL,
  id_organizacion  BIGINT NULL,
  token            VARCHAR(255) NOT NULL UNIQUE,
  tipo             ENUM('PASSWORD_RESET','INVITACION_ORG') NOT NULL,
  expira_en        DATETIME NOT NULL,
  usado            BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_tokens_organizacion
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE,
  INDEX idx_tokens_token (token),
  INDEX idx_tokens_expira (expira_en, usado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### RECINTOS

```sql
CREATE TABLE recintos (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_organizacion       BIGINT NOT NULL,
  nombre                VARCHAR(150) NOT NULL,
  tipo                  ENUM('MALL','GALERIA','FERIA','OTRO') NOT NULL DEFAULT 'OTRO',
  direccion             VARCHAR(255) NULL,
  imagen_plano_base64   LONGTEXT NULL,
  fecha_creacion        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recintos_organizacion
    FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE,
  INDEX idx_recintos_org (id_organizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### ZONAS

```sql
CREATE TABLE zonas (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_recinto   BIGINT NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  x            DECIMAL(6,4) NOT NULL,
  y            DECIMAL(6,4) NOT NULL,
  ancho        DECIMAL(6,4) NOT NULL,
  alto         DECIMAL(6,4) NOT NULL,
  CONSTRAINT fk_zonas_recinto
    FOREIGN KEY (id_recinto) REFERENCES recintos(id) ON DELETE CASCADE,
  INDEX idx_zonas_recinto (id_recinto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Coordenadas `x, y, ancho, alto` en rango [0, 1] normalizadas respecto al plano.

### VIDEOS

```sql
CREATE TABLE videos (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_recinto       BIGINT NOT NULL,
  nombre_original  VARCHAR(255) NOT NULL,
  ruta             VARCHAR(512) NOT NULL,
  estado           ENUM('PENDIENTE','PROCESANDO','COMPLETADO','ERROR') NOT NULL DEFAULT 'PENDIENTE',
  mensaje_error    TEXT NULL,
  conf_usado       DECIMAL(3,2) NULL,
  frames_procesados INT NULL,
  duracion_proceso_seg INT NULL,
  fecha_subida     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_completado DATETIME NULL,
  CONSTRAINT fk_videos_recinto
    FOREIGN KEY (id_recinto) REFERENCES recintos(id) ON DELETE CASCADE,
  INDEX idx_videos_recinto_fecha (id_recinto, fecha_subida DESC),
  INDEX idx_videos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### DETECCIONES

```sql
CREATE TABLE detecciones (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video         BIGINT NOT NULL,
  id_zona          BIGINT NOT NULL,
  frame_numero     INT NOT NULL,
  x_centro_norm    DECIMAL(6,4) NOT NULL,
  y_centro_norm    DECIMAL(6,4) NOT NULL,
  confianza        DECIMAL(4,3) NOT NULL,
  CONSTRAINT fk_detecciones_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_detecciones_zona
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  INDEX idx_detecciones_video_zona (id_video, id_zona),
  INDEX idx_detecciones_frame (id_video, frame_numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Esta tabla puede crecer rápido (un video de 15 min con buen tráfico puede tener 10.000+ filas). El índice `(id_video, id_zona)` es crítico para los agregados.

### METRICAS

```sql
CREATE TABLE metricas (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video               BIGINT NOT NULL,
  id_zona                BIGINT NOT NULL,
  total_detecciones      INT NOT NULL DEFAULT 0,
  porcentaje_del_total   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  densidad_promedio      DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  pico_maximo            INT NOT NULL DEFAULT 0,
  frames_con_actividad   INT NOT NULL DEFAULT 0,
  confianza_promedio     DECIMAL(4,3) NOT NULL DEFAULT 0.000,
  CONSTRAINT fk_metricas_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_metricas_zona
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_metricas_video_zona (id_video, id_zona),
  INDEX idx_metricas_video (id_video)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Una fila por cada combinación (video, zona). Se insertan todas al finalizar el procesamiento del video.

## Reglas de integridad

### Cascadas de borrado

- Eliminar `ORGANIZACION` → borra sus `USUARIOS`, `RECINTOS` y todo lo descendiente.
- Eliminar `USUARIO` → borra sus `TOKENS_AUTH` asociados. No borra recintos (pertenecen a la org).
- Eliminar `RECINTO` → borra sus `ZONAS`, `VIDEOS`, `DETECCIONES` y `METRICAS`.
- Eliminar `VIDEO` → borra sus `DETECCIONES` y `METRICAS`.
- `ZONAS` con `RESTRICT`: no se puede borrar una zona que tenga detecciones asociadas, primero borrar el análisis.

### Aislamiento por organización

La separación entre organizaciones NO se implementa con triggers en BD. Se implementa en la capa de servicio del backend (Spring Boot filtra por `id_organizacion` en cada query). La BD solo garantiza integridad referencial.

## Índices críticos para rendimiento

| Índice | Propósito |
|---|---|
| `usuarios.email` (UNIQUE) | Login rápido |
| `tokens_auth.token` | Validación de tokens de reset/invitación |
| `recintos.id_organizacion` | Listar recintos de una org |
| `videos.id_recinto + fecha_subida DESC` | Historial cronológico |
| `videos.estado` | Query de videos pendientes/en proceso al startup |
| `detecciones.id_video + id_zona` | Cálculo de agregados por zona |
| `metricas.id_video` | Dashboard del análisis |

## Cálculo de métricas (SQL de referencia)

Después de insertar las detecciones, Spring Boot ejecuta este agregado para poblar `METRICAS`:

```sql
INSERT INTO metricas (id_video, id_zona, total_detecciones, porcentaje_del_total,
                      densidad_promedio, pico_maximo, frames_con_actividad,
                      confianza_promedio)
SELECT
  d.id_video,
  d.id_zona,
  COUNT(*) AS total_detecciones,
  ROUND(100.0 * COUNT(*) / t.total_video, 2) AS porcentaje,
  ROUND(1.0 * COUNT(*) / v.frames_procesados, 3) AS densidad,
  (SELECT MAX(cnt) FROM (
    SELECT COUNT(*) AS cnt FROM detecciones d2
    WHERE d2.id_video = d.id_video AND d2.id_zona = d.id_zona
    GROUP BY d2.frame_numero
  ) AS picos) AS pico_maximo,
  COUNT(DISTINCT d.frame_numero) AS frames_con_actividad,
  ROUND(AVG(d.confianza), 3) AS confianza_promedio
FROM detecciones d
JOIN videos v ON v.id = d.id_video
CROSS JOIN (
  SELECT COUNT(*) AS total_video FROM detecciones WHERE id_video = ?
) t
WHERE d.id_video = ?
GROUP BY d.id_video, d.id_zona;
```

## Migraciones con Flyway

- Archivos en `migrations/` con formato `V<numero>__<descripcion>.sql`.
- **Nunca modificar una migración ya aplicada**. Si hay que cambiar algo, crear una nueva migración.
- En dev, `spring.flyway.clean-on-validation-error=false` para no perder datos accidentalmente.
- En prod, solo migraciones `V*` (versionadas), nunca `R*` (repeatable).

## Seeds de desarrollo

`dev_seed.sql` crea:
- 2 organizaciones de prueba
- 3 usuarios por organización con contraseñas conocidas
- 2 recintos por organización con planos dummy (base64 de un PNG pequeño)
- 3 zonas por recinto
- 1 video procesado con detecciones sintéticas

Útil para que un desarrollador recién clona el repo pueda loguearse inmediatamente. **Nunca ejecutar seeds en producción**.

## Backup y mantenimiento

- En Railway: los backups son automáticos del servicio MySQL gestionado.
- Para desarrollo local: `docker compose exec mysql mysqldump flowsense > backup.sql`.
- Tabla `detecciones` puede crecer rápidamente. Si en producción pasa de 10 millones de filas, considerar archivado de videos antiguos (>6 meses) a una tabla `detecciones_archivo`.

## Datos sensibles y ética

- **Contraseñas**: solo como `BCrypt hash` en `usuarios.password_hash`. Nunca columnas en texto plano.
- **Detecciones**: por diseño, una fila de `DETECCIONES` **no permite identificar a nadie**. Solo: `frame=342, zona=2, x=0.47, y=0.61, confianza=0.82`. Si alguien propone agregar un campo que pueda identificar (ej. "color_dominante", "altura_estimada", "edad_aproximada"), **rechazarlo** y escalar al equipo.
- **Emails**: son datos personales en Chile. No se comparten entre organizaciones. Solo accesibles por admins de la misma org.
- **Retención**: videos y análisis son propiedad de la org. Si una org se elimina, se borran en cascada (derecho al olvido Ley 21.719).

## Lo que Claude Code NO debe hacer en este módulo

- **No** modificar migraciones ya aplicadas. Siempre crear una nueva.
- **No** agregar columnas a `DETECCIONES` que permitan identificar personas (caras, ropa, altura, edad, género).
- **No** crear índices sobre columnas que no se filtran ni ordenan; agregar índices tiene costo en escritura.
- **No** usar `VARCHAR` sin límite razonable o `TEXT` cuando `VARCHAR(n)` basta.
- **No** relajar las constraints de FK "por conveniencia". Si hay que borrar datos, usar cascada explícita.
- **No** almacenar secretos (JWT secret, passwords de email) en la BD. Eso va en variables de entorno.
- **No** cambiar el esquema sin actualizar primero `ALCANCE_COMPLETO.md` sección 5.
