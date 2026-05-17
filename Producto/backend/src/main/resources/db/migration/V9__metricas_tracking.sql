-- V9: Métricas de tracking por zona
-- Extiende METRICAS con 8 columnas nuevas y crea METRICAS_TRACKING
-- para el histograma de distribución de permanencia por track.
-- Todas las columnas nuevas en METRICAS son NULL para compatibilidad con
-- videos ya procesados sin tracking (track_id = -1).

ALTER TABLE METRICAS
    ADD COLUMN personas_unicas         INT    NULL,
    ADD COLUMN tiempo_permanencia_prom DOUBLE NULL,
    ADD COLUMN entradas                INT    NULL,
    ADD COLUMN salidas                 INT    NULL,
    ADD COLUMN ots_tracking            DOUBLE NULL,
    ADD COLUMN velocidad_flujo_prom    DOUBLE NULL,
    ADD COLUMN tasa_conversion         DOUBLE NULL,
    ADD COLUMN score_compuesto_v2      DOUBLE NULL;

-- Detalle de segundos por track en cada zona (para histograma en el frontend)
CREATE TABLE METRICAS_TRACKING (
    id            BIGINT    NOT NULL AUTO_INCREMENT,
    id_video      BIGINT    NOT NULL,
    id_zona       BIGINT    NOT NULL,
    track_id      INT       NOT NULL,
    segundos      DOUBLE    NOT NULL,
    fecha_calculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_metricas_tracking_id_video (id_video),
    INDEX idx_metricas_tracking_id_zona  (id_zona),
    CONSTRAINT fk_mt_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
