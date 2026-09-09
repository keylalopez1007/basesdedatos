USE animal_hospital_anomaly;

-- MySQL no admite "ADD COLUMN IF NOT EXISTS" en todas sus versiones.
-- Estas sentencias hacen la migración idempotente usando information_schema.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Partida' AND COLUMN_NAME = 'cordura') = 0,
  'ALTER TABLE Partida ADD COLUMN cordura INT NOT NULL DEFAULT 100',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PacienteJuego' AND COLUMN_NAME = 'orden') = 0,
  'ALTER TABLE PacienteJuego ADD COLUMN orden INT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS Medicamento (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  icono VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_medicamento_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PacienteMedicamento (
  paciente_id INT NOT NULL,
  medicamento_id INT NOT NULL,
  PRIMARY KEY (paciente_id, medicamento_id),
  CONSTRAINT fk_pm_paciente FOREIGN KEY (paciente_id) REFERENCES PacienteJuego(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_medicamento FOREIGN KEY (medicamento_id) REFERENCES Medicamento(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO Medicamento (nombre, icono) VALUES
  ('Analgesico', '💊'), ('Antibiotico', '🧪'), ('Observacion', '🔍'),
  ('Suero', '💧'), ('Antiparasitario', '🧴'), ('Sedante', '💉')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
