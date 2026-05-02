-- =============================================================================
-- V4__schema_detecciones_metricas.sql
-- Amplía VIDEOS con contadores de procesamiento.
-- Crea DETECCIONES (coordenadas anónimas) y METRICAS (9 métricas por zona).
-- =============================================================================

-- Extiende la tabla de videos con resultados del procesamiento
ALTER TABLE VIDEOS
    ADD COLUMN frames_procesados   INT NULL AFTER alto_frame,
    ADD COLUMN detecciones_totales INT NULL AFTER frames_procesados;

-- -----------------------------------------------------------------------------

CREATE TABLE DETECCIONES (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    id_video      BIGINT       NOT NULL,
    id_zona       BIGINT       NULL,
    frame_numero  INT          NOT NULL,
    x_centro_norm DECIMAL(6,4) NOT NULL,
    y_centro_norm DECIMAL(6,4) NOT NULL,
    confianza     DECIMAL(4,3) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_detecciones_id_video    (id_video),
    INDEX idx_detecciones_id_zona     (id_zona),
    INDEX idx_detecciones_frame_numero(frame_numero),
    CONSTRAINT fk_detecciones_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE,
    CONSTRAINT fk_detecciones_zona
        FOREIGN KEY (id_zona) REFERENCES ZONAS (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------

CREATE TABLE METRICAS (
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    id_video              BIGINT        NOT NULL,
    id_zona               BIGINT        NOT NULL,
    total_detecciones     INT           NOT NULL,
    porcentaje_del_total  DECIMAL(5,2)  NOT NULL,
    densidad_promedio     DECIMAL(8,4)  NOT NULL,
    pico_maximo           INT           NOT NULL,
    frames_con_actividad  INT           NOT NULL,
    confianza_promedio    DECIMAL(4,3)  NOT NULL,
    area_zona             DECIMAL(8,6)  NOT NULL,
    densidad_por_area     DECIMAL(10,4) NOT NULL,
    indice_valor_relativo DECIMAL(6,3)  NOT NULL,
    fecha_calculo         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_metricas_video_zona (id_video, id_zona),
    INDEX idx_metricas_id_video (id_video),
    CONSTRAINT fk_metricas_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE,
    CONSTRAINT fk_metricas_zona
        FOREIGN KEY (id_zona) REFERENCES ZONAS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
