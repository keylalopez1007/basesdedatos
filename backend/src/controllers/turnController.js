const pool = require('../config/db');

const BONUS_PER_CORRECT_DECISION = 10;

async function listTurns(_req, res, next) {
  try {
    const [turns] = await pool.execute(
      `SELECT t.id, j.nombre_usuario AS jugador, t.fecha_inicio, t.resultado,
              COUNT(p.id) AS pacientes
       FROM Turnos t
       JOIN Jugadores j ON j.id = t.jugador_id
       LEFT JOIN Pacientes p ON p.turno_id = t.id
       GROUP BY t.id, j.nombre_usuario, t.fecha_inicio, t.resultado
       ORDER BY t.fecha_inicio DESC, t.id DESC`
    );
    return res.status(200).json({ turnos: turns });
  } catch (error) {
    return next(error);
  }
}

async function finalizeTurn(req, res, next) {
  const turnoId = Number(req.params.turnoId);
  if (!Number.isInteger(turnoId) || turnoId <= 0) {
    return res.status(400).json({ error: 'El turno_id debe ser un número entero positivo.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [turns] = await connection.execute(
      `SELECT t.id, t.jugador_id, j.nombre_usuario, j.monedas
       FROM Turnos t JOIN Jugadores j ON j.id = t.jugador_id
       WHERE t.id = ? FOR UPDATE`, [turnoId]
    );
    if (!turns[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Turno no encontrado.' });
    }
    const turn = turns[0];
    const [payments] = await connection.execute(
      'SELECT turno_id, pacientes_total, aciertos, errores, bono, created_at FROM PagosTurno WHERE turno_id = ? LIMIT 1', [turnoId]
    );
    if (payments[0]) {
      await connection.commit();
      return res.status(200).json({ turno_id: turnoId, jugador: turn.nombre_usuario, pago: payments[0], monedas_actuales: turn.monedas, ya_pagado: true });
    }

    const [patients] = await connection.execute(
      `SELECT p.id, p.es_anomalia, p.fue_admitido, e.nombre AS especie, ta.nombre AS tipo_anomalia
       FROM Pacientes p JOIN Especies e ON e.id = p.especie_id
       LEFT JOIN TiposAnomalia ta ON ta.id = p.tipo_anomalia_id
       WHERE p.turno_id = ? ORDER BY p.orden_llegada, p.id`, [turnoId]
    );
    const detalle = patients.map((patient) => {
      const decisionEsperada = patient.es_anomalia ? 0 : 1;
      return {
        paciente_id: patient.id,
        especie: patient.especie,
        tipo_anomalia: patient.tipo_anomalia,
        decision_real: Boolean(patient.fue_admitido),
        decision_esperada: Boolean(decisionEsperada),
        correcta: Number(patient.fue_admitido) === decisionEsperada
      };
    });
    const aciertos = detalle.filter((item) => item.correcta).length;
    const errores = detalle.length - aciertos;
    const bono = aciertos * BONUS_PER_CORRECT_DECISION;
    await connection.execute(
      `INSERT INTO PagosTurno (turno_id, jugador_id, pacientes_total, aciertos, errores, bono)
       VALUES (?, ?, ?, ?, ?, ?)`, [turnoId, turn.jugador_id, detalle.length, aciertos, errores, bono]
    );
    await connection.execute('UPDATE Jugadores SET monedas = monedas + ? WHERE id = ?', [bono, turn.jugador_id]);
    await connection.commit();
    return res.status(201).json({
      turno_id: turnoId,
      jugador: turn.nombre_usuario,
      resumen: { pacientes_total: detalle.length, aciertos, errores, bono, bono_por_acierto: BONUS_PER_CORRECT_DECISION, detalle },
      monedas_anteriores: turn.monedas,
      monedas_actuales: turn.monedas + bono,
      ya_pagado: false
    });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_NO_SUCH_TABLE') return res.status(500).json({ error: 'Falta crear la tabla PagosTurno. Ejecuta la actualización SQL.' });
    return next(error);
  } finally {
    connection.release();
  }
}

module.exports = { listTurns, finalizeTurn };
