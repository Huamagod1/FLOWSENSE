-- Organización de prueba
INSERT INTO organizaciones (id, nombre, activo) VALUES (1, 'FlowSense Mall Demo', 1);

-- Usuario administrador (password: flowsense123)
-- Hash generado con BCrypt strength 10
INSERT INTO usuarios (id, id_organizacion, email, password_hash, nombre, apellido, rol, activo) 
VALUES (1, 1, 'admin@flowsense.cl', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhuG', 'Admin', 'FlowSense', 'ADMIN', 1);

-- Recinto de prueba
INSERT INTO recintos (id, id_organizacion, nombre, tipo, direccion) 
VALUES (1, 1, 'Mall Costanera Center', 'MALL', 'Avenida Andrés Bello 2425, Providencia');

-- Zonas de prueba
INSERT INTO zonas (id, id_recinto, nombre, x, y, ancho, alto, color_hex) VALUES 
(1, 1, 'Entrada Principal', 0.1, 0.1, 0.2, 0.2, '#FF5733'),
(2, 1, 'Pasillo Central', 0.4, 0.1, 0.2, 0.6, '#33FF57'),
(3, 1, 'Zona de Tiendas', 0.7, 0.1, 0.2, 0.8, '#3357FF');
