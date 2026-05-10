# CLAUDE.md — Capa Database / MySQL

Este archivo da contexto específico del esquema de base de datos. Complementa el `CLAUDE.md` raíz.

## Rol del módulo

Esquema MySQL 8 que almacena toda la información persistente del sistema. Las migraciones se manejan con Flyway desde Spring Boot.

## Stack del módulo

- MySQL 8.x
- Flyway (ejecutado por Spring Boot al arranque)
- MySQL Workbench para diseño del MER

## Estructura del módulo

```
Producto/database/
├── CLAUDE.md
├── README.md
├── MER.png
├── MER.mwb                          ← fuente MySQL Workbench
├── schema.sql                       ← schema completo de referencia
├── migrations/
│   ├── V1__usuarios_y_recintos.sql
│   ├── V2__videos_y_zonas.sql
│   ├── V3__detecciones.sql
│   ├── V4__metricas_zona.sql
│   ├── V5__metricas_temporales.sql
│   └── V6__indices_rendimiento.sql
└── seeds/
    ├── dev_seed.sql                 ← datos para desarrollo
    └── demo_seed.sql                ← datos para demo
```

## Tablas del MVP (7 tablas)

### USUARIOS

```sql
CREATE TABLE usuarios (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login    DATETIME NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Sin tabla de organizaciones en MVP. Cada usuario tiene sus recintos directamente.

### RECINTOS

```sql
CREATE TABLE recintos (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      BIGINT NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  tipo            ENUM('MALL','GALERIA','FERIA','OTRO') NOT NULL DEFAULT 'OTRO',
  direccion       VARCHAR(255) NULL,
  fecha_creacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recintos_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_recintos_usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### VIDEOS

```sql
CREATE TABLE videos (
  id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_recinto            BIGINT NOT NULL,
  nombre_original       VARCHAR(255) NOT NULL,
  ruta                  VARCHAR(512) NOT NULL,
  ruta_frame_preview    VARCHAR(512) NULL,
  estado                ENUM('PENDIENTE','FRAME_LISTO','ESPERANDO_ZONAS','PROCESANDO','COMPLETADO','ERROR') 
                        NOT NULL DEFAULT 'PENDIENTE',
  mensaje_error         TEXT NULL,
  conf_usado            DECIMAL(3,2) NULL,
  modelo_usado          VARCHAR(20) NULL,
  frames_procesados     INT NULL,
  duracion_proceso_seg  INT NULL,
  fecha_subida          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_completado      DATETIME NULL,
  CONSTRAINT fk_videos_recinto
    FOREIGN KEY (id_recinto) REFERENCES recintos(id) ON DELETE CASCADE,
  INDEX idx_videos_recinto_fecha (id_recinto, fecha_subida DESC),
  INDEX idx_videos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### ZONAS

```sql
CREATE TABLE zonas (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video      BIGINT NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  color_hex     VARCHAR(7) NOT NULL DEFAULT '#3498db',
  x_norm        DECIMAL(6,4) NOT NULL,
  y_norm        DECIMAL(6,4) NOT NULL,
  ancho_norm    DECIMAL(6,4) NOT NULL,
  alto_norm     DECIMAL(6,4) NOT NULL,
  CONSTRAINT fk_zonas_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  INDEX idx_zonas_video (id_video)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Coordenadas normalizadas en rango [0, 1].

### DETECCIONES

```sql
CREATE TABLE detecciones (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video        BIGINT NOT NULL,
  id_zona         BIGINT NOT NULL,
  frame_numero    INT NOT NULL,
  x_centro_norm   DECIMAL(6,4) NOT NULL,
  y_centro_norm   DECIMAL(6,4) NOT NULL,
  confianza       DECIMAL(4,3) NOT NULL,
  detenida        BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_detecciones_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_detecciones_zona
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  INDEX idx_detecciones_video_zona (id_video, id_zona),
  INDEX idx_detecciones_frame (id_video, frame_numero),
  INDEX idx_detecciones_detenida (id_video, detenida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Esta tabla puede crecer rápido (un video de 15 min puede generar 10.000+ filas). Los índices son críticos para los agregados.

### METRICAS_ZONA

```sql
CREATE TABLE metricas_zona (
  id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video                 BIGINT NOT NULL,
  id_zona                  BIGINT NOT NULL,
  total_detecciones        INT NOT NULL DEFAULT 0,
  porcentaje_del_total     DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  densidad_promedio        DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  pico_maximo              INT NOT NULL DEFAULT 0,
  frames_con_actividad     INT NOT NULL DEFAULT 0,
  confianza_promedio       DECIMAL(4,3) NOT NULL DEFAULT 0.000,
  area_zona                DECIMAL(8,6) NOT NULL DEFAULT 0.000000,
  densidad_por_area        DECIMAL(8,3) NOT NULL DEFAULT 0.000,
  tasa_detencion           DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  indice_trafico           DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  consistencia_temporal    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  score_compuesto          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  precio_sugerido          DECIMAL(12,2) NULL,
  CONSTRAINT fk_metricas_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_metricas_zona
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_metricas_video_zona (id_video, id_zona),
  INDEX idx_metricas_video (id_video)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Una fila por cada combinación (video, zona). Se insertan al finalizar el procesamiento.

### METRICAS_TEMPORALES

```sql
CREATE TABLE metricas_temporales (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video            BIGINT NOT NULL,
  id_zona             BIGINT NOT NULL,
  franja_numero       INT NOT NULL,
  segundo_inicio      INT NOT NULL,
  segundo_fin         INT NOT NULL,
  total_detecciones   INT NOT NULL DEFAULT 0,
  densidad_relativa   DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  CONSTRAINT fk_metricas_temp_video
    FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_metricas_temp_zona
    FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_metricas_temp (id_video, id_zona, franja_numero),
  INDEX idx_metricas_temp_video_zona (id_video, id_zona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Habilita el dashboard "Matriz zona × franja temporal".

## Reglas de integridad y cascadas

```
USUARIOS    (1) ──< (N) RECINTOS         (CASCADE)
RECINTOS    (1) ──< (N) VIDEOS           (CASCADE)
VIDEOS      (1) ──< (N) ZONAS            (CASCADE)
VIDEOS      (1) ──< (N) DETECCIONES      (CASCADE)
ZONAS       (1) ──< (N) DETECCIONES      (RESTRICT - no borrar zona con detecciones)
VIDEOS      (1) ──< (N) METRICAS_ZONA    (CASCADE)
ZONAS       (1) ──< (N) METRICAS_ZONA    (RESTRICT)
VIDEOS      (1) ──< (N) METRICAS_TEMP    (CASCADE)
ZONAS       (1) ──< (N) METRICAS_TEMP    (RESTRICT)
```

## Aislamiento por usuario

NO se implementa con triggers en BD. Se implementa en la capa de servicio del backend (filtrar siempre por `id_usuario`). La BD solo garantiza integridad referencial.

## Índices críticos para rendimiento

| Índice | Propósito |
|--------|-----------|
| `usuarios.email` (UNIQUE) | Login rápido |
| `recintos.id_usuario` | Listar recintos del usuario |
| `videos.id_recinto + fecha_subida DESC` | Historial cronológico |
| `videos.estado` | Query de pendientes al startup |
| `detecciones.id_video + id_zona` | Cálculo de agregados |
| `detecciones.id_video + detenida` | Cálculo de tasa de detención |
| `metricas_zona.id_video` | Dashboard del análisis |
| `metricas_temporales.id_video + id_zona` | Matriz temporal |

## Cálculo de métricas (SQL de referencia)

### Inserción de detecciones desde CSV

Spring Boot lee el CSV y hace un INSERT batch en `detecciones`. Idealmente con `INSERT INTO ... VALUES (?, ?, ...), (?, ?, ...)` agrupando 100-500 filas por query.

### Cálculo de métricas básicas por zona

```sql
INSERT INTO metricas_zona (id_video, id_zona, total_detecciones, porcentaje_del_total,
                           densidad_promedio, pico_maximo, frames_con_actividad,
                           confianza_promedio, tasa_detencion)
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
  ROUND(AVG(d.confianza), 3) AS confianza_promedio,
  ROUND(SUM(CASE WHEN d.detenida THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS tasa_detencion
FROM detecciones d
JOIN videos v ON v.id = d.id_video
CROSS JOIN (
  SELECT COUNT(*) AS total_video FROM detecciones WHERE id_video = ?
) t
WHERE d.id_video = ?
GROUP BY d.id_video, d.id_zona;
```

### Cálculo del índice de tráfico

```sql
UPDATE metricas_zona mz
SET indice_trafico = mz.total_detecciones / (
    (SELECT total_detecciones FROM (
        SELECT AVG(total_detecciones) AS total_detecciones 
        FROM metricas_zona 
        WHERE id_video = mz.id_video
    ) AS promedio)
)
WHERE mz.id_video = ?;
```

### Cálculo del score compuesto

```sql
UPDATE metricas_zona mz
SET score_compuesto = (
    0.40 * mz.indice_trafico +
    0.30 * (mz.tasa_detencion / 100.0) +
    0.20 * mz.densidad_normalizada +  -- requiere cálculo previo
    0.10 * mz.consistencia_temporal
)
WHERE mz.id_video = ?;
```

### Cálculo de métricas temporales

```sql
INSERT INTO metricas_temporales (id_video, id_zona, franja_numero,
                                 segundo_inicio, segundo_fin,
                                 total_detecciones, densidad_relativa)
SELECT
    d.id_video,
    d.id_zona,
    FLOOR(d.frame_numero / (max_frame.frame / 5)) + 1 AS franja,
    FLOOR(d.frame_numero / (max_frame.frame / 5)) * (max_frame.frame / 5) AS seg_inicio,
    (FLOOR(d.frame_numero / (max_frame.frame / 5)) + 1) * (max_frame.frame / 5) AS seg_fin,
    COUNT(*) AS total,
    COUNT(*) / (max_frame.frame / 5.0) AS densidad
FROM detecciones d
CROSS JOIN (
    SELECT MAX(frame_numero) + 1 AS frame FROM detecciones WHERE id_video = ?
) AS max_frame
WHERE d.id_video = ?
GROUP BY d.id_video, d.id_zona, franja, seg_inicio, seg_fin;
```

## Migraciones con Flyway

- Archivos en `migrations/` con formato `V<numero>__<descripcion>.sql`
- NUNCA modificar una migración aplicada. Si hay que cambiar algo, nueva migración.
- En dev: `spring.flyway.clean-on-validation-error=false`
- En prod: solo migraciones `V*` (versionadas), nunca `R*`

## Seeds de desarrollo

`dev_seed.sql` crea:
- 2 usuarios de prueba con contraseñas conocidas
- 2 recintos por usuario
- 1 video por recinto en estado COMPLETADO con detecciones sintéticas
- Métricas precalculadas para mostrar dashboard funcional

NUNCA ejecutar seeds en producción.

## Datos sensibles y ética

- `password_hash`: solo BCrypt, nunca texto plano
- `detecciones`: por diseño, una fila NO permite identificar a nadie. Si alguien propone agregar campos como "color_dominante", "altura_estimada", "edad" → RECHAZAR
- Emails: datos personales en Chile (Ley 19.628). No compartibles entre usuarios
- Retención: si un usuario se elimina, cascada total (derecho al olvido Ley 21.719)

## Lo que Claude Code NO debe hacer

- No modificar migraciones aplicadas. Crear nuevas.
- No agregar columnas a DETECCIONES que permitan identificar personas
- No crear índices innecesarios (tienen costo en escritura)
- No usar VARCHAR sin límite o TEXT cuando VARCHAR(n) basta
- No relajar constraints de FK
- No almacenar secretos en BD (van en variables de entorno)
- No cambiar el esquema sin actualizar primero ALCANCE_COMPLETO.md
