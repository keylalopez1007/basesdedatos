const pool = require('../config/db');

const PATIENT_TEMPLATES = [
  ['Luna', 'dolor e inflamación', 'analgesico', 0],
  ['Max', 'fiebre y secreción nasal', 'antibiotico', 0],
  ['Nala', 'distorsión visual y comportamiento extraño', 'observacion', 1],
  ['Coco', 'deshidratación y debilidad', 'suero', 0],
  ['Milo', 'picazón intensa y parásitos', 'antiparasitario', 0],
  ['Kira', 'ansiedad y agitación', 'sedante', 0]
];

async function spawnPatient(connection, partidaId, turno) {
  const template = PATIENT_TEMPLATES[(turno - 1) % PATIENT_TEMPLATES.length];
  const [baseName, baseCondition, treatment, baseAnomaly] = template;
  const advancedAnomaly = turno >= 4 && turno % 2 === 0;
  const anomaly = baseAnomaly || advancedAnomaly ? 1 : 0;
  const condition = anomaly && advancedAnomaly ? 'síntomas ambiguos y comportamiento extraño' : baseCondition;
  const [result] = await connection.execute(
    `INSERT INTO PacienteJuego (partida_id, nombre, condicion, tratamiento_requerido, es_anomalia, orden)
     VALUES (?, ?, ?, ?, ?, ?)`, [partidaId, `${baseName} #${turno}`, condition, treatment, anomaly, turno]
  );
  const [medicines] = await connection.execute('SELECT id FROM Medicamento WHERE LOWER(nombre) = ?', [treatment]);
  if (medicines[0]) await connection.execute('INSERT IGNORE INTO PacienteMedicamento (paciente_id, medicamento_id) VALUES (?, ?)', [result.insertId, medicines[0].id]);
  if (anomaly) await connection.execute(`INSERT INTO Anomalia (partida_id, tipo, turno_en_que_aparecio, paciente_asociado_id) VALUES (?, 'Distorsión animal', ?, ?)`, [partidaId, turno, result.insertId]);
}

async function recordHistory(connection, game) {
  const [existing] = await connection.execute('SELECT id FROM HistorialPartida WHERE usuario_id = ? AND iniciada_en = ? LIMIT 1', [game.usuario_id, game.iniciada_en]);
  if (existing[0]) return existing[0].id;
  const duration = Math.max(0, Math.floor((Date.now() - new Date(game.iniciada_en).getTime()) / 1000));
  const [result] = await connection.execute(
    `INSERT INTO HistorialPartida (usuario_id, turno_alcanzado, pacientes_curados, anomalias_rechazadas, errores_cometidos, monedas_ganadas, cordura_final, duracion_segundos, iniciada_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [game.usuario_id, game.turno_actual, game.pacientes_curados || 0, game.anomalias_rechazadas || 0, game.errores_cometidos || 0, game.monedas_ganadas || 0, game.cordura || 0, duration, game.iniciada_en]
  );
  return result.insertId;
}

async function finishGame(connection, game) {
  const historyId = await recordHistory(connection, game);
  await connection.execute(`UPDATE Partida SET estado = 'terminada' WHERE id = ?`, [game.id]);
  const [rows] = await connection.execute('SELECT * FROM HistorialPartida WHERE id = ?', [historyId]);
  return rows[0];
}

async function advanceAfterPatient(connection, game, { cured = 0, anomalyRejected = 0, error = 0, coins = 0 }) {
  const nextTurn = Number(game.turno_actual) + 1;
  await connection.execute(
    `UPDATE Partida SET turno_actual = ?, pacientes_curados = pacientes_curados + ?, anomalias_rechazadas = anomalias_rechazadas + ?, errores_cometidos = errores_cometidos + ?, monedas_ganadas = monedas_ganadas + ?, monedas = monedas + ? WHERE id = ?`,
    [nextTurn, cured, anomalyRejected, error, Math.max(coins, 0), coins, game.id]
  );
  await spawnPatient(connection, game.id, nextTurn);
  await connection.execute(`INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, 'inicio_turno', ?, JSON_OBJECT('turno', ?))`, [game.id, nextTurn, nextTurn]);
}

async function activeGame(connection, userId) {
  const [rows] = await connection.execute(
    `SELECT p.* , c.nombre AS clase_nombre
     FROM Partida p LEFT JOIN ClaseJuego c ON c.id = p.clase_id
     WHERE p.usuario_id = ? AND p.estado = 'en_curso'
     ORDER BY p.id DESC LIMIT 1`, [userId]
  );
  return rows[0];
}

async function startGame(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const current = await activeGame(connection, req.user.id);
    if (current) {
      const [remaining] = await connection.execute(`SELECT COUNT(*) AS total FROM PacienteJuego WHERE partida_id = ? AND estado NOT IN ('curado', 'perdido')`, [current.id]);
      if (Number(remaining[0].total) > 0) {
        await connection.commit();
        return res.status(200).json({ partida: current, ya_existia: true });
      }
      await connection.execute(`UPDATE Partida SET estado = 'terminada' WHERE id = ?`, [current.id]);
    }
    const [result] = await connection.execute(
      `INSERT INTO Partida (usuario_id, turno_actual, dificultad, monedas, nivel, exp, cordura)
       VALUES (?, 1, 'normal', 0, 1, 0, 100)`, [req.user.id]
    );
    const partidaId = result.insertId;
    const samplePatients = [PATIENT_TEMPLATES[0]];
    for (const [index, [nombre, condicion, tratamiento, anomaly]] of samplePatients.entries()) {
      const [patientResult] = await connection.execute(
        `INSERT INTO PacienteJuego (partida_id, nombre, condicion, tratamiento_requerido, es_anomalia, orden)
         VALUES (?, ?, ?, ?, ?, ?)`, [partidaId, nombre, condicion, tratamiento, anomaly, index + 1]
      );
      const [medicines] = await connection.execute('SELECT id FROM Medicamento WHERE LOWER(nombre) = ?', [tratamiento]);
      if (medicines[0]) await connection.execute('INSERT IGNORE INTO PacienteMedicamento (paciente_id, medicamento_id) VALUES (?, ?)', [patientResult.insertId, medicines[0].id]);
      if (anomaly) await connection.execute(`INSERT INTO Anomalia (partida_id, tipo, turno_en_que_aparecio, paciente_asociado_id) VALUES (?, 'Distorsión animal', 1, ?)`, [partidaId, patientResult.insertId]);
    }
    await connection.execute(
      `INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, 'inicio_partida', 1, JSON_OBJECT('mensaje', 'La partida comenzó'))`, [partidaId]
    );
    await connection.commit();
    return res.status(201).json({ partida_id: partidaId, mensaje: 'Partida iniciada.' });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally { connection.release(); }
}

async function getState(req, res, next) {
  try {
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const [patients] = await connection.execute(
      `SELECT id, nombre,
              CASE WHEN detectado = 1 THEN condicion ELSE 'Paciente esperando revisión' END AS condicion,
              estado, CASE WHEN detectado = 1 THEN es_anomalia ELSE NULL END AS es_anomalia,
              CASE WHEN detectado = 1 THEN tratamiento_requerido ELSE NULL END AS tratamiento_sugerido,
              detectado, orden FROM PacienteJuego
       WHERE partida_id = ? AND estado NOT IN ('curado', 'perdido')
       ORDER BY orden, id`, [game.id]
    );
    const [anomalies] = await connection.execute(
      `SELECT id, tipo, turno_en_que_aparecio, estado, paciente_asociado_id
       FROM Anomalia WHERE partida_id = ? AND estado = 'activa'`, [game.id]
    );
    connection.release();
    return res.json({ partida: game, paciente_actual: patients[0] || null, pacientes: patients, anomalias: anomalies });
  } catch (error) { return next(error); }
}

async function getEvents(req, res, next) {
  try {
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const since = req.query.desde ? new Date(req.query.desde) : new Date(0);
    const [events] = await connection.execute(
      `SELECT id, tipo, turno, ocurrido_en, data FROM EventoJuego
       WHERE partida_id = ? AND ocurrido_en > ? ORDER BY ocurrido_en, id`, [game.id, since]
    );
    connection.release();
    return res.json({ eventos: events });
  } catch (error) { return next(error); }
}

async function scanPatient(req, res, next) {
  try {
    const patientId = Number(req.body.pacienteId);
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const [result] = await connection.execute(
      `UPDATE PacienteJuego SET detectado = 1 WHERE id = ? AND partida_id = ?`, [patientId, game.id]
    );
    if (!result.affectedRows) { connection.release(); return res.status(404).json({ error: 'Paciente no encontrado.' }); }
    const [patients] = await connection.execute(
      `SELECT id, nombre, condicion, estado, tratamiento_requerido, es_anomalia, detectado
       FROM PacienteJuego WHERE id = ?`, [patientId]
    );
    await connection.execute(`INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, 'paciente_escaneado', ?, JSON_OBJECT('paciente_id', ?))`, [game.id, game.turno_actual, patientId]);
    connection.release();
    return res.json({ paciente: patients[0] });
  } catch (error) { return next(error); }
}

async function buyClass(req, res, next) {
  const classId = Number(req.body.claseId);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const game = await activeGame(connection, req.user.id);
    if (!game) { await connection.rollback(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const [classes] = await connection.execute('SELECT * FROM ClaseJuego WHERE id = ?', [classId]);
    const selected = classes[0];
    if (!selected) { await connection.rollback(); return res.status(404).json({ error: 'Clase no encontrada.' }); }
    if (game.turno_actual < selected.desbloquea_en_turno) { await connection.rollback(); return res.status(400).json({ error: 'La clase todavía está bloqueada.' }); }
    if (game.monedas < selected.costo_monedas) { await connection.rollback(); return res.status(400).json({ error: 'No tienes suficientes monedas.' }); }
    await connection.execute('UPDATE Partida SET monedas = monedas - ?, clase_id = ? WHERE id = ?', [selected.costo_monedas, classId, game.id]);
    await connection.execute('INSERT IGNORE INTO PartidaClase (partida_id, clase_id) VALUES (?, ?)', [game.id, classId]);
    await connection.commit();
    return res.json({ clase: selected, monedas_actuales: game.monedas - selected.costo_monedas });
  } catch (error) { await connection.rollback(); return next(error); } finally { connection.release(); }
}

async function applyTreatment(req, res, next) {
  const patientId = Number(req.body.pacienteId);
  const selected = Array.isArray(req.body.medicamentosSeleccionados) ? req.body.medicamentosSeleccionados : [req.body.tratamientoId];
  const selectedNames = selected.filter((item) => typeof item === 'string').map((item) => item.trim().toLowerCase()).filter(Boolean).sort();
  if (!patientId || !selectedNames.length) return res.status(400).json({ error: 'pacienteId y medicamentosSeleccionados son requeridos.' });
  try {
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const [rows] = await connection.execute('SELECT * FROM PacienteJuego WHERE id = ? AND partida_id = ?', [patientId, game.id]);
    const patient = rows[0];
    if (!patient) { connection.release(); return res.status(404).json({ error: 'Paciente no encontrado.' }); }
    if (['curado', 'perdido'].includes(patient.estado)) { connection.release(); return res.status(400).json({ error: 'Este paciente ya no puede recibir tratamiento.' }); }
    const [expectedRows] = await connection.execute(`SELECT LOWER(m.nombre) AS nombre FROM PacienteMedicamento pm JOIN Medicamento m ON m.id = pm.medicamento_id WHERE pm.paciente_id = ?`, [patientId]);
    const expectedNames = expectedRows.map((item) => item.nombre).sort();
    const correct = expectedNames.length ? JSON.stringify(expectedNames) === JSON.stringify(selectedNames) : selectedNames.length === 1 && patient.tratamiento_requerido && patient.tratamiento_requerido.toLowerCase() === selectedNames[0];
    const newSanity = Math.max(0, Number(game.cordura || 100) + (correct ? 0 : -20));
    await connection.execute('UPDATE PacienteJuego SET estado = ? WHERE id = ?', [correct ? 'curado' : 'perdido', patientId]);
    await connection.execute('UPDATE Partida SET cordura = ?, monedas = monedas + ?, pacientes_curados = pacientes_curados + ?, errores_cometidos = errores_cometidos + ?, monedas_ganadas = monedas_ganadas + ? WHERE id = ?', [newSanity, correct ? 1 : -1, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0, game.id]);
    await connection.execute(`INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, ?, ?, JSON_OBJECT('paciente_id', ?, 'correcto', ?))`, [game.id, correct ? 'tratamiento_correcto' : 'tratamiento_incorrecto', game.turno_actual, patientId, correct]);
    let report = null;
    if (newSanity <= 0) {
      const [updated] = await connection.execute('SELECT * FROM Partida WHERE id = ?', [game.id]);
      report = await finishGame(connection, updated[0]);
    } else {
      await advanceAfterPatient(connection, game, {});
    }
    connection.release();
    return res.json({ paciente_id: patientId, correcto: correct, estado: correct ? 'curado' : 'perdido', monedas_delta: correct ? 1 : -1, cordura: newSanity, game_over: newSanity <= 0, reporte: report });
  } catch (error) { return next(error); }
}

async function rejectPatient(req, res, next) {
  const patientId = Number(req.body.pacienteId);
  if (!patientId) return res.status(400).json({ error: 'pacienteId es requerido.' });
  try {
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    const [rows] = await connection.execute('SELECT * FROM PacienteJuego WHERE id = ? AND partida_id = ?', [patientId, game.id]);
    const patient = rows[0];
    if (!patient) { connection.release(); return res.status(404).json({ error: 'Paciente no encontrado.' }); }
    const correct = Boolean(patient.es_anomalia);
    const newSanity = Math.max(0, Number(game.cordura || 100) + (correct ? 0 : -20));
    await connection.execute('UPDATE PacienteJuego SET estado = ? WHERE id = ?', [correct ? 'perdido' : 'perdido', patientId]);
    await connection.execute('UPDATE Partida SET cordura = ?, monedas = monedas + ?, anomalias_rechazadas = anomalias_rechazadas + ?, errores_cometidos = errores_cometidos + ?, monedas_ganadas = monedas_ganadas + ? WHERE id = ?', [newSanity, correct ? 1 : -1, correct ? 1 : 0, correct ? 0 : 1, correct ? 1 : 0, game.id]);
    await connection.execute(`INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, ?, ?, JSON_OBJECT('paciente_id', ?, 'correcto', ?))`, [game.id, correct ? 'anomalia_rechazada' : 'error_rechazo_paciente', game.turno_actual, patientId, correct]);
    let report = null;
    if (newSanity <= 0) {
      const [updated] = await connection.execute('SELECT * FROM Partida WHERE id = ?', [game.id]);
      report = await finishGame(connection, updated[0]);
    } else {
      await advanceAfterPatient(connection, game, {});
    }
    connection.release();
    return res.json({ correcto: correct, monedas_delta: correct ? 1 : -1, cordura: newSanity, game_over: newSanity <= 0, reporte: report });
  } catch (error) { return next(error); }
}

async function useTaser(req, res, next) {
  const anomalyId = Number(req.body.anomaliaId);
  if (!anomalyId) return res.status(400).json({ error: 'anomaliaId es requerido.' });
  try {
    const connection = await pool.getConnection();
    const game = await activeGame(connection, req.user.id);
    if (!game) { connection.release(); return res.status(404).json({ error: 'No tienes una partida en curso.' }); }
    if (game.turno_actual < 4) { connection.release(); return res.status(400).json({ error: 'El táser se desbloquea en el turno 4.' }); }
    const [result] = await connection.execute(`UPDATE Anomalia SET estado = 'neutralizada' WHERE id = ? AND partida_id = ? AND estado = 'activa'`, [anomalyId, game.id]);
    if (!result.affectedRows) { connection.release(); return res.status(404).json({ error: 'Anomalía no encontrada o ya neutralizada.' }); }
    await connection.execute(`INSERT INTO EventoJuego (partida_id, tipo, turno, data) VALUES (?, 'anomalia_neutralizada', ?, JSON_OBJECT('anomalia_id', ?))`, [game.id, game.turno_actual, anomalyId]);
    connection.release();
    return res.json({ anomalia_id: anomalyId, estado: 'neutralizada' });
  } catch (error) { return next(error); }
}

async function finalizeGame(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const game = await activeGame(connection, req.user.id);
    if (!game) {
      await connection.rollback();
      return res.status(404).json({ error: 'No tienes una partida activa.' });
    }
    const report = await finishGame(connection, game);
    await connection.commit();
    return res.status(201).json({ reporte: report });
  } catch (error) { await connection.rollback(); return next(error); } finally { connection.release(); }
}

async function listHistory(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, usuario_id, jugador, turno_alcanzado, pacientes_curados,
              anomalias_rechazadas, errores_cometidos, monedas_ganadas,
              cordura_final, duracion_segundos, iniciada_en, finalizada_en
       FROM vista_historial_partidas
       WHERE usuario_id = ?
       ORDER BY finalizada_en DESC, id DESC`,
      [req.user.id]
    );
    return res.json({ historial: rows });
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ error: 'Falta crear la vista vista_historial_partidas.' });
    }
    return next(error);
  }
}

module.exports = { startGame, getState, getEvents, scanPatient, applyTreatment, rejectPatient, useTaser, buyClass, finalizeGame, listHistory };
