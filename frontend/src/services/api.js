// src/services/api.js

// Normalizamos URLs base (sin barras al final)
const RAW_CORE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const RAW_EVAL = import.meta.env.VITE_EVAL_URL || "http://localhost:8010";

export const CORE_API = RAW_CORE.replace(/\/+$/, "");
export const EVAL_API = RAW_EVAL.replace(/\/+$/, "");

// --- Cabecera de autenticación ---
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// --- Registro ---
export async function register({
  fullName,
  nombre_completo,
  email,
  username,
  password,
}) {
  const body = {
    nombre_completo: (nombre_completo ?? fullName ?? "").trim(),
    email: (email || "").trim().toLowerCase(),
    username: (username || "").trim(),
    password,
  };
  const res = await fetch(`${CORE_API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Error de registro");
  return await res.json();
}

// --- Login ---
export async function login({ email, password }) {
  const res = await fetch(`${CORE_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Credenciales inválidas");
  const data = await res.json();
  localStorage.setItem("token", data.token);

  try {
    const me = await getCurrentUser();
    localStorage.setItem("user", JSON.stringify(me));
  } catch {}
  return data;
}

// --- Obtener usuario actual ---
export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    throw new Error(
      (await res.json()).error || "Error obteniendo usuario actual"
    );
  const data = await res.json();
  return data.user;
}

// --- Listado de usuarios ---
export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Error listando usuarios");
  const data = await res.json();
  return data.users;
}

export async function getUsersPage(page = 1, pageSize = 10) {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${CORE_API}/admin/users?page=${page}&pageSize=${pageSize}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok)
    throw new Error((await res.json()).error || "Error listando usuarios");
  return await res.json();
}

// --- Subida de archivos genérica ---
export async function uploadFile(file, type) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);

  const res = await fetch(`${CORE_API}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Error al subir archivo");
  return await res.json();
}

// --- Avatar: subir ---
export async function uploadAvatar(file) {
  return uploadFile(file, "avatar");
}

// --- Avatar: guardar en mi perfil ---

export async function setMyAvatar(avatar_uri) {
  // Simplemente devolvemos un objeto compatible por si se usa en otro sitio.
  return { avatar_uri };
}

/* ========= Cursos: crear / leer / editar ========= */

export async function createCourse({
  title,
  description,
  passing_score,
  documents = [],
  videos = [],
}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description,
      passing_score,
      documents,
      videos,
    }),
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Error creando curso");
  return await res.json();
}

export async function searchCourses(q) {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${CORE_API}/courses/search?q=${encodeURIComponent(q)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok)
    throw new Error((await res.json()).error || "Error buscando cursos");
  return await res.json();
}

/**
 * Overview normalizado del curso
 */
export async function getCourseOverview(courseId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses/${courseId}/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let raw = null;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }

  if (!res.ok || !raw) {
    const msg =
      (raw && (raw.error || raw.detail)) ||
      text ||
      "Error cargando curso";
    throw new Error(msg);
  }

  const course = raw.course || raw;

  let passing = 0;
  if (course.passing_score != null) {
    passing = Number(course.passing_score);
  } else if (raw.passing_score != null) {
    passing = Number(raw.passing_score);
  }

  if (Number.isNaN(passing)) {
    passing = 0;
  }

  return {
    id: course.id,
    title: course.title || "",
    description: course.description || "",
    passing_score: passing,

    videos: raw.videos || course.videos || [],
    documents: raw.documents || course.documents || [],

    course_status:
      raw.course_status ?? course.course_status ?? null,
    course_progress_percent: Number(
      raw.course_progress_percent ??
        course.course_progress_percent ??
        0
    ),
    last_video_sec: Number(
      raw.last_video_sec ?? course.last_video_sec ?? 0
    ),
    meta: raw.meta || course.meta || {},
  };
}

/** Trae el curso completo por id (metadatos + contenidos) */
export async function getCourseById(courseId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text || `Error obteniendo curso (${res.status || "desconocido"})`
    );
  }

  return await res.json();
}

/** Actualiza título, descripción, passing_score y contenidos */
export async function updateCourse(courseId, payload) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses/${courseId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = "Error actualizando curso";
    try {
      const json = JSON.parse(text);
      msg = json.error || msg;
    } catch {}
    throw new Error(msg);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

// --- Usuarios (admin) ---
export async function updateUser(id, payload) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(
      (await res.json()).error || "Error actualizando datos del usuario"
    );
  return await res.json();
}

export async function deleteUser(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    throw new Error((await res.json()).error || "Error eliminando usuario");
  return await res.json();
}

/* ========= Progreso del curso ========= */

export async function getCourseProgress(courseId) {
  const token = localStorage.getItem("token");
  const u = JSON.parse(localStorage.getItem("user") || "null");
  const uid = u?.id ?? "me";
  const key = `progress:${uid}:${courseId}`;

  if (token) {
    try {
      const res = await fetch(`${CORE_API}/courses/${courseId}/progress/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const cleaned = {
          progress: Number(data.progress ?? 0),
          last_video_sec: Number(data.last_video_sec ?? 0),
          meta: data.meta || {},
        };
        localStorage.setItem(key, JSON.stringify(cleaned));
        return cleaned;
      }
    } catch {
      // cae a lectura local
    }
  }

  const local = localStorage.getItem(key);
  if (local) {
    try {
      return JSON.parse(local);
    } catch {}
  }

  return { progress: 0, last_video_sec: 0, meta: {} };
}

export async function saveCourseProgress(courseId, payload) {
  const u = JSON.parse(localStorage.getItem("user") || "null");
  const uid = u?.id ?? "me";
  const key = `progress:${uid}:${courseId}`;
  localStorage.setItem(
    key,
    JSON.stringify({
      progress: Number(payload.progress ?? 0),
      last_video_sec: Number(payload.last_video_sec ?? 0),
      meta: payload.meta || {},
    })
  );

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${CORE_API}/courses/${courseId}/progress/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("server error");
    return await res.json();
  } catch {
    return { ok: true, source: "local" };
  }
}

/* ====== ⭐ Calificaciones de curso (course_rating) ====== */

export async function getCourseRatingSummary(courseId, userId) {
  const headers = {};
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  const res = await fetch(
    `${EVAL_API}/course-rating/${encodeURIComponent(courseId)}/summary`,
    { headers }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Error cargando rating (${res.status}): ${text.slice(0, 200)}`
    );
  }

  return await res.json(); // { course_id, avg_rating, ratings_count, user_rating, user_comment }
}

export async function setCourseRating(courseId, { rating, comment }, userId) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (userId) {
    headers["X-User-Id"] = userId;
  }

  const res = await fetch(
    `${EVAL_API}/course-rating/${encodeURIComponent(courseId)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ rating, comment }),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.detail || "No se pudo guardar la calificación.");
  }

  return data; // { ok, rating, comment }
}

/* ====== Evaluaciones ====== */

export async function getEvaluationOptions(courseId, items) {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${EVAL_API}/courses/${courseId}/evaluation-options`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(items),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("La API no devolvió JSON válido.");
  }
}

// --- Evaluaciones antiguas ---
export async function generateExam(materialId, userId) {
  const res = await fetch(`${EVAL_API}/exams/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ material_id: materialId, user_id: userId }),
  });
  return await res.json();
}

export async function submitExam(attemptId, answers) {
  const res = await fetch(`${EVAL_API}/exams/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt_id: attemptId, answers }),
  });
  return await res.json();
}

export const getExamByContent = (id) =>
  fetch(`${EVAL_API}/exam/by-content/${id}`).then((r) => {
    if (!r.ok) throw new Error(`by-content ${r.status}`);
    return r.json();
  });

/* ====== Cursos (panel de profesor / admin / mis cursos) ====== */

export async function getCourses(opts = {}) {
  const {
    scope = "mine",
    professorId,
    page = 1,
    q = "",
    pageSize, // opcional
  } = opts;

  const qs = new URLSearchParams({
    scope,
    page: String(page),
    q,
    ...(professorId ? { professorId: String(professorId) } : {}),
    ...(pageSize ? { pageSize: String(pageSize) } : {}),
  });

  const r = await fetch(`${CORE_API}/courses?` + qs.toString(), {
    headers: authHeaders(),
  });

  if (!r.ok) throw new Error("Error al obtener cursos");
  return await r.json();
}

export async function deleteCourse(id) {
  const r = await fetch(`${CORE_API}/courses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!r.ok) throw new Error("Error al eliminar curso");
  return await r.json();
}

export async function publishCourse(id, publish) {
  const token = localStorage.getItem("token");
  const r = await fetch(`${CORE_API}/courses/${id}/publish`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publish: !!publish }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Error publicando");
  return await r.json();
}

// --- Inscribirse en un curso ---
export async function enrollCourse(id) {
  const r = await fetch(`${CORE_API}/courses/${id}/enroll`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok)
    throw new Error(
      (await r.json()).error || "Error al inscribirse en el curso"
    );
  return await r.json();
}

/* ====== Estadísticas globales (solo admin/superadmin) ====== */

export async function getAdminStatsOverview() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const userId = user?.id;
  if (!userId) {
    throw new Error("No hay usuario autenticado.");
  }

  const res = await fetch(`${EVAL_API}/admin/stats/overview`, {
    headers: {
      "X-User-Id": userId,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || "Error obteniendo estadísticas");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Respuesta inválida de estadísticas");
  }
}
