-- =============================================================================
-- V3__schema_videos.sql
-- Tabla de videos MP4 subidos para análisis de flujo peatonal.
-- =============================================================================

CREATE TABLE VIDEOS (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    id_recinto          BIGINT        NOT NULL,
    nombre_archivo      VARCHAR(500)  NOT NULL,
    ruta_archivo        VARCHAR(1000) NOT NULL,
    ruta_frame_preview  VARCHAR(1000) NULL,
    tamano_bytes        BIGINT        NOT NULL,
    duracion_segundos   INT           NULL,
    ancho_frame         INT           NULL,
    alto_frame          INT           NULL,
    estado              VARCHAR(30)   NOT NULL DEFAULT 'PENDIENTE',
    mensaje_error       TEXT          NULL,
    fecha_subida        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                               ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_videos_id_recinto (id_recinto),
    INDEX idx_videos_estado (estado),
    CONSTRAINT fk_videos_recinto
        FOREIGN KEY (id_recinto) REFERENCES RECINTOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
