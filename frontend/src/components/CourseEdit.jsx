// src/components/CourseEdit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getCourseOverview,
  updateCourse,
  uploadFile, // 👈 usamos el mismo /upload que en crear curso
} from "../services/api";
import "./AdminContentManager.css";
import "./CoursePanel.css";
import logo from "../assets/logo.png";

export default function CourseEdit() {
  const params = useParams();
  // Soporta tanto /courses/:id/edit como /courses/:courseId/edit
  const courseId = params.id || params.courseId;

  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const role = (currentUser?.role || "").toLowerCase();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(60);

  const [videos, setVideos] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // guard simple: solo profesor / superadmin
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (role !== "professor" && role !== "superadmin") {
      navigate("/");
    }
  }, [currentUser, role, navigate]);

  // cargar datos del curso
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseId) {
        setError("Id de curso no válido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await getCourseOverview(courseId);
        if (!alive) return;

        const course = data.course || {};

        setTitle(course.title || "");
        setDescription(course.description || "");
        setPassingScore(Number(course.passing_score ?? 60));

        setVideos(Array.isArray(data.videos) ? data.videos : []);
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setError(e.message || "Error cargando curso");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseId]);

  const handleBack = () => {
    navigate("/courses/panel");
  };

  /* =========================
     Helpers de edición local
     ========================= */

  // videos
  const changeVideoField = (idx, field, value) => {
    setVideos((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const addVideo = () => {
    setVideos((prev) => [
      ...prev,
      { id: null, title: "", description: "", uri: "" },
    ]);
  };

  const removeVideo = (idx) => {
    if (!window.confirm("¿Eliminar este video del curso?")) return;
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  // documentos
  const changeDocField = (idx, field, value) => {
    setDocuments((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );
  };

  const addDoc = () => {
    setDocuments((prev) => [
      ...prev,
      { id: null, title: "", description: "", uri: "" },
    ]);
  };

  const removeDoc = (idx) => {
    if (!window.confirm("¿Eliminar este documento del curso?")) return;
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  /* =========================
     Subida de archivos (doc/video)
     ========================= */

  const handleDocFilePicked = async (idx, event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const up = await uploadFile(file, "document");
      const uri = up?.file?.path || up?.path || up?.uri || "";

      if (!uri) {
        alert("No se recibió una ruta válida del servidor.");
        return;
      }

      const filename = file.name || "";

      setDocuments((prev) =>
        prev.map((d, i) =>
          i === idx
            ? {
                ...d,
                uri,
                filename: filename || d.filename,
                title: d.title || filename || d.title,
              }
            : d
        )
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error subiendo documento");
    } finally {
      event.target.value = "";
    }
  };

  const handleVideoFilePicked = async (idx, event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const up = await uploadFile(file, "video");
      const uri = up?.file?.path || up?.path || up?.uri || "";

      if (!uri) {
        alert("No se recibió una ruta válida del servidor.");
        return;
      }

      const filename = file.name || "";

      setVideos((prev) =>
        prev.map((v, i) =>
          i === idx
            ? {
                ...v,
                uri,
                filename: filename || v.filename,
                title: v.title || filename || v.title,
              }
            : v
        )
      );
    } catch (e) {
      console.error(e);
      alert(e.message || "Error subiendo video");
    } finally {
      event.target.value = "";
    }
  };

  /* =========================
     Guardado
     ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseId) {
      setError("Id de curso no válido.");
      return;
    }

    if (!title.trim()) {
      alert("El título del curso no puede estar vacío.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateCourse(courseId, {
        title: title.trim(),
        description: description.trim(),
        passing_score: Number(passingScore) || 0,
        videos,
        documents,
      });
      alert("Curso actualizado correctamente.");
      navigate("/courses/panel");
    } catch (e2) {
      console.error(e2);
      setError(e2.message || "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;

  return (
    <div className="admin-container">
      {/* Header superior morado */}
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>

        <div className="user-info">
          <span>{currentUser?.email || "Usuario"}</span>
        </div>
      </header>

      {/* Banda naranja */}
      <div className="sub-header">
        <h2>Editar curso</h2>
      </div>

      <main className="admin-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <h3>Menú</h3>
          <button className="menu-link" onClick={handleBack}>
            ← Volver a Gestión de Cursos
          </button>
        </aside>

        {/* Contenido principal */}
        <section className="section-funcionalidades">
          {loading && <p>Cargando datos del curso…</p>}
          {error && (
            <p style={{ color: "crimson", fontWeight: 600 }}>{error}</p>
          )}

          {!loading && !error && (
            <form onSubmit={handleSubmit} style={{ maxWidth: 1100 }}>
              {/* Datos generales */}
              <div
                className="course-progress-box"
                style={{ marginBottom: 24 }}
              >
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontWeight: 600 }}>
                    Título del curso
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontWeight: 600 }}>
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                  />
                </div>

                <div style={{ marginBottom: 12, maxWidth: 220 }}>
                  <label style={{ display: "block", fontWeight: 600 }}>
                    Puntaje mínimo aprobatorio (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                  />
                </div>
              </div>

              {/* Bloque videos + documentos en dos columnas */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 24,
                  alignItems: "flex-start",
                  marginBottom: 32,
                }}
              >
                {/* Columna videos */}
                <div>
                  <h3 style={{ color: "#6518af" }}>Videos del curso</h3>
                  {videos.length === 0 && (
                    <p style={{ fontStyle: "italic" }}>
                      No hay videos aún.
                    </p>
                  )}
                  {videos.map((v, idx) => (
                    <div
                      key={v.id || `video-${idx}`}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                        background: "#fff",
                      }}
                    >
                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          Título
                        </label>
                        <input
                          type="text"
                          value={v.title || ""}
                          onChange={(e) =>
                            changeVideoField(idx, "title", e.target.value)
                          }
                          style={{ width: "100%", padding: 6, marginTop: 4 }}
                        />
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          URL / URI
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <input
                            type="text"
                            value={v.uri || v.url || ""}
                            onChange={(e) =>
                              changeVideoField(idx, "uri", e.target.value)
                            }
                            style={{ flex: 1, padding: 6 }}
                          />
                          <button
                            type="button"
                            className="course-item-button"
                            style={{ whiteSpace: "nowrap" }}
                            onClick={() =>
                              document
                                .getElementById(`video-file-${idx}`)
                                ?.click()
                            }
                          >
                            Seleccionar archivo
                          </button>
                        </div>
                        <input
                          id={`video-file-${idx}`}
                          type="file"
                          accept="video/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleVideoFilePicked(idx, e)}
                        />
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={v.description || ""}
                          onChange={(e) =>
                            changeVideoField(
                              idx,
                              "description",
                              e.target.value
                            )
                          }
                          rows={2}
                          style={{ width: "100%", padding: 6, marginTop: 4 }}
                        />
                      </div>

                      <button
                        type="button"
                        className="course-item-button"
                        style={{ marginTop: 4 }}
                        onClick={() => removeVideo(idx)}
                      >
                        Eliminar video
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="course-item-button"
                    onClick={addVideo}
                  >
                    ➕ Añadir video
                  </button>
                </div>

                {/* Columna documentos */}
                <div>
                  <h3 style={{ color: "#6518af" }}>Documentos del curso</h3>
                  {documents.length === 0 && (
                    <p style={{ fontStyle: "italic" }}>
                      No hay documentos aún.
                    </p>
                  )}
                  {documents.map((d, idx) => (
                    <div
                      key={d.id || `doc-${idx}`}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                        background: "#fff",
                      }}
                    >
                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          Título
                        </label>
                        <input
                          type="text"
                          value={d.title || ""}
                          onChange={(e) =>
                            changeDocField(idx, "title", e.target.value)
                          }
                          style={{ width: "100%", padding: 6, marginTop: 4 }}
                        />
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          URL / URI
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <input
                            type="text"
                            value={d.uri || d.url || ""}
                            onChange={(e) =>
                              changeDocField(idx, "uri", e.target.value)
                            }
                            style={{ flex: 1, padding: 6 }}
                          />
                          <button
                            type="button"
                            className="course-item-button"
                            style={{ whiteSpace: "nowrap" }}
                            onClick={() =>
                              document
                                .getElementById(`doc-file-${idx}`)
                                ?.click()
                            }
                          >
                            Seleccionar archivo
                          </button>
                        </div>
                        <input
                          id={`doc-file-${idx}`}
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleDocFilePicked(idx, e)}
                        />
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <label
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          Descripción (opcional)
                        </label>
                        <textarea
                          value={d.description || ""}
                          onChange={(e) =>
                            changeDocField(
                              idx,
                              "description",
                              e.target.value
                            )
                          }
                          rows={2}
                          style={{ width: "100%", padding: 6, marginTop: 4 }}
                        />
                      </div>

                      <button
                        type="button"
                        className="course-item-button"
                        style={{ marginTop: 4 }}
                        onClick={() => removeDoc(idx)}
                      >
                        Eliminar documento
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="course-item-button"
                    onClick={addDoc}
                  >
                    ➕ Añadir documento
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="course-item-button"
                disabled={disabled}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de
        Antioquia Institución Universitaria
      </footer>
    </div>
  );
}
