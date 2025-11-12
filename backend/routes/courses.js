// backend/routes/courses.js
const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const authRequired = require("../middleware/auth");

/* ==========================
   📚 LISTAR CURSOS
   ========================== */
router.get("/", authRequired, async (req, res) => {
  try {
    const user = req.user;
    const role = (user.role || "").toLowerCase();
    const scope = (req.query.scope || "").toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(
      1,
      Math.min(100, Number(req.query.pageSize) || 10)
    );
    const offset = (page - 1) * pageSize;
    const q = (req.query.q || "").trim();
    const like = `%${q}%`;

    let list, cnt;

    // 🧩 subqueries reutilizables para stats (recursos y rating)
    const joinStats = `
      LEFT JOIN (
        SELECT course_id, COUNT(*) AS resources_count
        FROM content_item
        GROUP BY course_id
      ) ci ON ci.course_id = c.id
      LEFT JOIN (
        SELECT course_id,
               AVG(rating)::float AS rating_avg,
               COUNT(*)::int     AS ratings_count
        FROM course_rating
        GROUP BY course_id
      ) cr ON cr.course_id = c.id
    `;

    const durationCase = `
      CASE
        WHEN COALESCE(ci.resources_count, 0) = 0 THEN 'Sin contenidos'
        WHEN ci.resources_count <= 3 THEN 'Corto (≈1 h)'
        WHEN ci.resources_count <= 7 THEN 'Medio (≈3 h)'
        ELSE 'Largo (≈6 h+)'
      END AS estimated_duration
    `;

    // 🧑‍💼 Superadmin -> todos los cursos
    if (scope === "all" && role === "superadmin") {
      list = await pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.description,
          c.is_published,
          c.created_at,
          c.updated_at,
          u.username AS owner_username,
          ci.resources_count,
          ${durationCase},
          cr.rating_avg,
          cr.ratings_count
        FROM course c
        LEFT JOIN user_account u ON u.id = c.created_by
        ${joinStats}
        WHERE ($1 = '' OR c.title ILIKE $2 OR c.description ILIKE $2)
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4;
        `,
        [q, like, pageSize, offset]
      );
      cnt = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM course
        WHERE ($1 = '' OR title ILIKE $2 OR description ILIKE $2);
        `,
        [q, like]
      );
    }

    // 👤 Mis cursos creados
    else if (scope === "mine") {
      list = await pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.description,
          c.is_published,
          c.created_at,
          c.updated_at,
          u.username AS owner_username,
          ci.resources_count,
          ${durationCase},
          cr.rating_avg,
          cr.ratings_count
        FROM course c
        LEFT JOIN user_account u ON u.id = c.created_by
        ${joinStats}
        WHERE c.created_by = $1
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3;
        `,
        [user.sub, pageSize, offset]
      );
      cnt = await pool.query(
        `SELECT COUNT(*)::int AS total FROM course WHERE created_by = $1;`,
        [user.sub]
      );
    }

    // 🌎 Cursos publicados (públicos)
    else if (scope === "public") {
      list = await pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.description,
          c.is_published,
          c.created_at,
          c.updated_at,
          u.username AS owner_username,
          ci.resources_count,
          ${durationCase},
          cr.rating_avg,
          cr.ratings_count
        FROM course c
        LEFT JOIN user_account u ON u.id = c.created_by
        ${joinStats}
        WHERE c.is_published = true
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [pageSize, offset]
      );
      cnt = await pool.query(
        `SELECT COUNT(*)::int AS total FROM course WHERE is_published = true;`
      );
    }

    // 🎓 Cursos donde el usuario está inscrito
    else if (scope === "enrolled") {
      list = await pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.description,
          c.is_published,
          c.created_at,
          c.updated_at,
          u.username AS owner_username,
          ci.resources_count,
          ${durationCase},
          cr.rating_avg,
          cr.ratings_count
        FROM enrollment e
        JOIN course c ON c.id = e.course_id
        LEFT JOIN user_account u ON u.id = c.created_by
        ${joinStats}
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC
        LIMIT $2 OFFSET $3;
        `,
        [user.sub, pageSize, offset]
      );
      cnt = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM enrollment e
        WHERE e.user_id = $1;
        `,
        [user.sub]
      );
    } else {
      return res.status(400).json({ ok: false, error: "Scope inválido" });
    }

    return res.json({
      ok: true,
      courses: list.rows,
      total: cnt.rows[0].total,
      page,
      pageSize,
    });
  } catch (e) {
    console.error("GET /courses", e);
    res.status(500).json({ ok: false, error: "Error listando cursos" });
  }
});

/* Helper para título desde URI */
function inferTitle(uri, explicitTitle, fallback) {
  const clean = (explicitTitle || "").trim();
  if (clean) return clean;
  if (uri) {
    const parts = String(uri).split("/");
    const last = parts[parts.length - 1] || "";
    return last || fallback;
  }
  return fallback;
}

/* ==========================
   ➕ CREAR CURSO (curso + videos + docs)
   ========================== */
router.post("/", authRequired, async (req, res) => {
  try {
    const {
      title,
      description,
      passing_score,
      documents = [],
      videos = [],
    } = req.body;
    const created_by = req.user.sub;

    await pool.query("BEGIN");

    const r = await pool.query(
      `INSERT INTO course (title, description, passing_score, created_by)
       VALUES ($1,$2,$3,$4)
       RETURNING id, title, description, is_published, created_at;`,
      [title, description, passing_score || 70, created_by]
    );
    const course = r.rows[0];
    let position = 1;

    // Documentos
    for (const doc of documents || []) {
      const uri =
        typeof doc === "string" ? doc : doc && doc.uri ? doc.uri : "";
      if (!uri) continue;

      const titleDoc = inferTitle(
        uri,
        typeof doc === "object" ? doc.title : "",
        "Documento"
      );

      const ci = await pool.query(
        `INSERT INTO content_item
           (course_id, type, title, description, "position", duration_sec, created_by)
         VALUES ($1,'document',$2,NULL,$3,NULL,$4)
         RETURNING id;`,
        [course.id, titleDoc, position++, created_by]
      );
      const contentId = ci.rows[0].id;

      await pool.query(
        `INSERT INTO document_asset (content_id, source, uri)
         VALUES ($1,'upload',$2);`,
        [contentId, uri]
      );
    }

    // Videos
    for (const vid of videos || []) {
      const uri =
        typeof vid === "string" ? vid : vid && vid.uri ? vid.uri : "";
      if (!uri) continue;

      const titleVid = inferTitle(
        uri,
        typeof vid === "object" ? vid.title : "",
        "Video"
      );

      const ci = await pool.query(
        `INSERT INTO content_item
           (course_id, type, title, description, "position", duration_sec, created_by)
         VALUES ($1,'video',$2,NULL,$3,NULL,$4)
         RETURNING id;`,
        [course.id, titleVid, position++, created_by]
      );
      const contentId = ci.rows[0].id;

      await pool.query(
        `INSERT INTO media_asset (content_id, source, uri, duration_sec)
         VALUES ($1,'upload',$2,0);`,
        [contentId, uri]
      );
    }

    await pool.query("COMMIT");
    res.json({ ok: true, course });
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("POST /courses", e);
    res.status(500).json({ ok: false, error: "Error creando curso" });
  }
});

/* ==========================
   ✏️ ACTUALIZAR CURSO (metadatos + videos + docs)
   ========================== */
router.put("/:id", authRequired, async (req, res) => {
  const courseId = req.params.id;
  const user = req.user;
  const isSuper = (user.role || "").toLowerCase() === "superadmin";

  const {
    title,
    description,
    passing_score,
    documents = [],
    videos = [],
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res
      .status(400)
      .json({ ok: false, error: "El título del curso es obligatorio" });
  }

  try {
    await pool.query("BEGIN");

    // 1) Verificar que el curso exista y que el usuario tenga permisos
    const c = await pool.query(
      `SELECT id, created_by
         FROM course
        WHERE id = $1
        LIMIT 1`,
      [courseId]
    );

    if (c.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res
        .status(404)
        .json({ ok: false, error: "Curso no encontrado" });
    }

    const ownerId = c.rows[0].created_by;
    if (ownerId !== user.sub && !isSuper) {
      await pool.query("ROLLBACK");
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para editar este curso",
      });
    }

    // 2) Actualizar metadatos del curso
    const passScore = Number(passing_score || 0);

    await pool.query(
      `UPDATE course
          SET title = $1,
              description = $2,
              passing_score = $3,
              updated_at = NOW()
        WHERE id = $4`,
      [String(title).trim(), description || null, passScore, courseId]
    );

    // 3) Limpiar contenidos anteriores (documentos y videos)
    await pool.query(
      `DELETE FROM document_asset
        WHERE content_id IN (
          SELECT id FROM content_item
           WHERE course_id = $1 AND type = 'document'
        );`,
      [courseId]
    );

    await pool.query(
      `DELETE FROM media_asset
        WHERE content_id IN (
          SELECT id FROM content_item
           WHERE course_id = $1 AND type = 'video'
        );`,
      [courseId]
    );

    await pool.query(
      `DELETE FROM content_item
        WHERE course_id = $1;`,
      [courseId]
    );

    // 4) Volver a insertar documentos y videos según el payload nuevo
    let position = 1;
    const created_by = user.sub;

    // Documentos
    for (const doc of documents || []) {
      const uri =
        typeof doc === "string" ? doc : doc && doc.uri ? doc.uri : "";
      if (!uri) continue;

      const titleDoc = inferTitle(
        uri,
        typeof doc === "object" ? doc.title : "",
        "Documento"
      );

      const ci = await pool.query(
        `INSERT INTO content_item
           (course_id, type, title, description, "position", duration_sec, created_by)
         VALUES ($1,'document',$2,NULL,$3,NULL,$4)
         RETURNING id;`,
        [courseId, titleDoc, position++, created_by]
      );
      const contentId = ci.rows[0].id;

      await pool.query(
        `INSERT INTO document_asset (content_id, source, uri)
         VALUES ($1,'upload',$2);`,
        [contentId, uri]
      );
    }

    // Videos
    for (const vid of videos || []) {
      const uri =
        typeof vid === "string" ? vid : vid && vid.uri ? vid.uri : "";
      if (!uri) continue;

      const titleVid = inferTitle(
        uri,
        typeof vid === "object" ? vid.title : "",
        "Video"
      );

      const ci = await pool.query(
        `INSERT INTO content_item
           (course_id, type, title, description, "position", duration_sec, created_by)
         VALUES ($1,'video',$2,NULL,$3,NULL,$4)
         RETURNING id;`,
        [courseId, titleVid, position++, created_by]
      );
      const contentId = ci.rows[0].id;

      await pool.query(
        `INSERT INTO media_asset (content_id, source, uri, duration_sec)
         VALUES ($1,'upload',$2,0);`,
        [contentId, uri]
      );
    }

    await pool.query("COMMIT");
    return res.json({ ok: true, id: courseId });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("PUT /courses/:id", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error actualizando curso" });
  }
});

/* ==========================
   🟢 PUBLICAR / DESPUBLICAR
   ========================== */
router.patch("/:id/publish", authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    const publish = !!req.body.publish;
    const user = req.user;
    const isSuper = (user.role || "").toLowerCase() === "superadmin";

    const r = await pool.query(
      `UPDATE course
          SET is_published=$1, updated_at=NOW()
        WHERE id=$2 AND (created_by=$3 OR $4=true)
        RETURNING id;`,
      [publish, id, user.sub, isSuper]
    );

    res.json({ ok: true, updated: r.rowCount });
  } catch (e) {
    console.error("PATCH /courses/:id/publish", e);
    res.status(500).json({ ok: false, error: "Error publicando curso" });
  }
});

/* ==========================
   📋 OVERVIEW DEL CURSO (curso + documentos + videos + progreso usuario)
   ========================== */
router.get("/:id/overview", authRequired, async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.sub;

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

    // Progreso del usuario actual en este curso
    const progQ = await pool.query(
      `SELECT progress, last_video_sec, meta
         FROM course_progress
        WHERE user_id = $1 AND course_id = $2
        LIMIT 1`,
      [userId, courseId]
    );

    let courseProgress = 0;
    let courseStatus = "not_started";
    let meta = {};

    if (progQ.rowCount > 0) {
      const row = progQ.rows[0];
      courseProgress = row.progress || 0;
      meta = row.meta || {};

      if (courseProgress <= 0) {
        courseStatus = "not_started";
      } else if (courseProgress >= 100) {
        courseStatus = "completed";
      } else {
        courseStatus = "in_progress";
      }
    }

    const itemsMeta = (meta && meta.items) || {};

    const extractFilename = (uri) => {
      if (!uri) return "";
      const parts = uri.split("/");
      return parts[parts.length - 1] || "";
    };

    const documents = docsQ.rows.map((r) => {
      const key = String(r.content_id);
      const itemMeta = itemsMeta[key] || {};
      return {
        id: r.content_id,
        title: r.item_title || extractFilename(r.uri) || "Documento",
        filename: extractFilename(r.uri),
        uri: r.uri,
        progress_percent:
          itemMeta.progress_percent !== undefined
            ? itemMeta.progress_percent
            : 0,
        status: itemMeta.status || "pending",
      };
    });

    const videos = vidsQ.rows.map((r) => {
      const key = String(r.content_id);
      const itemMeta = itemsMeta[key] || {};
      return {
        id: r.content_id,
        title: r.item_title || extractFilename(r.uri) || "Video",
        filename: extractFilename(r.uri),
        uri: r.uri,
        duration_sec: r.duration_sec,
        progress_percent:
          itemMeta.progress_percent !== undefined
            ? itemMeta.progress_percent
            : 0,
        status: itemMeta.status || "pending",
        last_sec: itemMeta.last_sec || 0,
      };
    });

    return res.json({
      ok: true,
      course,
      documents,
      videos,
      course_status: courseStatus,
      course_progress_percent: courseProgress,
      last_video_sec: progQ.rowCount > 0 ? progQ.rows[0].last_video_sec : 0,
      meta,
    });
  } catch (err) {
    console.error("overview error:", err);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
});

/* ==========================
   💾 GUARDAR Y OBTENER PROGRESO DE CURSO
   ========================== */

// Obtener progreso del usuario actual en un curso
router.get("/:id/progress/me", authRequired, async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.sub;
  try {
    const q = await pool.query(
      `SELECT progress, last_video_sec, meta
         FROM course_progress
        WHERE user_id = $1 AND course_id = $2
        LIMIT 1`,
      [userId, courseId]
    );

    if (q.rowCount === 0) {
      return res.json({
        ok: true,
        progress: 0,
        last_video_sec: 0,
        meta: {},
      });
    }

    const row = q.rows[0];
    res.json({
      ok: true,
      progress: row.progress,
      last_video_sec: row.last_video_sec,
      meta: row.meta || {},
    });
  } catch (err) {
    console.error("GET /courses/:id/progress/me", err);
    res.status(500).json({ ok: false, error: "Error al obtener progreso" });
  }
});

// Guardar o actualizar progreso del usuario actual
router.put("/:id/progress/me", authRequired, async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.sub;
  const { progress = 0, last_video_sec = 0, meta = {} } = req.body || {};

  try {
    await pool.query(
      `INSERT INTO course_progress (user_id, course_id, progress, last_video_sec, meta, updated_at)
       VALUES ($1,$2,$3,$4,$5,now())
       ON CONFLICT (user_id, course_id)
       DO UPDATE SET progress = EXCLUDED.progress,
                     last_video_sec = EXCLUDED.last_video_sec,
                     meta = EXCLUDED.meta,
                     updated_at = now();`,
      [userId, courseId, progress, last_video_sec, meta]
    );

    res.json({ ok: true, saved: true });
  } catch (err) {
    console.error("PUT /courses/:id/progress/me", err);
    res.status(500).json({ ok: false, error: "Error al guardar progreso" });
  }
});

/* ==========================
   🎓 INSCRIBIR USUARIO EN CURSO
   ========================== */
router.post("/:id/enroll", authRequired, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.sub;

    await pool.query(
      `INSERT INTO enrollment(course_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (course_id, user_id) DO NOTHING;`,
      [courseId, userId]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /courses/:id/enroll", e);
    res.status(500).json({ ok: false, error: "Error al inscribir" });
  }
});

/* ==========================
   🗑️ ELIMINAR CURSO (y contenidos relacionados)
   ========================== */
router.delete("/:id", authRequired, async (req, res) => {
  const courseId = req.params.id;
  const user = req.user;
  const isSuper = (user.role || "").toLowerCase() === "superadmin";

  try {
    await pool.query("BEGIN");

    // Verificar que el curso exista
    const c = await pool.query(
      `SELECT id, created_by FROM course WHERE id = $1 LIMIT 1`,
      [courseId]
    );
    if (c.rowCount === 0) {
      await pool.query("ROLLBACK");
      return res
        .status(404)
        .json({ ok: false, error: "Curso no encontrado" });
    }

    const ownerId = c.rows[0].created_by;
    if (ownerId !== user.sub && !isSuper) {
      await pool.query("ROLLBACK");
      return res.status(403).json({
        ok: false,
        error: "No tienes permisos para eliminar este curso",
      });
    }

    // Borrar assets de documentos
    await pool.query(
      `DELETE FROM document_asset
        WHERE content_id IN (
          SELECT id FROM content_item
           WHERE course_id = $1 AND type = 'document'
        );`,
      [courseId]
    );

    // Borrar assets de videos
    await pool.query(
      `DELETE FROM media_asset
        WHERE content_id IN (
          SELECT id FROM content_item
           WHERE course_id = $1 AND type = 'video'
        );`,
      [courseId]
    );

    // Borrar ítems de contenido
    await pool.query(
      `DELETE FROM content_item
        WHERE course_id = $1;`,
      [courseId]
    );

    // Borrar progreso y matrículas
    await pool.query(
      `DELETE FROM course_progress WHERE course_id = $1;`,
      [courseId]
    );
    await pool.query(
      `DELETE FROM enrollment WHERE course_id = $1;`,
      [courseId]
    );

    // (Opcional) aquí podrías borrar evaluaciones, certificados, etc.

    const del = await pool.query(
      `DELETE FROM course WHERE id = $1;`,
      [courseId]
    );

    await pool.query("COMMIT");
    return res.json({ ok: true, deleted: del.rowCount });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /courses/:id", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error al eliminar curso" });
  }
});

module.exports = router;
