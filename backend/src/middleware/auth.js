const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Se requiere un token Bearer válido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.sub) return res.status(401).json({ error: 'Token inválido.' });
    req.user = { id: payload.sub };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token inválido o vencido.' });
  }
}

module.exports = { requireAuth };
