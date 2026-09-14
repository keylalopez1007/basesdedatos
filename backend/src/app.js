const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const turnRoutes = require('./routes/turnRoutes');
const gameRoutes = require('./routes/gameRoutes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    console.error(`Database health check failed: ${error.code || 'UNKNOWN'}`);
    return res.status(503).json({ status: 'error', db: 'disconnected', error: 'No se pudo conectar a MySQL.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/turnos', turnRoutes);
app.use('/api/partida', gameRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ error: process.env.NODE_ENV === 'development' ? (error.message || 'Error interno del servidor.') : 'Ocurrió un error interno del servidor.' });
});

module.exports = app;
