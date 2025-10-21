import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CoursePanel.css";
import logo from "../assets/logo.png";
import fotoPerfil from "../assets/foto.png";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseOverview } from "../services/api";

function ProgressBar({ value }) {
  const n = Number(value ?? 0);
  const v = Math.max(0, Math.min(100, Math.round(n)));
  return (
    <div className="gp-progress">
      <div className="gp-progress-fill" style={{ width: `${v}%` }} />
      <span className="gp-progress-text">{v}%</span>
    </div>
  );
}

export default function CoursePanel() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [course, setCourse] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [videos, setVideos] = useState([]);

  const [courseStatus, setCourseStatus] = useState("in_progress");
  const [coursePct, setCoursePct] = useState(0);

  const [activeContent, setActiveContent] = useState(null); // { type: 'video'|'doc', item }
  const videoRef = useRef(null);

  // Altura cómoda del visor para documentos (sin romper layout)
  const docHeightPx = useMemo(() => {
    if (typeof window === "undefined") return 700;
    return Math.max(650, Math.floor(window.innerHeight * 0.75));
  }, []);

  // -------- helpers --------
  const getDisplayName = (item, fallback) => {
    const fromUri = item?.uri ? decodeURIComponent(item.uri.split("/").pop() || "") : "";
    const name = item?.filename || fromUri || item?.title || "";
    return name || fallback;
  };

  const computeCourseProgress = (vids, docs) => {
    const V = vids.length;
    const D = docs.length;
    const total = V + D;
    if (total === 0) return 0;

    const sumV = vids.reduce(
      (acc, v) => acc + Math.max(0, Math.min(100, Number(v.progress_percent || 0))) / 100,
      0
    );
    const sumD = docs.reduce(
      (acc, d) => acc + Math.max(0, Math.min(100, Number(d.progress_percent || 0))) / 100,
      0
    );
    return (100 * (sumV + sumD)) / total;
  };

  const upsertVideoProgress = (contentIdOrUri, pct) => {
    setVideos((prev) =>
      prev.map((v) => {
        const match = v.content_id === contentIdOrUri || v.uri === contentIdOrUri;
        if (!match) return v;
        const next = Math.max(0, Math.min(100, Math.round(pct)));
        if (next === v.progress_percent) return v;
        return { ...v, progress_percent: next, status: next >= 100 ? "completed" : "in_progress" };
      })
    );
  };

  const markDocumentOpened = (contentIdOrUri) => {
    setDocuments((prev) =>
      prev.map((d) => {
        const match = d.content_id === contentIdOrUri || d.uri === contentIdOrUri;
        if (!match) return d;
        if (Number(d.progress_percent || 0) >= 100) return d;
        return { ...d, progress_percent: 100, status: "completed" };
      })
    );
  };

  // -------- data load --------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const data = await getCourseOverview(id);
        if (!alive) return;

        setCourse(data?.course ?? null);
        setDocuments(data?.documents ?? []);
        setVideos(data?.videos ?? []);
        setCourseStatus(data?.course_status ?? "in_progress");

        // Calculamos en cliente (independiente del backend)
        const initialPct = computeCourseProgress(data?.videos ?? [], data?.documents ?? []);
        setCoursePct(initialPct);
      } catch (e) {
        console.error("getCourseOverview error:", e);
        if (alive) setErrorMsg("No se pudo cargar el curso.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Recalcular progreso del curso cuando cambien videos o documentos
  useEffect(() => {
    setCoursePct(computeCourseProgress(videos, documents));
  }, [videos, documents]);

  // -------- actions --------
  const onSearch = () => {
    const q = (searchText || "").trim();
    navigate(`/admin/search?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const playVideo = (v) => {
    setActiveContent({ type: "video", item: v });
    // no marcamos 100% aquí; se actualizará con onTimeUpdate
  };

  const viewDoc = (d) => {
    setActiveContent({ type: "doc", item: d });
    // Documento abierto => 100%
    markDocumentOpened(d.content_id || d.uri);
  };

  const closeViewer = () => setActiveContent(null);

  // Actualizar progreso del video mientras se reproduce
  const onVideoTimeUpdate = (e) => {
    const el = e.currentTarget;
    if (!el?.duration || !activeContent?.item) return;
    const pct = (el.currentTime / el.duration) * 100;
    upsertVideoProgress(activeContent.item.content_id || activeContent.item.uri, pct);
  };

  const activeProgress = activeContent?.item?.progress_percent ?? 0;

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>
        <div className="user-info">
          <img src={fotoPerfil} alt="Foto" className="avatar" />
          <span>Profesor</span>
        </div>
      </header>

      <div className="sub-header">
        <h2>Panel del Curso</h2>
      </div>

      <main className="admin-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <h3>Menú</h3>
          <button onClick={() => navigate("/admin")}>&larr; Volver al Gestor</button>
          <div className="sidebar-divider" />
          <button className="btn-gestionar-usuarios" onClick={() => navigate("/users")}>
            👥 Gestionar Usuarios
          </button>
        </aside>

        <section className="section-funcionalidades">
          <div className="title-row">
            <h2>Mirar Curso: {course ? course.title : "…"}</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar curso por título o descripción…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
              <button className="btn-buscar" onClick={onSearch}>Buscar</button>
            </div>
          </div>

          {/* Progreso del curso siempre visible */}
          <div className="course-status">
            <span className={`badge ${courseStatus === "completed" ? "success" : "warning"}`}>
              {courseStatus === "completed" ? "Completado" : "En progreso"}
            </span>
            <div className="course-progress">
              <label>Progreso del curso</label>
              <ProgressBar value={coursePct} />
            </div>
          </div>

          {errorMsg && <p style={{ color: "crimson" }}>{errorMsg}</p>}

          {/* Visor */}
          {activeContent ? (
            <div className="content-viewer">
              <h3>
                {activeContent.type === "video" ? "🎬 Video:" : "📄 Documento:"}{" "}
                {getDisplayName(activeContent.item, "Contenido")}
              </h3>

              <div className="viewer-box">
                {activeContent.type === "video" ? (
                  <video
                    ref={videoRef}
                    src={`http://localhost:8000${activeContent.item.uri}`}
                    controls
                    onTimeUpdate={onVideoTimeUpdate}
                    style={{ width: "100%", maxHeight: "75vh", display: "block" }}
                  />
                ) : (
                  <iframe
                    src={`http://localhost:8000${activeContent.item.uri}#toolbar=1&zoom=page-width`}
                    title="Documento"
                    style={{
                      width: "100%",
                      height: `${docHeightPx}px`,
                      border: "none",
                      display: "block",
                      background: "#fff",
                      overflow: "hidden",
                    }}
                  />
                )}
              </div>

              {/* Progreso del recurso abierto */}
              <div className="course-progress" style={{ marginTop: 10 }}>
                <label>
                  Progreso del {activeContent.type === "video" ? "video" : "documento"}
                </label>
                <ProgressBar
                  value={
                    activeContent.type === "video"
                      ? videos.find(
                          (v) =>
                            v.content_id === activeContent.item.content_id ||
                            v.uri === activeContent.item.uri
                        )?.progress_percent || 0
                      : documents.find(
                          (d) =>
                            d.content_id === activeContent.item.content_id ||
                            d.uri === activeContent.item.uri
                        )?.progress_percent || 0
                  }
                />
              </div>

              <button className="btn-action" onClick={closeViewer}>Cerrar vista</button>
            </div>
          ) : (
            <>
              {loading ? (
                <p>Cargando curso…</p>
              ) : (
                <div className="panel-grid">
                  {/* Videos */}
                  <div className="panel-col">
                    <h3>Videos</h3>
                    {videos.length === 0 && <p className="muted">No hay videos.</p>}
                    {videos.map((v) => {
                      const displayName = getDisplayName(v, "Video");
                      return (
                        <div key={v.content_id || v.id || v.uri} className="resource-card">
                          <div className="resource-head">
                            <strong>🎬 {displayName}</strong>
                            <button className="btn-action" onClick={() => playVideo(v)}>
                              Reproducir
                            </button>
                          </div>
                          <ProgressBar value={v.progress_percent} />
                          <div className="resource-meta">
                            <span>
                              Estado: {v.status === "completed" ? "Completado" : "En progreso"}
                            </span>
                            {v.duration_sec ? (
                              <span> · Duración: {Math.round(v.duration_sec / 60)} min</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Documentos */}
                  <div className="panel-col">
                    <h3>Documentos</h3>
                    {documents.length === 0 && <p className="muted">No hay documentos.</p>}
                    {documents.map((d) => {
                      const displayName = getDisplayName(d, "Documento");
                      return (
                        <div key={d.content_id || d.id || d.uri} className="resource-card">
                          <div className="resource-head">
                            <strong>📄 {displayName}</strong>
                            <button className="btn-action" onClick={() => viewDoc(d)}>
                              Ver
                            </button>
                          </div>
                          <ProgressBar value={d.progress_percent} />
                          <div className="resource-meta">
                            <span>
                              Estado: {d.status === "completed" ? "Completado" : "En progreso"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acciones globales */}
              <div className="panel-actions">
                <button className="btn-primary" onClick={() => alert("Presentar Evaluación (demo)")}>
                  📝 Presentar Evaluación
                </button>
                <button className="btn-primary" onClick={() => alert("Descargar Certificado (demo)")}>
                  ⬇️ Descargar Certificado
                </button>
                <button className="boton-salir" onClick={handleLogout}>🚪 Salir</button>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de Antioquia Institución Universitaria
      </footer>
    </div>
  );
}
