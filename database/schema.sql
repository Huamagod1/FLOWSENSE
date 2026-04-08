-- ============================================
-- FlowSense - Schema Completo v2
-- MySQL 8.0
-- ============================================

CREATE DATABASE IF NOT EXISTS flowsense_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flowsense_db;

-- --------------------------------------------
-- USUARIOS
-- Base del sistema de autenticación
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100)  NOT NULL,
  apellido        VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  rol             ENUM('admin','superadmin') DEFAULT 'admin',
  activo          BOOLEAN       DEFAULT TRUE,
  ultimo_acceso   DATETIME,
  created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------
-- TOKENS DE RECUPERACION DE CONTRASEÑA
-- Para el flujo "olvidé mi contraseña"
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  token       VARCHAR(255)  NOT NULL UNIQUE,
  expira_at   DATETIME      NOT NULL,
  usado       BOOLEAN       DEFAULT FALSE,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- CONFIGURACION DE USUARIO
-- Preferencias y parámetros del detector
-- Cubre HU-09: umbral de confianza
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_usuario (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id            INT     NOT NULL UNIQUE,
  umbral_confianza      FLOAT   DEFAULT 0.5,
  fps_procesamiento     INT     DEFAULT 1,
  notificaciones_email  BOOLEAN DEFAULT TRUE,
  tema_interfaz         ENUM('claro','oscuro') DEFAULT 'claro',
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- RECINTOS
-- Espacios comerciales del administrador
-- Cubre HU-08: múltiples recintos
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS recintos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  nombre      VARCHAR(150)  NOT NULL,
  tipo        ENUM('mall','galeria','feria','otro') NOT NULL,
  direccion   VARCHAR(255),
  imagen_plano VARCHAR(500),
  activo      BOOLEAN       DEFAULT TRUE,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- ZONAS
-- Sectores dibujados sobre el plano
-- Cubre HU-02: definir zonas
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS zonas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  recinto_id  INT           NOT NULL,
  nombre      VARCHAR(100)  NOT NULL,
  coord_x     INT           NOT NULL,
  coord_y     INT           NOT NULL,
  ancho       INT           NOT NULL,
  alto        INT           NOT NULL,
  color       VARCHAR(7)    DEFAULT '#3B8BD4',
  descripcion VARCHAR(255),
  activo      BOOLEAN       DEFAULT TRUE,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recinto_id) REFERENCES recintos(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- VIDEOS
-- Archivos subidos para análisis
-- Cubre HU-01: subir video MP4
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  recinto_id        INT           NOT NULL,
  nombre_archivo    VARCHAR(255)  NOT NULL,
  ruta_archivo      VARCHAR(500)  NOT NULL,
  estado            ENUM('PENDIENTE','PROCESANDO','COMPLETADO','ERROR') DEFAULT 'PENDIENTE',
  duracion_seg      INT,
  frames_procesados INT           DEFAULT 0,
  total_frames      INT,
  mensaje_error     TEXT,
  fecha_grabacion   DATETIME,
  created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (recinto_id) REFERENCES recintos(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- DETECCIONES
-- Personas detectadas por YOLOv8 por frame
-- Generadas por detector.py
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS detecciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  video_id        INT     NOT NULL,
  zona_id         INT,
  frame_numero    INT     NOT NULL,
  coord_x         FLOAT   NOT NULL,
  coord_y         FLOAT   NOT NULL,
  confianza       FLOAT   NOT NULL,
  timestamp_frame DATETIME,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (zona_id)  REFERENCES zonas(id)  ON DELETE SET NULL
);

-- --------------------------------------------
-- METRICAS
-- Resumen calculado por zona y video
-- Cubre HU-03, HU-04, HU-05
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS metricas (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  zona_id               INT     NOT NULL,
  video_id              INT     NOT NULL,
  total_personas        INT     DEFAULT 0,
  promedio_por_minuto   FLOAT   DEFAULT 0,
  porcentaje_afluencia  FLOAT   DEFAULT 0,
  pico_maximo           INT     DEFAULT 0,
  hora_pico             DATETIME,
  calculado_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id)  REFERENCES zonas(id)  ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- ALERTAS
-- Zonas con baja actividad detectadas
-- Cubre HU-07: alerta zona fría
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS alertas (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zona_id     INT           NOT NULL,
  video_id    INT           NOT NULL,
  tipo        ENUM('zona_fria','zona_saturada','sin_detecciones') NOT NULL,
  mensaje     VARCHAR(255),
  leida       BOOLEAN       DEFAULT FALSE,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zona_id)  REFERENCES zonas(id)  ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- REPORTES
-- Registro de PDFs generados
-- Cubre HU-06: exportar reporte PDF
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  video_id      INT           NOT NULL,
  usuario_id    INT           NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo  VARCHAR(500)  NOT NULL,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id)   REFERENCES videos(id)   ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- --------------------------------------------
-- LOGS DE ACTIVIDAD
-- Auditoría de acciones del sistema
-- Útil para el superadmin
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS logs_actividad (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  accion      VARCHAR(100)  NOT NULL,
  detalle     TEXT,
  ip_origen   VARCHAR(45),
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES para mejorar rendimiento
-- ============================================
CREATE INDEX idx_detecciones_video    ON detecciones (video_id);
CREATE INDEX idx_detecciones_zona     ON detecciones (zona_id);
CREATE INDEX idx_metricas_video       ON metricas (video_id);
CREATE INDEX idx_metricas_zona        ON metricas (zona_id);
CREATE INDEX idx_videos_estado        ON videos (estado);
CREATE INDEX idx_alertas_leida        ON alertas (leida);
CREATE INDEX idx_logs_usuario         ON logs_actividad (usuario_id);

-- ============================================
-- DATOS INICIALES DE PRUEBA
-- Password: flowsense123 (BCrypt)
-- ============================================
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES
('Super', 'Admin', 'admin@flowsense.cl',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhuG',
 'superadmin');

INSERT INTO configuracion_usuario (usuario_id, umbral_confianza, fps_procesamiento) VALUES
(1, 0.5, 1);