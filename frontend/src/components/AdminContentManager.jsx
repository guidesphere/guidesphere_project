// src/components/AdminContentManager.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import "./AdminContentManager.css";
import logo from "../assets/logo.png";
import { uploadAvatar, getCourses } from "../services/api";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";
const CORE_API = "http://127.0.0.1:8001";

// recorta textos largos (para la descripción)
function shortText(text, max = 80) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function AdminContentManager() {
  const navigate = useNavigate();

  // --- Auth guard ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // --- Usuario actual ---
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const roleLc = (currentUser?.role || "").toLowerCase();

  // --- Avatar ---
  const fileRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar_uri || "/uploads/avatars/default.png"
  );
  const displayAvatar = avatarUrl?.startsWith("http")
    ? avatarUrl
    : `${API}${avatarUrl}`;

  const handleChooseAvatar = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Selecciona una imagen válida.");
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        alert("La imagen no debe superar 3MB.");
        return;
      }

      // 1) Subir archivo al backend
      const up = await uploadAvatar(file);
      const newPath = up?.file?.path;
      if (!newPath) {
        throw new Error("Respuesta inválida al subir avatar.");
      }

      // 2) El backend ya guarda avatar_uri en la DB (POST /upload)
      //    Aquí sólo actualizamos estado + localStorage.
      const finalPath = newPath;

      setAvatarUrl(finalPath);

      const saved =
        JSON.parse(localStorage.getItem("user") || "null") || {};
      saved.avatar_uri = finalPath;
      localStorage.setItem("user", JSON.stringify(saved));

      alert("Avatar actualizado ✅");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Error actualizando foto de perfil");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // --- Búsqueda ---
  const [searchText, setSearchText] = useState("");

  // --- Cursos disponibles ---
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);

  const loadCourses = async (q = "") => {
    try {
      setLoadingCourses(true);
      const data = await getCourses({
        scope: "public",
        page: 1,
        q: q.trim(),
      });
      setCourses(data.courses || []);
    } catch (e) {
      console.error("Error cargando cursos públicos:", e);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    loadCourses("");
  }, []);

  const handleSearch = () => {
    loadCourses(searchText);
  };

  const handleEnroll = async (course) => {
    if (!window.confirm(`¿Deseas inscribirte en "${course.title}"?`)) return;
    try {
      setEnrollingId(course.id);
      const token = localStorage.getItem("token");
      const res = await fetch(`${CORE_API}/courses/${course.id}/enroll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "No se pudo inscribir en el curso");
      }

      alert("Inscripción realizada correctamente.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Error al inscribirse en el curso.");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // --- Navegación lateral ---
  const goCoursesPanel = () => navigate("/courses/panel"); // gestión (prof/superadmin)
  const goMyCourses = () => navigate("/courses/mine"); // mis cursos (enrolled)
  const goStats = () => navigate("/admin/stats");

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>

        <div className="user-info">
          <img
            src={displayAvatar}
            alt="Avatar"
            className="avatar"
            onClick={() => fileRef.current?.click()}
            title="Cambiar foto de perfil"
          />
          <span>{currentUser?.email || "Usuario"}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleChooseAvatar}
          />
        </div>
      </header>

      <div className="sub-header">
        <h2>Gestor de Contenido</h2>
      </div>

      <main className="admin-main">
        <aside className="sidebar">
          <h3>Menú</h3>

          {/* Cargar Curso (solo visible para profesor o superadmin) */}
          {["professor", "superadmin"].includes(roleLc) && (
            <button
              className="menu-link"
              onClick={() => navigate("/courses/new")}
            >
              Cargar un Curso
            </button>
          )}

          {/* Gestión de Cursos */}
          {["professor", "superadmin"].includes(roleLc) && (
            <button
              className="menu-link"
              onClick={goCoursesPanel}
              aria-label="Ir a Gestión de Cursos"
            >
              📚 Gestión de Cursos
            </button>
          )}

          {/* Mis cursos visibles para todos los roles */}
          <button
            className="menu-link"
            onClick={goMyCourses}
            aria-label="Ir a Mis Cursos"
          >
            🎓 Mis Cursos
          </button>

          {/* Estadísticas solo para superadmin */}
          {roleLc === "superadmin" && (
            <button
              className="menu-link"
              onClick={goStats}
              aria-label="Ver estadísticas globales"
            >
              📊 Estadísticas
            </button>
          )}

          <div className="sidebar-divider" />

          {/* Gestión de Usuarios */}
          <button
            className="btn-gestionar-usuarios"
            onClick={() => navigate("/users", { replace: true })}
            aria-label="Ir a Gestión de Usuarios"
          >
            👥 Gestionar Usuarios
          </button>
        </aside>

        {/* ===== Zona principal: cursos disponibles ===== */}
        <section className="section-funcionalidades">
          <div className="title-row">
            <h2>Cursos disponibles</h2>

            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar curso por título o descripción…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="btn-buscar" onClick={handleSearch}>
                Buscar
              </button>
            </div>
          </div>

          {loadingCourses ? (
            <p>Cargando cursos…</p>
          ) : courses.length === 0 ? (
            <p>No hay cursos disponibles.</p>
          ) : (
            <div className="course-table-wrapper">
              <table className="courses-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Descripción</th>
                    <th>Duración</th>
                    <th>Profesor</th>
                    <th>Puntuación</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td className="course-title-cell">{c.title}</td>
                      <td className="course-desc-cell">
                        {shortText(c.description, 80)}
                      </td>
                      <td className="course-duration-cell">
                        {c.duration || c.estimated_duration || "—"}
                      </td>
                      <td className="course-prof-cell">
                        {c.professor_name || c.owner_username || "—"}
                      </td>
                      <td className="course-rating-cell">
                        {typeof c.rating_avg === "number"
                          ? `${c.rating_avg.toFixed(1)} / 5`
                          : "—"}
                      </td>
                      <td className="course-action-cell">
                        <button
                          className="btn-enroll"
                          onClick={() => handleEnroll(c)}
                          disabled={enrollingId === c.id}
                        >
                          {enrollingId === c.id
                            ? "Inscribiendo…"
                            : "Inscribirse"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="courses-footer">
            <button
              className="boton-salir boton-salir--small"
              onClick={handleLogout}
            >
              🚪 Salir
            </button>
          </div>
        </section>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de
        Antioquia Institución Universitaria
      </footer>
    </div>
  );
}

export default AdminContentManager;
