// backend/index.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { pool } = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ==================
// Asegura carpetas
// ==================
const baseUploads = path.join(__dirname, "uploads");
const docsPath = path.join(baseUploads, "docs");
const videosPath = path.join(baseUploads, "videos");

[baseUploads, docsPath, videosPath].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Servir estático los archivos subidos
app.use("/uploads", express.static(baseUploads));

// ==================
// Configuración de multer
// ==================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.body.type === "doc") cb(null, docsPath);
    else if (req.body.type === "video") cb(null, videosPath);
    else cb(null, baseUploads);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ==================
// Middleware de auth
// ==================
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ ok: false, error: "Falta token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ ok: false, error: "Token inválido" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { sub, role }
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Token no válido o expirado" });
  }
}

// ==================
// Rutas básicas
// ==================
app.get("/ping", (req, res) => res.json({ ok: true }));

app.get("/db-check", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public';"
    );
    res.json({ ok: true, tables: r.rows[0].tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Healthchecks
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/db", async (_req, res) => {
  try { await pool.query("SELECT 1"); return res.json({ db: "ok" }); }
  catch (e) { return res.status(500).json({ db: "down", error: e.message }); }
});

// ==================
// Auth
// ==================
app.post("/auth/register", async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;
    if (!fullName || !email || !username || !password) {
      return res.status(400).json({ ok: false, error: "Faltan campos" });
    }
    if (password.length < 4 || password.length > 8) {
      return res.status(400).json({ ok: false, error: "Contraseña 4–8 caracteres" });
    }

    const parts = fullName.trim().split(/\s+/);
    const first_name = parts[0];
    const last_name = parts.slice(1).join(" ");

    const dup = await pool.query(
      `SELECT 1 FROM user_account WHERE email = $1 OR username = $2 LIMIT 1`,
      [email, username]
    );
    if (dup.rowCount > 0) {
      return res.status(409).json({ ok: false, error: "Email o usuario ya existen" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const ins = await pool.query(
      `INSERT INTO user_account (email, username, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [email, username, password_hash, first_name, last_name]
    );

    return res.json({ ok: true, id: ins.rows[0].id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, error: "Faltan campos" });

    const q = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, password_hash
       FROM user_account WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (q.rowCount === 0)
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });

    const u = q.rows[0];
    const ok = await bcrypt.compare(password, u.password_hash || "");
    if (!ok)
      return res.status(401).json({ ok: false, error: "Credenciales inválidas" });

    const name =
      `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || u.email;
    const token = jwt.sign({ sub: u.id, role: u.role }, JWT_SECRET, {
      expiresIn: "12h",
    });

    return res.json({
      token,
      user: { id: u.id, name, email: u.email, role: u.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// ==================
// Uploads
// ==================
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No se envió archivo" });
    }

    const type = req.body.type; // "doc" | "video"
    const webPath =
      type === "doc"
        ? `/uploads/docs/${req.file.filename}`
        : type === "video"
        ? `/uploads/videos/${req.file.filename}`
        : `/uploads/${req.file.filename}`;

    res.json({
      ok: true,
      file: {
        name: req.file.filename,
        type: type || "file",
        path: webPath,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Error al subir archivo" });
  }
});

// ==================
// Cursos (crea curso + guarda docs/videos en DB)
// ==================
app.post("/courses", authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, description, passing_score, documents = [], videos = [] } =
      req.body;

    if (!title || !description) {
      return res.status(400).json({ ok: false, error: "Faltan campos obligatorios" });
    }

    await client.query("BEGIN");

    // 1) Curso
    const courseRes = await client.query(
      `INSERT INTO course (title, description, passing_score, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, passing_score, created_by, created_at`,
      [title, description, passing_score || 70, req.user.sub]
    );
    const course = courseRes.rows[0];

    // 2) Documentos -> content_item + document_asset
    for (const uri of documents) {
      const ci = await client.query(
        `INSERT INTO content_item (course_id, type, title, created_by)
         VALUES ($1, 'document', $2, $3)
         RETURNING id`,
        [course.id, "Documento", req.user.sub]
      );
      await client.query(
        `INSERT INTO document_asset (content_id, source, uri)
         VALUES ($1, 'upload', $2)`,
        [ci.rows[0].id, uri]
      );
    }

    // 3) Videos -> content_item + media_asset
    for (const uri of videos) {
      const ci = await client.query(
        `INSERT INTO content_item (course_id, type, title, created_by)
         VALUES ($1, 'video', $2, $3)
         RETURNING id`,
        [course.id, "Video", req.user.sub]
      );
      await client.query(
        `INSERT INTO media_asset (content_id, source, uri)
         VALUES ($1, 'upload', $2)`,
        [ci.rows[0].id, uri]
      );
    }

    await client.query("COMMIT");
    return res.json({ ok: true, course });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creando curso con assets:", err);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  } finally {
    client.release();
  }
});

// ==================
// Buscar cursos por título o descripción
// ==================
app.get("/courses/search", authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ ok: true, results: [] });

    const r = await pool.query(
      `SELECT id, title, description, created_at
         FROM course
        WHERE title ILIKE $1 OR description ILIKE $1
        ORDER BY created_at DESC
        LIMIT 50`,
      [`%${q}%`]
    );

    res.json({ ok: true, results: r.rows });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ ok: false, error: "Error en búsqueda" });
  }
});

// ==================
// Panel del curso (curso + documentos + videos) - con filename visible
// ==================
app.get("/courses/:id/overview", authMiddleware, async (req, res) => {
  const courseId = req.params.id;
  try {
    const courseQ = await pool.query(
      `SELECT id, title, description, passing_score, created_by, created_at
         FROM course
        WHERE id = $1
        LIMIT 1`,
      [courseId]
    );
    if (courseQ.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Curso no encontrado" });
    }
    const course = courseQ.rows[0];

    // === Documentos ===
    const docsQ = await pool.query(
      `SELECT ci.id AS content_id,
              ci.title AS item_title,
              COALESCE(da.uri,'') AS uri
         FROM content_item ci
         LEFT JOIN document_asset da ON da.content_id = ci.id
        WHERE ci.course_id = $1 AND ci.type = 'document'
        ORDER BY ci.position NULLS LAST, ci.created_at`,
      [courseId]
    );

    // === Videos ===
    const vidsQ = await pool.query(
      `SELECT ci.id AS content_id,
              ci.title AS item_title,
              COALESCE(ma.uri,'') AS uri,
              COALESCE(ma.duration_sec,0) AS duration_sec
         FROM content_item ci
         LEFT JOIN media_asset ma ON ma.content_id = ci.id
        WHERE ci.course_id = $1 AND ci.type = 'video'
        ORDER BY ci.position NULLS LAST, ci.created_at`,
      [courseId]
    );

    // Añadir filename a partir de uri
    const extractFilename = (uri) => {
      if (!uri) return "";
      const parts = uri.split("/");
      return parts[parts.length - 1] || "";
    };

    const documents = docsQ.rows.map(r => ({
      content_id: r.content_id,
      title: r.item_title || extractFilename(r.uri) || "Documento",
      filename: extractFilename(r.uri),
      uri: r.uri,
      progress_percent: 0,
      status: "pending",
    }));

    const videos = vidsQ.rows.map(r => ({
      content_id: r.content_id,
      title: r.item_title || extractFilename(r.uri) || "Video",
      filename: extractFilename(r.uri),
      uri: r.uri,
      duration_sec: r.duration_sec,
      progress_percent: 0,
      status: "pending",
    }));

    return res.json({
      ok: true,
      course,
      documents,
      videos,
      course_status: "in_progress",
      course_progress_percent: 0,
    });
  } catch (err) {
    console.error("overview error:", err);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// ==================
// Servidor
// ==================
app.listen(8000, () => {
  console.log("Backend corriendo en http://localhost:8000");
});
