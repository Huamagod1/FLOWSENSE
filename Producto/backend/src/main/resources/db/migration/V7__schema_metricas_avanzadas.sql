-- =============================================================================
-- V7__schema_metricas_avanzadas.sql
-- Agrega tasa_detencion y score_compuesto a METRICAS.
-- Crea METRICAS_TEMPORALES (5 franjas por zona por video).
-- =============================================================================

ALTER TABLE METRICAS
    ADD COLUMN tasa_detencion  DECIMAL(5,4) NULL AFTER indice_valor_relativo,
    ADD COLUMN score_compuesto DECIMAL(6,3) NULL AFTER tasa_detencion;

-- -----------------------------------------------------------------------------

CREATE TABLE METRICAS_TEMPORALES (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    id_video           BIGINT        NOT NULL,
    id_zona            BIGINT        NOT NULL,
    franja_numero      INT           NOT NULL,
    segundo_inicio     INT           NOT NULL,
    segundo_fin        INT           NOT NULL,
    total_detecciones  INT           NOT NULL DEFAULT 0,
    densidad_relativa  DECIMAL(6,3)  NULL,
    PRIMARY KEY (id),
    INDEX idx_mt_video (id_video),
    INDEX idx_mt_zona  (id_zona),
    CONSTRAINT fk_mt_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE,
    CONSTRAINT fk_mt_zona
        FOREIGN KEY (id_zona)  REFERENCES ZONAS  (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
