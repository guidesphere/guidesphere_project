// src/components/AdminContentManager.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import "./AdminContentManager.css";
import logo from "../assets/logo.png";
import { uploadAvatar, setMyAvatar } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

const API = "http://localhost:8000";

function AdminContentManager() {
  const navigate = useNavigate();
  const location = useLocation();

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

      const up = await uploadAvatar(file); // { ok, file:{ path } }
      const newPath = up?.file?.path;
      if (!newPath) throw new Error("Respuesta inválida al subir avatar.");

      await setMyAvatar(newPath);

      setAvatarUrl(newPath);
      const saved = JSON.parse(localStorage.getItem("user") || "null") || {};
      saved.avatar_uri = newPath;
      localStorage.setItem("user", JSON.stringify(saved));

      alert("Avatar actualizado ✅");
    } catch (err) {
      console.error(err);
      alert(err?.message || "No se pudo actualizar el avatar");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // --- Búsqueda ---
  const [searchText, setSearchText] = useState("");

  // --- Curso seleccionado (si regresas con state) ---
  const [selectedCourse, setSelectedCourse] = useState(null);
  useEffect(() => {
    if (location.state?.selectedCourse) {
      setSelectedCourse(location.state.selectedCourse);
    }
  }, [location.state]);

  // --- Acciones demo ---
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

  const onSearch = () => {
    const q = (searchText || "").trim();
    if (!q) return;
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

          <button className="menu-link" onClick={() => navigate("/courses/new")}>
            Cargar un Curso
          </button>

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

          <div className={`contenedor-funcionalidades ${selectedCourse ? "activo" : ""}`}>
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
              <button className="boton-salir" onClick={handleLogout}>🚪 Salir</button>
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
