// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const { pool } = require("./db");
const authRouter = require("./routes/auth");
const coursesRouter = require("./routes/courses");
const authRequired = require("./middleware/auth");

const app = express();

/* ========== CORS + JSON (antes de rutas) ========== */
const allowed = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];
const extra = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const origins = Array.from(new Set([...allowed, ...extra]));

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

/* ========== Logger básico p/diagnóstico ========== */
app.use((req, _res, next) => {
  console.log("[REQ]", req.method, req.url);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/* ========== Asegura carpetas de subida ========== */
const baseUploads = path.join(__dirname, "uploads");
const docsPath = path.join(baseUploads, "docs");
const videosPath = path.join(baseUploads, "videos");
const avatarsPath = path.join(baseUploads, "avatars");
[baseUploads, docsPath, videosPath, avatarsPath].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
app.use("/uploads", express.static(baseUploads));

/* ========== Multer ========== */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const t = (req.body.type || "").toLowerCase();
    if (t === "doc") cb(null, docsPath);
    else if (t === "video") cb(null, videosPath);
    else if (t === "avatar") cb(null, avatarsPath);
    else cb(null, baseUploads);
  },
  filename: (_req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* ========== Auth middleware local (JWT) ========== */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ ok: false, error: "Falta token" });
  const token = authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ ok: false, error: "Token inválido" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res
      .status(401)
      .json({ ok: false, error: "Token no válido o expirado" });
  }
}

/* ========== Healthchecks ========== */
app.get("/ping", (_req, res) => res.json({ ok: true }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ db: "ok" });
  } catch (e) {
    res.status(500).json({ db: "down", error: e.message });
  }
});
app.get("/db-check", async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public';"
    );
    res.json({ ok: true, tables: r.rows[0].tables });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ========== Rutas principales ========== */
app.use("/auth", authRouter); // login/registro

// Buscador público de cursos
app.get("/courses/search", async (req, res) => {
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
  } catch (e) {
    console.error("courses SEARCH:", e);
    res.status(500).json({ ok: false, error: "Error en búsqueda" });
  }
});

// Cursos protegidos
app.use("/courses", authRequired, coursesRouter);

// Usuario actual
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
    if (q.rowCount === 0)
      return res.status(404).json({ ok: false, error: "No encontrado" });
    res.json({ ok: true, user: q.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

/* ========== (Opcional) Actualizar avatar por ruta dedicada ========== */
/* La dejamos por si algún día quieres usarla, pero el flujo actual
   usa sólo POST /upload con type="avatar". */
app.put("/users/me/avatar", authMiddleware, async (req, res) => {
  try {
    const { avatar_uri } = req.body || {};

    if (!avatar_uri || typeof avatar_uri !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "avatar_uri es obligatorio" });
    }

    const cleanPath = String(avatar_uri).trim();

    const r = await pool.query(
      `UPDATE user_account
         SET avatar_uri = $1,
             updated_at = NOW()
       WHERE id = $2`,
      [cleanPath, req.user.sub]
    );

    if (r.rowCount === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Usuario no encontrado" });
    }

    return res.json({ ok: true, avatar_uri: cleanPath });
  } catch (e) {
    console.error("PUT /users/me/avatar", e);
    res
      .status(500)
      .json({ ok: false, error: "Error actualizando foto de perfil" });
  }
});

/* ========== Administración de usuarios ========== */
app.get("/admin/users", authMiddleware, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, q = "" } = req.query;
    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    // No superadmin: devuelve solo su propio usuario
    if ((req.user?.role || "").toLowerCase() !== "superadmin") {
      const me = await pool.query(
        `SELECT id, email, username, role,
                COALESCE(avatar_uri,'/uploads/avatars/default.png') AS avatar_uri,
                COALESCE(NULLIF(first_name,''),'') AS first_name,
                COALESCE(NULLIF(last_name,''),'') AS last_name,
                (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS full_name,
                created_at
           FROM user_account
          WHERE id = $1
          LIMIT 1`,
        [req.user.sub]
      );
      return res.json({
        ok: true,
        users: me.rows,
        total: me.rowCount,
        page: 1,
        pageSize: limit,
      });
    }

    // superadmin: listado con búsqueda/paginación
    const like = `%${q.trim()}%`;
    const where = q
      ? `WHERE email ILIKE $1 OR username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`
      : ``;
    const params = q ? [like, limit, offset] : [limit, offset];

    const list = await pool.query(
      `SELECT id, email, username, role,
              COALESCE(avatar_uri,'/uploads/avatars/default.png') AS avatar_uri,
              COALESCE(NULLIF(first_name,''),'') AS first_name,
              COALESCE(NULLIF(last_name,''),'') AS last_name,
              (COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS full_name,
              created_at
         FROM user_account
         ${q ? where : ""}
         ORDER BY created_at DESC
         LIMIT $${q ? 2 : 1} OFFSET $${q ? 3 : 2};`,
      params
    );
    const cnt = await pool.query(
      `SELECT COUNT(*)::int AS total FROM user_account ${q ? where : ""};`,
      q ? [like] : []
    );

    res.json({
      ok: true,
      users: list.rows,
      total: cnt.rows[0].total,
      page: Number(page),
      pageSize: limit,
    });
  } catch (e) {
    console.error("GET /admin/users", e);
    res.status(500).json({ ok: false, error: "Error listando usuarios" });
  }
});

app.put("/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    const targetId = req.params.id;
    const me = req.user;
    const isSuper = (me.role || "").toLowerCase() === "superadmin";
    const isSelf = me.sub === targetId;

    if (!isSuper && !isSelf)
      return res.status(403).json({ ok: false, error: "Sin permiso" });

    const { email, username, first_name, last_name, role, new_password } =
      req.body || {};
    const updates = [];
    const params = [];

    if (email) {
      params.push(String(email).trim());
      updates.push(`email=$${params.length}`);
    }
    if (username) {
      params.push(String(username).trim());
      updates.push(`username=$${params.length}`);
    }
    if (first_name != null) {
      params.push(String(first_name).trim());
      updates.push(`first_name=$${params.length}`);
    }
    if (last_name != null) {
      params.push(String(last_name).trim());
      updates.push(`last_name=$${params.length}`);
    }

    // solo superadmin cambia rol
    if (role && isSuper) {
      params.push(String(role).trim());
      updates.push(`role=$${params.length}`);
    }

    // Contraseña en TEXTO PLANO (coherente con login/DB actual)
    if (new_password && (isSuper || isSelf)) {
      params.push(String(new_password).trim());
      updates.push(`password_hash=$${params.length}`);
    }

    if (updates.length === 0) return res.json({ ok: true, updated: 0 });

    params.push(targetId);
    const sql = `UPDATE user_account SET ${updates.join(
      ", "
    )}, updated_at=NOW() WHERE id=$${params.length}`;
    const r = await pool.query(sql, params);
    return res.json({ ok: true, updated: r.rowCount });
  } catch (e) {
    console.error("PUT /admin/users/:id", e);
    res.status(500).json({ ok: false, error: "Error actualizando usuario" });
  }
});

app.delete("/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    const me = req.user;
    const isSuper = (me.role || "").toLowerCase() === "superadmin";
    if (!isSuper)
      return res.status(403).json({ ok: false, error: "Solo superadmin" });
    if (req.params.id === me.sub)
      return res.status(400).json({ ok: false, error: "No puedes eliminarte" });

    const r = await pool.query(`DELETE FROM user_account WHERE id=$1`, [
      req.params.id,
    ]);
    res.json({ ok: true, deleted: r.rowCount });
  } catch (e) {
    console.error("DELETE /admin/users/:id", e);
    res.status(500).json({ ok: false, error: "Error eliminando usuario" });
  }
});

/* ========== Subidas ==========
   type: doc | video | avatar | (por defecto: file)
================================ */
app.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ ok: false, error: "No se envió archivo" });
      }

      const type = (req.body.type || "").toLowerCase();

      const webPath =
        type === "doc"
          ? `/uploads/docs/${req.file.filename}`
          : type === "video"
          ? `/uploads/videos/${req.file.filename}`
          : type === "avatar"
          ? `/uploads/avatars/${req.file.filename}`
          : `/uploads/${req.file.filename}`;

      // Si es avatar, también actualizamos user_account.avatar_uri
      if (type === "avatar") {
        try {
          await pool.query(
            `UPDATE user_account
               SET avatar_uri = $1,
                   updated_at = NOW()
             WHERE id = $2`,
            [webPath, req.user.sub]
          );
        } catch (e) {
          console.error("Error actualizando avatar_uri en DB:", e);
          // No rompemos la subida por esto; sólo lo dejamos logueado.
        }
      }

      res.json({
        ok: true,
        file: { name: req.file.filename, type: type || "file", path: webPath },
      });
    } catch (e) {
      console.error("POST /upload", e);
      res.status(500).json({ ok: false, error: "Error al subir archivo" });
    }
  }
);

/* ========== Servidor ========== */
const PORT = Number(process.env.PORT || 8000); // pon PORT=8001 en backend/.env si tu front usa 8001
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
