const API_URL = window.APP_CONFIG.API_URL;
const tokenKey = 'animal_hospital_anomaly_token';
const loginView = document.querySelector('#login-view');
const profileView = document.querySelector('#profile-view');
const message = document.querySelector('#message');
const welcomeMessage = document.querySelector('#welcome-message');
const startPanel = document.querySelector('#game-start');
const hud = document.querySelector('#game-hud');

function showMessage(text, success = false) { message.textContent = text; message.className = success ? 'success' : ''; }
function showLogin() { loginView.hidden = false; profileView.hidden = true; }
function showProfile(email) { welcomeMessage.textContent = email; loginView.hidden = true; profileView.hidden = false; }
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

function renderState(data) {
  const game = data.partida;
  document.querySelector('#turn-number').textContent = game.turno_actual;
  document.querySelector('#coins').textContent = game.monedas;
  document.querySelector('#sanity').textContent = `${game.cordura ?? 100}/100`;
  document.querySelector('#level').textContent = game.nivel;
  document.querySelector('#game-status').textContent = game.estado;
  const patient = data.paciente_actual;
  document.querySelector('#patients').innerHTML = patient ? `<article class="patient-card ${patient.es_anomalia ? 'distorted' : ''}"><div class="animal-avatar">${patient.es_anomalia ? '👾' : '🐶'}</div><strong>${patient.nombre}</strong><span class="symptoms">${patient.detectado ? `Síntomas observados: ${patient.condicion}` : 'Usa la cámara para revisar sus síntomas'}</span><span class="state">${patient.estado.replace('_', ' ')}</span>${patient.detectado ? `<small>${patient.es_anomalia ? '⚠ Anomalía detectada: no administrar medicamentos' : '✓ Paciente real: consulta la guía médica'}</small>` : ''}</article>` : '<p class="muted">No quedan pacientes. La recepción está tranquila.</p>';
  document.querySelector('#scan-patient').disabled = !patient || Boolean(patient.detectado);
  document.querySelector('#confirm-patient').disabled = !patient || !patient.detectado || Boolean(patient.es_anomalia);
  document.querySelector('#reject-patient').disabled = !patient || !patient.detectado;
  document.querySelector('#treatment-panel').hidden = true;
  document.querySelector('#anomalies').innerHTML = data.anomalias.length ? data.anomalias.map((item) => `<div class="alert-card"><strong>⚠ ${item.tipo}</strong><span>Turno ${item.turno_en_que_aparecio}</span><button type="button" data-taser="${item.id}" class="small-button">Usar táser</button></div>`).join('') : '<p class="muted">No hay anomalías activas.</p>';
  hud.hidden = false;
  startPanel.hidden = Boolean(patient);
  document.querySelector('#start-game-button').textContent = patient ? 'Comenzar partida' : 'Nueva partida';
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
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No fue posible iniciar sesión.');
    localStorage.setItem(tokenKey, data.token);
    await loadProfile(data.token);
    showMessage('', true);
  } catch (error) { showMessage(error.message); }
});

document.querySelector('#start-game-button').addEventListener('click', async () => { try { await request('/partida/iniciar', { method: 'POST' }); await refreshGame(); showMessage('Partida iniciada.', true); } catch (error) { showMessage(error.message); } });
document.querySelector('#refresh-game').addEventListener('click', () => refreshGame().catch((error) => showMessage(error.message)));

document.querySelector('#scan-patient').addEventListener('click', async () => {
  try { const state = await request('/partida/estado'); const patient = state.paciente_actual; await request('/partida/accion/escanear-paciente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: patient.id }) }); await refreshGame(); showMessage('La cámara terminó el escaneo.', true); } catch (error) { showMessage(error.message); }
});

document.querySelector('#reject-patient').addEventListener('click', async () => {
  try { const state = await request('/partida/estado'); const result = await request('/partida/accion/rechazar-paciente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: state.paciente_actual.id }) }); if (result.game_over) { hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida terminada: tu cordura llegó a cero.'); return; } await refreshGame(); showMessage('Paciente rechazado.'); } catch (error) { showMessage(error.message); }
});

document.querySelector('#confirm-patient').addEventListener('click', () => {
  const panel = document.querySelector('#treatment-panel');
  panel.hidden = false;
  const medications = [['💊', 'analgesico'], ['🧪', 'antibiotico'], ['🔍', 'observacion'], ['💧', 'suero'], ['🧴', 'antiparasitario'], ['💉', 'sedante']];
  document.querySelector('#medications').innerHTML = medications.map(([icon, name]) => `<label class="med-card"><input type="checkbox" value="${name}"><span class="med-icon">${icon}</span><span>${name}</span></label>`).join('');
});

document.querySelector('#confirm-treatment').addEventListener('click', async () => {
  try { const state = await request('/partida/estado'); const medicamentosSeleccionados = [...document.querySelectorAll('#medications input:checked')].map((input) => input.value); const result = await request('/partida/accion/aplicar-tratamiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pacienteId: state.paciente_actual.id, medicamentosSeleccionados }) }); if (result.game_over) { hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida terminada: tu cordura llegó a cero.'); return; } await refreshGame(); showMessage('Tratamiento enviado al backend.', true); } catch (error) { showMessage(error.message); }
});

document.querySelector('#anomalies').addEventListener('click', async (event) => { const anomalyId = event.target.dataset.taser; if (!anomalyId) return; try { await request('/partida/accion/usar-taser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anomaliaId: Number(anomalyId) }) }); await refreshGame(); } catch (error) { showMessage(error.message); } });
document.querySelector('#finish-game').addEventListener('click', async () => { try { const result = await request('/partida/finalizar', { method: 'POST' }); hud.hidden = true; startPanel.hidden = false; showReport(result.reporte); document.querySelector('#start-game-button').textContent = 'Nueva partida'; showMessage('Partida guardada en el historial.', true); } catch (error) { showMessage(error.message); } });
document.querySelector('#logout-button').addEventListener('click', () => { localStorage.removeItem(tokenKey); showLogin(); showMessage('Sesión cerrada.', true); });

const savedToken = localStorage.getItem(tokenKey);
if (savedToken) loadProfile(savedToken).catch((error) => { localStorage.removeItem(tokenKey); showLogin(); showMessage(error.message); });
