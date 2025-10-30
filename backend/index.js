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

// Router de autenticación
const authRouter = require("./routes/auth");

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
const avatarsPath = path.join(baseUploads, "avatars");
[baseUploads, docsPath, videosPath, avatarsPath].forEach((dir) => {
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
    else if (req.body.type === "avatar") cb(null, avatarsPath);
    else cb(null, baseUploads);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ==================
// Middleware de auth (para rutas protegidas)
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
// ⬇️ Montamos el router de autenticación (contiene /auth/register y /auth/login)
app.use("/auth", authRouter);

// ===== Users (controlado por rol) =====
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: "Permiso denegado" });
    }
    next();
  };
}

// Perfil del usuario autenticado (con avatar por defecto en caso de null)
app.get("/users/me", authMiddleware, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT id, email, username, first_name, last_name, role,
              COALESCE(avatar_uri, '/uploads/avatars/default.png') AS avatar_uri,
              (first_name || ' ' || COALESCE(last_name,'')) AS nombre_completo
         FROM user_account
        WHERE id = $1
        LIMIT 1`,
      [req.user.sub]
    );
    if (q.rowCount === 0) return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

// Actualizar mi avatar (se envía avatar_uri que vino del /upload)
app.put("/users/me/avatar", authMiddleware, async (req, res) => {
  try {
    const { avatar_uri } = req.body || {};
    if (!avatar_uri || !avatar_uri.startsWith("/uploads/avatars/")) {
      return res.status(400).json({ ok:false, error:"avatar_uri inválido" });
    }
    await pool.query(
      `UPDATE user_account SET avatar_uri=$1, updated_at=NOW() WHERE id=$2`,
      [avatar_uri, req.user.sub]
    );
    res.json({ ok:true });
  } catch (e) {
    console.error("update my avatar:", e);
    res.status(500).json({ ok:false, error:"Error del servidor" });
  }
});

// Listado paginado (solo admin/superadmin)
app.get("/admin/users", authMiddleware, requireRole("admin","superadmin"), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || "10", 10), 1), 100);
    const offset = (page - 1) * pageSize;

    const listQ = await pool.query(
      `SELECT id, email, username, first_name, last_name, role, created_at
         FROM user_account
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );
    const totalQ = await pool.query(`SELECT COUNT(*)::int AS total FROM user_account`);

    res.json({ ok: true, users: listQ.rows, page, pageSize, total: totalQ.rows[0].total });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:"Error del servidor" });
  }
});

// Actualizar usuario (superadmin) o SOLO contraseña propia (cualquier rol)
app.put("/admin/users/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { email, username, first_name, last_name, role, password } = req.body || {};

  // ¿es superadmin?
  const isSuper = req.user?.role === "superadmin";
  const isSelf  = String(req.user?.sub) === String(id);

  // Si NO es superadmin: solo puede cambiar su propia contraseña
  if (!isSuper) {
    if (!isSelf) return res.status(403).json({ ok:false, error:"Permiso denegado" });
    if (!password) return res.status(400).json({ ok:false, error:"Solo se permite 'password'" });
    if (password.length < 4 || password.length > 64)
      return res.status(400).json({ ok:false, error:"Contraseña inválida" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE user_account SET password_hash=$1, updated_at=NOW() WHERE id=$2`, [hash, id]);
    return res.json({ ok:true });
  }

  // --- superadmin: puede actualizar cualquier campo ---
  try {
    const sets = [], vals = []; let i = 1;
    if (email)      { sets.push(`email=$${i++}`);      vals.push(email.trim().toLowerCase()); }
    if (username)   { sets.push(`username=$${i++}`);   vals.push(username.trim()); }
    if (first_name) { sets.push(`first_name=$${i++}`); vals.push(first_name.trim()); }
    if (last_name)  { sets.push(`last_name=$${i++}`);  vals.push(last_name.trim()); }
    if (role)       { sets.push(`role=$${i++}`);       vals.push(role); }
    if (password)   {
      if (password.length < 4 || password.length > 64)
        return res.status(400).json({ ok:false, error:"Contraseña inválida" });
      sets.push(`password_hash=$${i++}`); vals.push(await bcrypt.hash(password,10));
    }
    if (!sets.length) return res.json({ ok:true });

    vals.push(id);
    const q = await pool.query(
      `UPDATE user_account SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${i} RETURNING id`, vals
    );
    if (q.rowCount === 0) return res.status(404).json({ ok:false, error:"No encontrado" });
    res.json({ ok:true });
  } catch (e) {
    console.error("update user:", e);
    res.status(500).json({ ok:false, error:"Error del servidor" });
  }
});

// Eliminar usuario (solo superadmin)
app.delete("/admin/users/:id", authMiddleware, requireRole("superadmin"), async (req, res) => {
  try {
    const r = await pool.query(`DELETE FROM user_account WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ ok:false, error:"No encontrado" });
    res.json({ ok:true });
  } catch (e) {
    console.error("delete user:", e);
    res.status(500).json({ ok:false, error:"Error del servidor" });
  }
});

// ==================
// Uploads (docs, videos, avatar)
// ==================
app.post("/upload", authMiddleware, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No se envió archivo" });
    }

    const type = req.body.type; // "doc" | "video" | "avatar"
    const webPath =
      type === "doc"
        ? `/uploads/docs/${req.file.filename}`
        : type === "video"
        ? `/uploads/videos/${req.file.filename}`
        : type === "avatar"
        ? `/uploads/avatars/${req.file.filename}`
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
