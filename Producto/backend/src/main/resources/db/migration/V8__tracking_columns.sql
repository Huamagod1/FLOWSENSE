-- V8: Soporte de tracking con ByteTrack
-- Agrega track_id a DETECCIONES y crea tablas TRACKS y FLUJO_ENTRE_ZONAS.
-- track_id = -1 para detecciones de videos procesados antes de esta versión.

ALTER TABLE DETECCIONES
    ADD COLUMN track_id INT NOT NULL DEFAULT -1 AFTER id_zona;

CREATE INDEX idx_detecciones_track       ON DETECCIONES (track_id);
CREATE INDEX idx_detecciones_video_track ON DETECCIONES (id_video, track_id);

-- Una fila por video + track_id con su ciclo de vida resumido
CREATE TABLE TRACKS (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    id_video       BIGINT        NOT NULL,
    track_id       INT           NOT NULL,
    zona_inicio_id BIGINT        NULL,
    zona_fin_id    BIGINT        NULL,
    primer_frame   INT           NOT NULL,
    ultimo_frame   INT           NOT NULL,
    frames_total   INT           NOT NULL,
    segundos_total DOUBLE        NOT NULL,
    velocidad_prom DOUBLE        NULL,
    fecha_calculo  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_tracks_id_video (id_video),
    INDEX idx_tracks_track_id (track_id),
    CONSTRAINT fk_tracks_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conteo de transiciones zona_origen → zona_destino por video
CREATE TABLE FLUJO_ENTRE_ZONAS (
    id              BIGINT    NOT NULL AUTO_INCREMENT,
    id_video        BIGINT    NOT NULL,
    zona_origen_id  BIGINT    NOT NULL,
    zona_destino_id BIGINT    NOT NULL,
    conteo_tracks   INT       NOT NULL,
    fecha_calculo   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_flujo_id_video (id_video),
    CONSTRAINT fk_flujo_video
        FOREIGN KEY (id_video) REFERENCES VIDEOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
