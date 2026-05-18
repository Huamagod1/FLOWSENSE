-- V9: Métricas de tracking por zona
-- Las 8 columnas de METRICAS (personas_unicas, tiempo_permanencia_prom,
-- entradas, salidas, ots_tracking, velocidad_flujo_prom, tasa_conversion,
-- score_compuesto_v2) ya fueron aplicadas en un intento previo y existen
-- en la base de datos. Esta versión solo crea METRICAS_TRACKING.

CREATE TABLE IF NOT EXISTS METRICAS_TRACKING (
    id            BIGINT    NOT NULL AUTO_INCREMENT,
    id_video      BIGINT    NOT NULL,
    id_zona       BIGINT    NOT NULL,
    track_id      INT       NOT NULL,
    segundos      DOUBLE    NOT NULL,
    fecha_calculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_metricas_tracking_id_video (id_video),
    INDEX idx_metricas_tracking_id_zona  (id_zona),
    CONSTRAINT fk_metricas_tracking_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
