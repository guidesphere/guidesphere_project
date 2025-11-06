// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { pool } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/* Utilidad para armar el objeto user que enviamos al frontend */
function mapUserRow(u) {
  return {
    id: u.id,
    name: [u.first_name || "", u.last_name || ""].filter(Boolean).join(" ").trim(),
    email: u.email,
    role: u.role,
    avatar_uri: u.avatar_uri || "/uploads/avatars/default.png",
  };
}

/* =========================
   POST /auth/login
   - Contraseñas en TEXTO PLANO: compara password vs password_hash
   ========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Faltan campos" });
    }

    const q = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, password_hash,
              COALESCE(avatar_uri,'/uploads/avatars/default.png') AS avatar_uri
         FROM user_account
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [String(email).trim().toLowerCase()]
    );

    if (q.rowCount === 0) {
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
    }

    const u = q.rows[0];

    // TEXTO PLANO: comparar directamente
    if (String(u.password_hash || "") !== String(password)) {
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { sub: u.id, role: u.role },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ ok: true, token, user: mapUserRow(u) });
  } catch (e) {
    console.error("POST /auth/login", e);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

/* =========================
   POST /auth/register
   - Guarda password EN PLANO en password_hash
   - Rol por defecto: student
   ========================= */
router.post("/register", async (req, res) => {
  try {
    const {
      nombre_completo,   // preferido (ES)
      fullName,          // alterno (EN)
      email,
      username,
      password,
      role               // ignorado si no eres superadmin (registro público)
    } = req.body || {};

    if (!email || !username || !password) {
      return res.status(400).json({ ok: false, error: "Faltan campos" });
    }

    // Nombre: acepta nombre_completo o fullName y separa en first/last
    const rawFull = String(nombre_completo || fullName || "").trim();
    let first_name = "", last_name = "";
    if (rawFull) {
      const parts = rawFull.split(" ").filter(Boolean);
      first_name = parts.shift() || "";
      last_name  = parts.join(" ");
    }

    const emailNorm = String(email).trim().toLowerCase();
    const usernameNorm = String(username).trim();

    // Inserta con texto plano en password_hash
    const r = await pool.query(
      `INSERT INTO user_account (email, username, first_name, last_name, role, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [
        emailNorm,
        usernameNorm,
        first_name,
        last_name,
        "student",
        String(password).trim()
      ]
    );

    return res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    // Manejo amable de violación de unicidad (email/username únicos)
    if (e && e.code === "23505") {
      const msg = (e.detail || "").includes("(email)")
        ? "El email ya está registrado"
        : ( (e.detail || "").includes("(username)") ? "El username ya está en uso" : "Dato duplicado" );
      return res.status(409).json({ ok: false, error: msg });
    }
    console.error("POST /auth/register", e);
    return res.status(500).json({ ok: false, error: "Error registrando usuario" });
  }
});

module.exports = router;
