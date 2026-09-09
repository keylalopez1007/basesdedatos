USE animal_hospital_anomaly;

ALTER TABLE Partida ADD COLUMN pacientes_curados INT NOT NULL DEFAULT 0;
ALTER TABLE Partida ADD COLUMN anomalias_rechazadas INT NOT NULL DEFAULT 0;
ALTER TABLE Partida ADD COLUMN errores_cometidos INT NOT NULL DEFAULT 0;
ALTER TABLE Partida ADD COLUMN monedas_ganadas INT NOT NULL DEFAULT 0;

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
