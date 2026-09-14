USE animal_hospital_anomaly;

DROP PROCEDURE IF EXISTS sp_resumen_partida;

DELIMITER $$

CREATE PROCEDURE sp_resumen_partida(IN p_partida_id INT)
BEGIN
  SELECT
    p.id AS partida_id,
    u.email AS jugador,
    p.turno_actual,
    p.estado,
    p.monedas,
    p.cordura,
    p.pacientes_curados,
    p.anomalias_rechazadas,
    p.errores_cometidos,
    p.monedas_ganadas,
    COUNT(DISTINCT pj.id) AS pacientes_registrados,
    COUNT(DISTINCT e.id) AS eventos_generados
  FROM Partida p
  JOIN Usuario u ON u.id = p.usuario_id
  LEFT JOIN PacienteJuego pj ON pj.partida_id = p.id
  LEFT JOIN EventoJuego e ON e.partida_id = p.id
  WHERE p.id = p_partida_id
  GROUP BY p.id, u.email, p.turno_actual, p.estado, p.monedas, p.cordura,
           p.pacientes_curados, p.anomalias_rechazadas, p.errores_cometidos,
           p.monedas_ganadas;
END$$

DELIMITER ;
