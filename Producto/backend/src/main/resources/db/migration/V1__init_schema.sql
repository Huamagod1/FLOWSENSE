-- Organizaciones
CREATE TABLE organizaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  INDEX idx_org_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuarios
CREATE TABLE usuarios (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_organizacion BIGINT NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NULL,
  empresa VARCHAR(150) NULL,
  rol ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login DATETIME NULL,
  CONSTRAINT fk_usuarios_organizacion FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE RESTRICT,
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_org (id_organizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tokens Auth
CREATE TABLE tokens_auth (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario BIGINT NULL,
  email_destino VARCHAR(150) NULL,
  id_organizacion BIGINT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  tipo ENUM('PASSWORD_RESET','INVITACION_ORG') NOT NULL,
  expira_en DATETIME NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tokens_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_tokens_organizacion FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE,
  INDEX idx_tokens_token (token),
  INDEX idx_tokens_expira (expira_en, usado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recintos
CREATE TABLE recintos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_organizacion BIGINT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo ENUM('MALL','GALERIA','FERIA','OTRO') NOT NULL DEFAULT 'OTRO',
  direccion VARCHAR(255) NULL,
  imagen_plano_base64 LONGTEXT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recintos_organizacion FOREIGN KEY (id_organizacion) REFERENCES organizaciones(id) ON DELETE CASCADE,
  INDEX idx_recintos_org (id_organizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Zonas
CREATE TABLE zonas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_recinto BIGINT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  x DECIMAL(6,4) NOT NULL,
  y DECIMAL(6,4) NOT NULL,
  ancho DECIMAL(6,4) NOT NULL,
  alto DECIMAL(6,4) NOT NULL,
  color_hex VARCHAR(7) NULL,
  CONSTRAINT fk_zonas_recinto FOREIGN KEY (id_recinto) REFERENCES recintos(id) ON DELETE CASCADE,
  INDEX idx_zonas_recinto (id_recinto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Videos
CREATE TABLE videos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_recinto BIGINT NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  ruta VARCHAR(512) NOT NULL,
  ruta_frame_preview VARCHAR(512) NULL,
  estado ENUM('PENDIENTE','FRAME_LISTO','ESPERANDO_ZONAS','PROCESANDO','COMPLETADO','ERROR') NOT NULL DEFAULT 'PENDIENTE',
  mensaje_error TEXT NULL,
  conf_usado DECIMAL(3,2) NULL,
  frames_procesados INT NULL,
  duracion_proceso_seg INT NULL,
  fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_completado DATETIME NULL,
  CONSTRAINT fk_videos_recinto FOREIGN KEY (id_recinto) REFERENCES recintos(id) ON DELETE CASCADE,
  INDEX idx_videos_recinto_fecha (id_recinto, fecha_subida DESC),
  INDEX idx_videos_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Detecciones
CREATE TABLE detecciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video BIGINT NOT NULL,
  id_zona BIGINT NOT NULL,
  frame_numero INT NOT NULL,
  x_centro_norm DECIMAL(6,4) NOT NULL,
  y_centro_norm DECIMAL(6,4) NOT NULL,
  confianza DECIMAL(4,3) NOT NULL,
  CONSTRAINT fk_detecciones_video FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_detecciones_zona FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  INDEX idx_detecciones_video_zona (id_video, id_zona),
  INDEX idx_detecciones_frame (id_video, frame_numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Métricas
CREATE TABLE metricas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_video BIGINT NOT NULL,
  id_zona BIGINT NOT NULL,
  total_detecciones INT NOT NULL DEFAULT 0,
  porcentaje_del_total DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  densidad_promedio DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  pico_maximo INT NOT NULL DEFAULT 0,
  frames_con_actividad INT NOT NULL DEFAULT 0,
  confianza_promedio DECIMAL(4,3) NOT NULL DEFAULT 0.000,
  area_zona DECIMAL(8,6) NULL,
  densidad_por_area DECIMAL(8,3) NULL,
  indice_valor_relativo DECIMAL(5,2) NULL,
  calculado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_metricas_video FOREIGN KEY (id_video) REFERENCES videos(id) ON DELETE CASCADE,
  CONSTRAINT fk_metricas_zona FOREIGN KEY (id_zona) REFERENCES zonas(id) ON DELETE RESTRICT,
  UNIQUE KEY uk_metricas_video_zona (id_video, id_zona),
  INDEX idx_metricas_video (id_video)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
