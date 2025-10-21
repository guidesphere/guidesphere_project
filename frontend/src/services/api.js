// src/services/api.js
const API = "http://localhost:8000";

export async function register(payload) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error de registro");
  return await res.json();
}

export async function login({ email, password }) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Credenciales inválidas");
  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data;
}

export async function getUsers() {
  const res = await fetch(`${API}/users`);
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// ✅ Subir archivo (doc o video) -> guarda en /uploads/docs o /uploads/videos
export async function uploadFile(file, type) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("type", type); // "doc" | "video"
  formData.append("file", file);

  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error al subir archivo");
  return await res.json(); // { ok, file: { name, path } }
}

// ✅ Crear curso con arrays de documentos/videos (rutas devueltas por uploadFile)
export async function createCourse({ title, description, passing_score, documents = [], videos = [] }) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/courses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, passing_score, documents, videos }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error creando curso");
  return await res.json(); // { ok, course }
}

// ✅ Buscar cursos por texto (título o descripción)
export async function searchCourses(q) {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${API}/courses/search?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error((await res.json()).error || "Error buscando cursos");
  return await res.json(); // { ok, results: [...] }
}

export async function getCourseOverview(courseId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/courses/${courseId}/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).error || "Error cargando curso");
  return await res.json(); // { ok, course, documents, videos, ... }
}
