const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 12;

function normalizeCredentials(body = {}) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  return { email, password };
}

function validateCredentials(email, password) {
  if (!EMAIL_PATTERN.test(email)) return 'Ingrese un correo electrónico válido.';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  return null;
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
}

async function register(req, res, next) {
  try {
    const { email, password } = normalizeCredentials(req.body);
    const validationError = validateCredentials(email, password);
    if (validationError) return res.status(400).json({ error: validationError });

    const [existing] = await pool.execute('SELECT id FROM Usuario WHERE email = ? LIMIT 1', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'El correo ya está registrado.' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      'INSERT INTO Usuario (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );
    const [users] = await pool.execute(
      'SELECT id, email, created_at FROM Usuario WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({ user: users[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El correo ya está registrado.' });
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = normalizeCredentials(req.body);
    const validationError = validateCredentials(email, password);
    if (validationError) return res.status(400).json({ error: validationError });

    const [users] = await pool.execute(
      'SELECT id, email, password_hash FROM Usuario WHERE email = ? LIMIT 1',
      [email]
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    return res.status(200).json({ token: createToken(user.id) });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, created_at FROM Usuario WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (!users[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
    return res.status(200).json({ user: users[0] });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me };
