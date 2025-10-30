// src/services/api.js
const CORE_API = "http://localhost:8000";
const EVAL_API = "http://localhost:8001";

// --- Registro ---
export async function register({ fullName, nombre_completo, email, username, password }) {
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
  if (!res.ok) throw new Error((await res.json()).error || "Error de registro");
  return await res.json();
}

// --- Login ---
export async function login({ email, password }) {
  const res = await fetch(`${CORE_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Credenciales inválidas");
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
  if (!res.ok) throw new Error((await res.json()).error || "Error obteniendo usuario");
  const data = await res.json();
  return data.user;
}

// --- Listado de usuarios ---
export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error listando usuarios");
  const data = await res.json();
  return data.users;
}

export async function getUsersPage(page = 1, pageSize = 10) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error listando usuarios");
  return await res.json();
}

// --- Subida de archivos ---
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
  if (!res.ok) throw new Error((await res.json()).error || "Error al subir archivo");
  return await res.json();
}

export async function uploadAvatar(file) {
  return uploadFile(file, "avatar");
}

export async function setMyAvatar(avatar_uri) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/users/me/avatar`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ avatar_uri }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error actualizando avatar");
  return await res.json();
}

// --- Cursos ---
export async function createCourse({ title, description, passing_score, documents = [], videos = [] }) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, passing_score, documents, videos }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error creando curso");
  return await res.json();
}

export async function searchCourses(q) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error buscando cursos");
  return await res.json();
}

export async function getCourseOverview(courseId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/courses/${courseId}/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error cargando curso");
  return await res.json();
}

// --- Usuarios ---
export async function updateUser(id, payload) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error actualizando usuario");
  return await res.json();
}

export async function deleteUser(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${CORE_API}/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error eliminando usuario");
  return await res.json();
}

// --- Progreso del curso ---
export async function getCourseProgress(courseId) {
  const u = JSON.parse(localStorage.getItem("user") || "null");
  const uid = u?.id ?? "me";
  const key = `progress:${uid}:${courseId}`;
  const local = localStorage.getItem(key);
  if (local) {
    try { return JSON.parse(local); } catch {}
  }

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${CORE_API}/courses/${courseId}/progress/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("server");
    return await res.json();
  } catch {
    return { progress: 0, last_video_sec: 0 };
  }
}

export async function saveCourseProgress(courseId, payload) {
  const u = JSON.parse(localStorage.getItem("user") || "null");
  const uid = u?.id ?? "me";
  const key = `progress:${uid}:${courseId}`;
  localStorage.setItem(key, JSON.stringify({
    progress: Number(payload.progress ?? 0),
    last_video_sec: Number(payload.last_video_sec ?? 0),
    meta: payload.meta || {}
  }));

  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`${CORE_API}/courses/${courseId}/progress/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("server error");
    return await res.json();
  } catch {
    return { ok: true, source: "local" };
  }
}

/* ====== Opciones de evaluación ====== */
export async function getEvaluationOptions(courseId, items) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${EVAL_API}/courses/${courseId}/evaluation-options`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(items),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text.slice(0,180)}`);
  try { return JSON.parse(text); }
  catch { throw new Error("La API no devolvió JSON válido."); }
}

// --- Evaluaciones dinámicas (antiguas) ---
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

/* ====== NUEVO: Examen fijo ====== */
export async function generateFixedExam() {
  const r = await fetch(`${EVAL_API}/exams/generate-fixed`, { method: "POST" });
  if (!r.ok) throw new Error(`generate-fixed: ${r.status}`);
  return r.json();
}

export async function submitFixedExam({ attempt_id, answers }) {
  const r = await fetch(`${EVAL_API}/exams/submit-fixed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt_id, answers }),
  });
  if (!r.ok) throw new Error(`submit-fixed: ${r.status}`);
  return r.json();
}
