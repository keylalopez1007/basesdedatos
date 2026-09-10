const API_URL = window.APP_CONFIG.API_URL;
const tokenKey = 'animal_hospital_anomaly_token';
const loginView = document.querySelector('#login-view');
const profileView = document.querySelector('#profile-view');
const message = document.querySelector('#message');
const startPanel = document.querySelector('#game-start');
const hud = document.querySelector('#game-hud');
let treatmentMode = false;
let treatmentPatientId = null;
let latestState = null;
let generalTimeLeft = 60;
let generalTimerId = null;
let specialTimerId = null;
let specialSpawnId = null;
let specialRoomActive = false;
let specialHp = 45;
let specialTimeLeft = 12;
let patientsHandled = 0;
let nextSpecialAt = 3 + Math.floor(Math.random() * 3);
let gameStatus = 'playing';
const gameAudio = document.querySelector('#game-audio');

const patientImages = {
  Luna: ['assets/luna-normal.jpg', 'assets/luna-anomalia.jpg'],
  Max: ['assets/max-normal.jpg', 'assets/luna-anomalia.jpg'],
  Nala: ['assets/max-normal.jpg', 'assets/luna-anomalia.jpg'],
  Coco: ['assets/kira-normal.jpg', 'assets/coco-anomalia.jpg'],
  Milo: ['assets/max-normal.jpg', 'assets/milo-anomalia.jpg'],
  Kira: ['assets/kira-normal.jpg', 'assets/coco-anomalia.jpg']
};

function showMessage(text, success = false) { message.textContent = text; message.className = success ? 'success' : ''; }
window.addEventListener('error', (event) => { showMessage(`Error de la interfaz: ${event.message || 'revisa la consola del navegador'}`); });
window.addEventListener('unhandledrejection', (event) => { showMessage(`Error de conexión: ${event.reason?.message || 'no se pudo completar la solicitud'}`); });
function showLogin() { loginView.hidden = false; profileView.hidden = true; }
function showProfile(email) { document.querySelector('#welcome-message').textContent = email; loginView.hidden = true; profileView.hidden = false; }
function getPatientKey(patient) { return String(patient?.nombre || 'Luna').split(' ')[0]; }
function getPatientImage(patient, anomaly = false) { const pair = patientImages[getPatientKey(patient)] || patientImages.Luna; return anomaly ? pair[1] : pair[0]; }
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function formatTime(seconds) { const safe = Math.max(0, Number(seconds) || 0); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
function updateGeneralTimer() { const timer = document.querySelector('#general-timer'); if (timer) { timer.textContent = formatTime(generalTimeLeft); timer.classList.toggle('urgent', generalTimeLeft <= 10); } }
function clearSpecialLoops() { if (specialTimerId) clearInterval(specialTimerId); if (specialSpawnId) clearTimeout(specialSpawnId); specialTimerId = null; specialSpawnId = null; const target = document.querySelector('#special-target'); if (target) { target.hidden = true; target.onclick = null; } }
function stopGeneralClock() { if (generalTimerId) clearInterval(generalTimerId); generalTimerId = null; gameAudio.pause(); }
async function endGeneralGame(messageText) {
  if (gameStatus !== 'playing') return;
  gameStatus = 'lost'; clearSpecialLoops(); stopGeneralClock(); specialRoomActive = false;
  try { const result = await request('/partida/finalizar', { method: 'POST' }); document.querySelector('#special-room').hidden = true; hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage(messageText); } catch (error) { showMessage(error.message); }
}
function startGeneralClock(game) {
  if (gameStatus !== 'playing') return;
  const elapsed = game?.iniciada_en ? Math.floor((Date.now() - new Date(game.iniciada_en).getTime()) / 1000) : 0;
  if (generalTimerId === null) generalTimeLeft = Math.max(0, 60 - elapsed);
  updateGeneralTimer();
  if (generalTimeLeft <= 0) { endGeneralGame('Tiempo agotado: la partida terminó.'); return; }
  if (generalTimerId === null) {
    gameAudio.play().catch(() => {});
    generalTimerId = setInterval(() => { generalTimeLeft -= 1; updateGeneralTimer(); if (generalTimeLeft <= 0) endGeneralGame('Tiempo agotado: la partida terminó.'); }, 1000);
  }
}
function updateSpecialHud() { document.querySelector('#special-timer').textContent = formatTime(specialTimeLeft); document.querySelector('#special-hp').textContent = `${Math.round(specialHp)}%`; const bar = document.querySelector('#special-hp-bar'); bar.style.width = `${specialHp}%`; bar.classList.toggle('low', specialHp < 35); bar.classList.toggle('high', specialHp >= 70); }
function specialFeedback(text, type = '') { const feedback = document.querySelector('#special-feedback'); feedback.textContent = text; feedback.className = `special-feedback ${type}`; }
function finishSpecial(won) { clearSpecialLoops(); specialRoomActive = false; if (!won) { endGeneralGame('El paciente no sobrevivió a la Sala 7.'); return; } specialFeedback('Paciente estabilizado. Regresando a recepción.', 'success'); setTimeout(() => { document.querySelector('#special-room').hidden = true; document.querySelector('.scene-wrap').hidden = false; document.querySelector('.lower-grid').hidden = false; showReception(); refreshGame().catch((error) => showMessage(error.message)); }, 900); }
function handleSpecialClick(type) { if (!specialRoomActive) return; if (type === 'heart') { specialHp = Math.min(100, specialHp + 8); specialFeedback('♥ Pulso recuperado', 'success'); } else { specialHp = Math.max(0, specialHp - 18); specialFeedback('☠ Error crítico', 'danger'); document.querySelector('#special-room').classList.add('damage-flash'); setTimeout(() => document.querySelector('#special-room').classList.remove('damage-flash'), 180); } updateSpecialHud(); if (specialHp >= 100) finishSpecial(true); if (specialHp <= 0) finishSpecial(false); }
function spawnSpecialTarget() { if (!specialRoomActive) return; const target = document.querySelector('#special-target'); const type = Math.random() < .7 ? 'heart' : 'skull'; target.textContent = type === 'heart' ? '♥' : '💀'; target.className = `special-target ${type}`; target.style.left = `${12 + Math.random() * 76}%`; target.style.top = `${15 + Math.random() * 68}%`; target.hidden = false; target.onclick = () => { target.hidden = true; handleSpecialClick(type); }; setTimeout(() => { if (specialRoomActive) target.hidden = true; }, 400); specialSpawnId = setTimeout(spawnSpecialTarget, 400 + Math.random() * 300); }
function openSpecialRoom() { specialRoomActive = true; treatmentMode = false; specialHp = 45; specialTimeLeft = 12; gameStatus = 'playing'; document.querySelector('.scene-wrap').hidden = true; document.querySelector('#reception-scene').hidden = true; document.querySelector('#treatment-scene').hidden = true; document.querySelector('#treatment-panel').hidden = true; document.querySelector('.lower-grid').hidden = true; document.querySelector('#special-room').hidden = false; updateSpecialHud(); specialFeedback('¡Mantén vivo al paciente!', ''); specialTimerId = setInterval(() => { specialTimeLeft -= 1; specialHp = Math.max(0, specialHp - 1.5); updateSpecialHud(); if (specialHp <= 0) finishSpecial(false); else if (specialTimeLeft <= 0) finishSpecial(specialHp >= 70); }, 1000); spawnSpecialTarget(); }
function shouldTriggerSpecial() { return patientsHandled >= nextSpecialAt; }

function showReport(report) {
  if (!report) return;
  document.querySelector('#final-report').hidden = false;
  document.querySelector('#report-content').innerHTML = `<p>Turno alcanzado: <b>${report.turno_alcanzado}</b></p><p>Pacientes curados: <b>${report.pacientes_curados}</b></p><p>Anomalías rechazadas: <b>${report.anomalias_rechazadas}</b></p><p>Errores cometidos: <b>${report.errores_cometidos}</b></p><p>Monedas ganadas: <b>${report.monedas_ganadas}</b></p><p>Cordura final: <b>${report.cordura_final}</b></p><p>Duración: <b>${report.duracion_segundos} segundos</b></p>`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey)}`, ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'La operación no pudo completarse.');
  return data;
}

function patientMarkup(patient) {
  if (!patient) return '<p class="muted">La ventanilla está lista para el siguiente paciente.</p>';
  const revealed = Boolean(patient.detectado);
  const anomaly = revealed && Boolean(patient.es_anomalia);
  return `<article class="patient-card ${anomaly ? 'distorted' : ''}"><div class="animal-avatar"><img src="${getPatientImage(patient, anomaly)}" alt="${patient.nombre}" /></div><strong>${patient.nombre}</strong><span class="symptoms">${revealed ? `Síntomas observados: ${patient.condicion}` : 'Paciente esperando revisión'}</span><span class="state">${String(patient.estado).replace('_', ' ')}</span>${revealed ? `<small>${anomaly ? '⚠ Anomalía revelada: cerrar ventanilla' : '✓ Paciente real: delegar a tratamiento'}</small>` : '<small>Usa la cámara para inspeccionar</small>'}</article>`;
}

function renderState(data) {
  latestState = data;
  const game = data.partida;
  startGeneralClock(game);
  const completed = Number(game.pacientes_curados || 0) + Number(game.anomalias_rechazadas || 0) + Number(game.errores_cometidos || 0);
  document.querySelector('#turn-number').textContent = game.turno_actual;
  document.querySelector('#coins').textContent = game.monedas;
  document.querySelector('#sanity').textContent = `${game.cordura ?? 100}/100`;
  document.querySelector('#level').textContent = game.nivel;
  document.querySelector('#game-status').textContent = game.estado;
  document.querySelector('#progress-count').textContent = `${completed} atendidos`;
  document.querySelector('#progress-label').textContent = `${completed} / ∞`;
  const patient = data.paciente_actual;
  document.querySelector('#patients').innerHTML = patientMarkup(patient);
  document.querySelector('#scan-patient').disabled = !patient || Boolean(patient.detectado);
  document.querySelector('#confirm-patient').disabled = !patient || !patient.detectado || Boolean(patient.es_anomalia);
  document.querySelector('#reject-patient').disabled = !patient || !patient.detectado;
  document.querySelector('#anomalies').innerHTML = data.anomalias.length ? data.anomalias.map((item) => `<div class="alert-card"><strong>⚠ ${item.tipo}</strong><span>Turno ${item.turno_en_que_aparecio}</span><button type="button" data-taser="${item.id}" class="small-button">Usar táser</button></div>`).join('') : '<p class="muted">No hay anomalías activas.</p>';
  hud.hidden = false;
  startPanel.hidden = Boolean(patient);
  if (!treatmentMode && !specialRoomActive) { document.querySelector('#reception-scene').hidden = false; document.querySelector('#treatment-scene').hidden = true; }
}

function renderTreatmentPatient(patient) {
  treatmentPatientId = patient.id;
  document.querySelector('#treatment-patient').innerHTML = `<div class="animal-avatar"><img src="${getPatientImage(patient, false)}" alt="${patient.nombre}" /></div>`;
  document.querySelector('#treatment-screen-content').innerHTML = `<strong>${patient.nombre}</strong><small>Presiona ESCANEAR EL PACIENTE para iniciar.</small>`;
  document.querySelector('#treatment-panel').hidden = true;
}

function showTreatment(patient) {
  treatmentMode = true;
  document.querySelector('#reception-scene').hidden = true;
  document.querySelector('#treatment-scene').hidden = false;
  renderTreatmentPatient(patient);
}

function showReception() {
  treatmentMode = false;
  treatmentPatientId = null;
  document.querySelector('#treatment-scene').hidden = true;
  document.querySelector('#reception-scene').hidden = false;
  document.querySelector('#treatment-panel').hidden = true;
}

async function refreshGame() {
  const data = await request('/partida/estado');
  renderState(data);
  const events = await request('/partida/eventos');
  document.querySelector('#events').innerHTML = events.eventos.length ? events.eventos.slice(-8).reverse().map((event) => `<div class="event-row"><span>${event.tipo.replaceAll('_', ' ')}</span><small>Turno ${event.turno}</small></div>`).join('') : '<p class="muted">Sin eventos todavía.</p>';
}

async function loadProfile(token) {
  const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No fue posible validar la sesión.');
  showProfile(data.user.email);
  try { await refreshGame(); } catch (_error) { startPanel.hidden = false; hud.hidden = true; }
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget);
  try { const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión.'); localStorage.setItem(tokenKey, data.token); await loadProfile(data.token); showMessage('', true); } catch (error) { showMessage(error.message); }
});

document.querySelector('#start-game-button').addEventListener('click', async () => { try { document.querySelector('#final-report').hidden = true; clearSpecialLoops(); stopGeneralClock(); specialRoomActive = false; gameStatus = 'playing'; generalTimeLeft = 60; patientsHandled = 0; nextSpecialAt = 3 + Math.floor(Math.random() * 3); document.querySelector('.scene-wrap').hidden = false; document.querySelector('.lower-grid').hidden = false; showReception(); await request('/partida/iniciar', { method: 'POST' }); await refreshGame(); showMessage('Partida iniciada. El reloj ya está corriendo.', true); } catch (error) { showMessage(error.message); } });
document.querySelector('#refresh-game').addEventListener('click', () => refreshGame().catch((error) => showMessage(error.message)));

document.querySelector('#scan-patient').addEventListener('click', async () => {
  try { const patient = latestState?.paciente_actual; if (!patient) return; await request('/partida/accion/escanear-paciente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: patient.id }) }); const windowEl = document.querySelector('#patient-window'); windowEl.classList.remove('camera-flash'); void windowEl.offsetWidth; windowEl.classList.add('camera-flash'); await refreshGame(); showMessage('La cámara reveló la apariencia del paciente.', true); } catch (error) { showMessage(error.message); }
});

document.querySelector('#reject-patient').addEventListener('click', async () => {
  try { const patient = latestState?.paciente_actual; if (!patient) return; document.querySelector('#curtain').classList.add('closing'); await wait(450); const result = await request('/partida/accion/rechazar-paciente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: patient.id }) }); document.querySelector('#curtain').classList.remove('closing'); if (result.game_over) { hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida terminada: tu cordura llegó a cero.'); return; } await refreshGame(); showMessage('Ventanilla cerrada. Siguiente paciente.'); } catch (error) { document.querySelector('#curtain').classList.remove('closing'); showMessage(error.message); }
});

document.querySelector('#confirm-patient').addEventListener('click', () => { if (latestState?.paciente_actual) { showTreatment(latestState.paciente_actual); showMessage('Paciente delegado a la sala de tratamiento.', true); } });

document.querySelector('#treatment-scan').addEventListener('click', async () => {
  try { if (!treatmentPatientId) return; const result = await request('/partida/accion/escanear-paciente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: treatmentPatientId }) }); const patient = result.paciente; document.querySelector('#treatment-screen-content').innerHTML = `<strong>DIAGNÓSTICO: ${patient.nombre}</strong><small>Síntomas: ${patient.condicion}</small><b class="screen-treatment">Necesita: ${patient.tratamiento_requerido}</b>`; document.querySelector('#treatment-panel').hidden = false; const medications = [['💊', 'analgesico'], ['🧪', 'antibiotico'], ['🔍', 'observacion'], ['💧', 'suero'], ['🧴', 'antiparasitario'], ['💉', 'sedante']]; document.querySelector('#medications').innerHTML = medications.map(([icon, name]) => `<label class="med-card"><input type="checkbox" value="${name}"><span class="med-icon">${icon}</span><span>${name}</span></label>`).join(''); showMessage('Diagnóstico listo. Elige el tratamiento indicado.', true); } catch (error) { showMessage(error.message); }
});

document.querySelector('#confirm-treatment').addEventListener('click', async () => {
  try { const medicamentosSeleccionados = [...document.querySelectorAll('#medications input:checked')].map((input) => input.value); const result = await request('/partida/accion/aplicar-tratamiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: treatmentPatientId, medicamentosSeleccionados }) }); if (result.game_over) { hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida terminada: tu cordura llegó a cero.'); return; } patientsHandled += 1; if (result.correcto && shouldTriggerSpecial()) { nextSpecialAt = patientsHandled + 3 + Math.floor(Math.random() * 3); openSpecialRoom(); showMessage('Evento especial: Sala 7.', true); } else { showReception(); await refreshGame(); showMessage(result.correcto ? 'Tratamiento correcto. El paciente fue delegado.' : 'Tratamiento incorrecto. La recepción continúa.', result.correcto); } } catch (error) { showMessage(error.message); }
});

document.querySelector('#back-reception').addEventListener('click', () => { showReception(); refreshGame().catch((error) => showMessage(error.message)); });
document.querySelector('#anomalies').addEventListener('click', async (event) => { const anomalyId = event.target.dataset.taser; if (!anomalyId) return; try { await request('/partida/accion/usar-taser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anomaliaId: Number(anomalyId) }) }); await refreshGame(); } catch (error) { showMessage(error.message); } });
document.querySelector('#finish-game').addEventListener('click', async () => { try { const result = await request('/partida/finalizar', { method: 'POST' }); clearSpecialLoops(); stopGeneralClock(); specialRoomActive = false; hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida guardada en el historial.', true); } catch (error) { showMessage(error.message); } });
document.querySelector('#logout-button').addEventListener('click', () => { clearSpecialLoops(); stopGeneralClock(); specialRoomActive = false; localStorage.removeItem(tokenKey); showLogin(); showMessage('Sesión cerrada.', true); });

const savedToken = localStorage.getItem(tokenKey);
if (savedToken) loadProfile(savedToken).catch((error) => { localStorage.removeItem(tokenKey); showLogin(); showMessage(error.message); });
