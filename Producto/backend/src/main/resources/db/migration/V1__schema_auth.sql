-- =============================================================================
-- V1__schema_auth.sql
-- Tablas de autenticación: organizaciones, usuarios y tokens de un solo uso.
-- =============================================================================

CREATE TABLE ORGANIZACIONES (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------

CREATE TABLE USUARIOS (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    id_organizacion  BIGINT       NOT NULL,
    email            VARCHAR(255) NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    nombre           VARCHAR(100) NOT NULL,
    apellido         VARCHAR(100) NOT NULL,
    rol              VARCHAR(20)  NOT NULL DEFAULT 'ADMIN',
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- UNIQUE crea implícitamente el índice en email
    UNIQUE KEY uk_usuarios_email (email),
    INDEX idx_usuarios_id_organizacion (id_organizacion),
    CONSTRAINT fk_usuarios_organizacion
        FOREIGN KEY (id_organizacion) REFERENCES ORGANIZACIONES (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------

CREATE TABLE TOKENS_AUTH (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    token            VARCHAR(255) NOT NULL,
    tipo             ENUM('INVITACION_ORG', 'PASSWORD_RESET') NOT NULL,
    id_organizacion  BIGINT       NULL,
    email_destino    VARCHAR(255) NOT NULL,
    fecha_expiracion TIMESTAMP    NOT NULL,
    usado            BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- UNIQUE crea implícitamente el índice en token
    UNIQUE KEY uk_tokens_token (token),
    INDEX idx_tokens_fecha_expiracion (fecha_expiracion),
    CONSTRAINT fk_tokens_organizacion
        FOREIGN KEY (id_organizacion) REFERENCES ORGANIZACIONES (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
