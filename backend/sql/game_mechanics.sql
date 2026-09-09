USE animal_hospital_anomaly;

ALTER TABLE Partida ADD COLUMN IF NOT EXISTS cordura INT NOT NULL DEFAULT 100;
ALTER TABLE PacienteJuego ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0;

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
