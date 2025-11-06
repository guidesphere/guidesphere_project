'use strict';
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

module.exports = function authRequired(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const [, token] = h.split(' ');
    if (!token) return res.status(401).json({ ok:false, error:'Auth requerido' });

    const payload = jwt.verify(token, JWT_SECRET);
    // Expone ambas claves para compatibilidad
    const uid = payload.sub || payload.id;
    req.user = { id: uid, sub: uid, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ ok:false, error:'Token inválido' });
  }
};
