USE animal_hospital_anomaly;

-- Migración idempotente compatible con instalaciones de MySQL que no aceptan
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Partida' AND COLUMN_NAME = 'pacientes_curados') = 0,
  'ALTER TABLE Partida ADD COLUMN pacientes_curados INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Partida' AND COLUMN_NAME = 'anomalias_rechazadas') = 0,
  'ALTER TABLE Partida ADD COLUMN anomalias_rechazadas INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Partida' AND COLUMN_NAME = 'errores_cometidos') = 0,
  'ALTER TABLE Partida ADD COLUMN errores_cometidos INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Partida' AND COLUMN_NAME = 'monedas_ganadas') = 0,
  'ALTER TABLE Partida ADD COLUMN monedas_ganadas INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS HistorialPartida (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  turno_alcanzado INT NOT NULL,
  pacientes_curados INT NOT NULL DEFAULT 0,
  anomalias_rechazadas INT NOT NULL DEFAULT 0,
  errores_cometidos INT NOT NULL DEFAULT 0,
  monedas_ganadas INT NOT NULL DEFAULT 0,
  cordura_final INT NOT NULL DEFAULT 0,
  duracion_segundos INT NOT NULL DEFAULT 0,
  iniciada_en TIMESTAMP NOT NULL,
  finalizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_historial_usuario_fecha (usuario_id, finalizada_en),
  CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista de reportes para demostrar una consulta reutilizable entre tablas.
CREATE OR REPLACE VIEW vista_historial_partidas AS
SELECT
  h.id,
  h.usuario_id,
  u.email AS jugador,
  h.turno_alcanzado,
  h.pacientes_curados,
  h.anomalias_rechazadas,
  h.errores_cometidos,
  h.monedas_ganadas,
  h.cordura_final,
  h.duracion_segundos,
  h.iniciada_en,
  h.finalizada_en
FROM HistorialPartida h
JOIN Usuario u ON u.id = h.usuario_id;
