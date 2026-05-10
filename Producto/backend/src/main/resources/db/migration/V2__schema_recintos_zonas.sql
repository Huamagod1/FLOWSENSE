-- =============================================================================
-- V2__schema_recintos_zonas.sql
-- Tablas de recintos comerciales y sus zonas de análisis.
-- =============================================================================

CREATE TABLE RECINTOS (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    id_organizacion  BIGINT       NOT NULL,
    nombre           VARCHAR(255) NOT NULL,
    direccion        VARCHAR(500) NULL,
    descripcion      TEXT         NULL,
    precio_base_clp  INT          NULL,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_recintos_id_organizacion (id_organizacion),
    CONSTRAINT fk_recintos_organizacion
        FOREIGN KEY (id_organizacion) REFERENCES ORGANIZACIONES (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------

CREATE TABLE ZONAS (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    id_recinto     BIGINT       NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    color_hex      VARCHAR(7)   NOT NULL DEFAULT '#3498db',
    x_norm         DECIMAL(6,4) NOT NULL,
    y_norm         DECIMAL(6,4) NOT NULL,
    ancho_norm     DECIMAL(6,4) NOT NULL,
    alto_norm      DECIMAL(6,4) NOT NULL,
    orden          INT          NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_zonas_id_recinto (id_recinto),
    CONSTRAINT fk_zonas_recinto
        FOREIGN KEY (id_recinto) REFERENCES RECINTOS (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
