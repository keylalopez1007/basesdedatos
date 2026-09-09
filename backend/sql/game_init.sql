USE animal_hospital_anomaly;

CREATE TABLE IF NOT EXISTS Partida (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  turno_actual INT NOT NULL DEFAULT 1,
  iniciada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('en_curso', 'pausada', 'terminada') NOT NULL DEFAULT 'en_curso',
  dificultad VARCHAR(30) NOT NULL DEFAULT 'normal',
  monedas INT NOT NULL DEFAULT 0,
  clase_id INT NULL,
  nivel INT NOT NULL DEFAULT 1,
  exp INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_partida_usuario_estado (usuario_id, estado),
  CONSTRAINT fk_partida_usuario FOREIGN KEY (usuario_id) REFERENCES Usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ClaseJuego (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(80) NOT NULL,
  costo_monedas INT NOT NULL DEFAULT 0,
  stats_base JSON NULL,
  desbloquea_en_turno INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clase_juego_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PacienteJuego (
  id INT NOT NULL AUTO_INCREMENT,
  partida_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  condicion VARCHAR(100) NOT NULL,
  estado ENUM('esperando', 'en_atencion', 'curado', 'critico', 'perdido') NOT NULL DEFAULT 'esperando',
  tratamiento_requerido VARCHAR(100) NULL,
  es_anomalia TINYINT(1) NOT NULL DEFAULT 0,
  detectado TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_paciente_partida (partida_id),
  CONSTRAINT fk_paciente_partida FOREIGN KEY (partida_id) REFERENCES Partida(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Anomalia (
  id INT NOT NULL AUTO_INCREMENT,
  partida_id INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  turno_en_que_aparecio INT NOT NULL,
  estado ENUM('activa', 'neutralizada') NOT NULL DEFAULT 'activa',
  paciente_asociado_id INT NULL,
  PRIMARY KEY (id),
  INDEX idx_anomalia_partida_estado (partida_id, estado),
  CONSTRAINT fk_anomalia_partida FOREIGN KEY (partida_id) REFERENCES Partida(id) ON DELETE CASCADE,
  CONSTRAINT fk_anomalia_paciente FOREIGN KEY (paciente_asociado_id) REFERENCES PacienteJuego(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS EventoJuego (
  id BIGINT NOT NULL AUTO_INCREMENT,
  partida_id INT NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  turno INT NOT NULL,
  ocurrido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data JSON NULL,
  PRIMARY KEY (id),
  INDEX idx_evento_partida_fecha (partida_id, ocurrido_en),
  CONSTRAINT fk_evento_partida FOREIGN KEY (partida_id) REFERENCES Partida(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PartidaClase (
  partida_id INT NOT NULL,
  clase_id INT NOT NULL,
  comprada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (partida_id, clase_id),
  CONSTRAINT fk_partida_clase_partida FOREIGN KEY (partida_id) REFERENCES Partida(id) ON DELETE CASCADE,
  CONSTRAINT fk_partida_clase_clase FOREIGN KEY (clase_id) REFERENCES ClaseJuego(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ClaseJuego (nombre, costo_monedas, stats_base, desbloquea_en_turno)
VALUES
  ('Residente', 0, JSON_OBJECT('tratamiento_bonus', 0), 1),
  ('Detective de anomalías', 100, JSON_OBJECT('deteccion_bonus', 1), 2),
  ('Especialista táctico', 250, JSON_OBJECT('taser_bonus', 1), 4)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
