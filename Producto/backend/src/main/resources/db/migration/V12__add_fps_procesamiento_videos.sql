-- V12: Agrega fps_procesamiento a VIDEOS (sample rate usado por Python).
-- Necesario para convertir frames muestreados a segundos reales en las
-- métricas de tracking (OTS, permanencia). Default 10: todos los videos
-- con tracking se procesaron con --fps 10.
-- Idempotente: usa INFORMATION_SCHEMA para no fallar si la columna
-- ya existiera en la BD de desarrollo.

SET @db = DATABASE();

SET @q = (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE VIDEOS ADD COLUMN fps_procesamiento INT NULL DEFAULT 10',
    'DO 0')
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'VIDEOS' AND COLUMN_NAME = 'fps_procesamiento');
PREPARE s FROM @q; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE VIDEOS SET fps_procesamiento = 10 WHERE fps_procesamiento IS NULL;
