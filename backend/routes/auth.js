// backend/routes/auth.js
'use strict';
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (s) => (s || '').trim();

/**
 * POST /auth/register
 * Crea usuario con rol 'student' y avatar por defecto (password sin hash)
 */
router.post('/register', async (req, res) => {
  try {
    const { nombre_completo, email, username, password } = req.body || {};
    const fullName = norm(nombre_completo);
    const mail = norm(email).toLowerCase();
    const user = norm(username);

    if (!fullName || !mail || !user || !password) {
      return res.status(400).json({ ok: false, error: 'Faltan campos' });
    }
    if (!emailRegex.test(mail)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }
    if (password.length < 4 || password.length > 8) {
      return res.status(400).json({ ok: false, error: 'Contraseña 4–8 caracteres' });
    }

    const parts = fullName.split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ');

    // Duplicados
    const dup = await pool.query(
      `SELECT 1 FROM public.user_account WHERE email = $1 OR username = $2 LIMIT 1`,
      [mail, user]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ ok: false, error: 'Email o usuario ya existen' });
    }

    // Guardar password en texto plano (sin hash)
    const password_hash = password;

    const DEFAULT_AVATAR = '/uploads/avatars/default.png';
    const ins = await pool.query(
      `INSERT INTO public.user_account
         (email, username, password_hash, first_name, last_name, role, is_active, avatar_uri, created_at, updated_at)
       VALUES
         ($1,    $2,       $3,            $4,         $5,       'student', true,     $6,         NOW(),     NOW())
       RETURNING id`,
      [mail, user, password_hash, first_name, last_name, DEFAULT_AVATAR]
    );

    return res.status(201).json({ ok: true, id: ins.rows[0].id });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Faltan campos' });
    }

    const mail = email.trim().toLowerCase();
    const q = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, avatar_uri, password_hash
         FROM public.user_account
        WHERE email = $1
        LIMIT 1`,
      [mail]
    );
    if (q.rowCount === 0) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const u = q.rows[0];
    const ok = password === (u.password_hash || '');
    if (!ok) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email;
    const token = jwt.sign({ sub: u.id, role: u.role }, JWT_SECRET, { expiresIn: '12h' });

    const DEFAULT_AVATAR = '/uploads/avatars/default.png';
    return res.json({
      ok: true,
      token,
      user: {
        id: u.id,
        name,
        email: u.email,
        role: u.role,
        avatar_uri: u.avatar_uri || DEFAULT_AVATAR,
      }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ ok: false, error: 'Error del servidor' });
  }
});

module.exports = router;
