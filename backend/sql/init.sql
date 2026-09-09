CREATE DATABASE IF NOT EXISTS animal_hospital_anomaly
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE animal_hospital_anomaly;

CREATE TABLE IF NOT EXISTS Usuario (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PagosTurno (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  turno_id INT NOT NULL,
  jugador_id INT NOT NULL,
  pacientes_total INT NOT NULL,
  aciertos INT NOT NULL,
  errores INT NOT NULL,
  bono INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pago_turno (turno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
