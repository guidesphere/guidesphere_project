// src/components/AdminContentManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import "./AdminContentManager.css";
import logo from "../assets/logo.png";
import fotoPerfil from "../assets/foto.png";
import { useNavigate, useLocation } from "react-router-dom";

function AdminContentManager() {
  const navigate = useNavigate();
  const location = useLocation();

  // Guardado simple: si no hay token, a /login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // Usuario actual (rol)
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  }, []);
  const role = currentUser?.role || "student";

  // ===== Estado del cajetín de búsqueda =====
  const [searchText, setSearchText] = useState("");

  // ===== Estado del curso seleccionado =====
  const [selectedCourse, setSelectedCourse] = useState(null); // { id, title, ... }

  // Si regresamos desde /admin/search con un curso elegido
  useEffect(() => {
    if (location.state?.selectedCourse) {
      setSelectedCourse(location.state.selectedCourse);
    }
  }, [location.state]);

  // ===== Handlers demo (luego integrarás acciones reales) =====
  const handlePlayVideo = () => alert("Reproducir Video (demo)");
  const handleViewContent = () => alert("Ver Contenido del Curso (demo)");
  const handleDoExam = () => alert("Presentar Evaluación (demo)");
  const handleDownloadVideo = () => alert("Descargar Video (demo)");
  const handleDownloadContent = () => alert("Descargar Contenido (demo)");
  const handleDownloadCert = () => alert("Descargar Certificado (demo)");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ===== Buscar cursos -> navegar a la página de resultados =====
  const onSearch = () => {
    const q = (searchText || "").trim();
    navigate(`/admin/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>
        <div className="user-info">
          <img src={fotoPerfil} alt="Foto de perfil" className="avatar" />
          <span>Profesor</span>
        </div>
      </header>

      <div className="sub-header">
        <h2>Gestor de Contenido</h2>
      </div>

      <main className="admin-main">
        <aside className="sidebar">
          <h3>Menú</h3>

          <details>
            <summary>Cargar un Curso</summary>
            <button onClick={() => navigate("/courses/new")}>Contenido del Curso</button>
            <button onClick={() => alert("Título (demo)")}>Título</button>
            <button onClick={() => alert("Descripción (demo)")}>Descripción</button>
            <button onClick={() => alert("Porcentaje aprobatorio (demo)")}>
              Porcentaje aprobatorio
            </button>
            <button onClick={() => alert("Guardar (demo)")}>Guardar</button>
            <button onClick={() => alert("Editar (demo)")}>Editar</button>
            <button onClick={() => alert("Eliminar (demo)")}>Eliminar</button>
          </details>

          <details>
            <summary>Cargar un Video</summary>
            <button onClick={() => alert("Desde Teams (demo)")}>Desde Teams</button>
            <button onClick={() => alert("Desde PowerPoint (demo)")}>Desde PowerPoint</button>
            <button onClick={() => alert("Desde archivo (demo)")}>Desde archivo</button>
            <button onClick={() => alert("Guardar video (demo)")}>Guardar</button>
            <button onClick={() => alert("Editar video (demo)")}>Editar</button>
            <button onClick={() => alert("Eliminar video (demo)")}>Eliminar</button>
          </details>

          <details>
            <summary>Cargar un Documento</summary>
            <button onClick={() => alert("PDF (demo)")}>PDF</button>
            <button onClick={() => alert("PPTX (demo)")}>PPTX</button>
            <button onClick={() => alert("Excel (demo)")}>Excel</button>
            <button onClick={() => alert("Word (demo)")}>Word</button>
            <button onClick={() => alert("Guardar documento (demo)")}>Guardar</button>
            <button onClick={() => alert("Editar documento (demo)")}>Editar</button>
            <button onClick={() => alert("Eliminar documento (demo)")}>Eliminar</button>
          </details>

          <details>
            <summary>Cargar un Certificado</summary>
            <button onClick={() => alert("Seleccionar Plantilla (demo)")}>
              Seleccionar Plantilla
            </button>
            <button onClick={() => alert("Seleccionar Curso (demo)")}>Seleccionar Curso</button>
            <button onClick={() => alert("Guardar certificado (demo)")}>Guardar</button>
            <button onClick={() => alert("Editar certificado (demo)")}>Editar</button>
            <button onClick={() => alert("Eliminar certificado (demo)")}>Eliminar</button>
          </details>

          <details>
            <summary>Revisar Estadísticas</summary>
            <button onClick={() => alert("Listado de cursos (demo)")}>Listado de cursos</button>
            <button onClick={() => alert("Participantes de por vida (demo)")}>
              Participantes de por vida
            </button>
            <button onClick={() => alert("Participantes Aprobados (demo)")}>
              Participantes Aprobados
            </button>
            <button onClick={() => alert("Participantes en curso (demo)")}>
              Participantes en curso
            </button>
            <button onClick={() => alert("Valoraciones (demo)")}>Valoraciones</button>
            <button onClick={() => alert("Comentarios (demo)")}>Comentarios</button>
          </details>

          <div className="sidebar-divider" />
          <button
            className="btn-gestionar-usuarios"
            onClick={() => navigate("/users")}
            aria-label="Ir a Gestión de Usuarios"
          >
            👥 Gestionar Usuarios
          </button>
        </aside>

        <section className="section-funcionalidades">
          <div className="title-row">
            <h2>Mirar Curso: {selectedCourse ? selectedCourse.title : "Título"}</h2>

            {/* Cajetín de búsqueda + botón */}
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar curso por título o descripción…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
              <button className="btn-buscar" onClick={onSearch}>
                Buscar
              </button>
            </div>
          </div>

          <div
            className={`contenedor-funcionalidades ${
              selectedCourse ? "activo" : ""
            }`}
          >
            <div className="fila-botones">
              <button onClick={handlePlayVideo}>🎬 Reproducir Video</button>
              <button onClick={handleViewContent}>📖 Contenido del Curso</button>
              <button onClick={handleDoExam}>📝 Presentar Evaluación</button>
            </div>
            <div className="fila-botones">
              <button onClick={handleDownloadVideo}>⬇️ Descargar Video</button>
              <button onClick={handleDownloadContent}>⬇️ Descargar Contenido</button>
              <button onClick={handleDownloadCert}>⬇️ Descargar Certificado</button>
            </div>
            <div className="fila-botones">
              <button className="boton-salir" onClick={handleLogout}>
                🚪 Salir
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de Antioquia Institución Universitaria
      </footer>
    </div>
  );
}

export default AdminContentManager;
