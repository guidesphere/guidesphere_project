import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CoursePanel.css";
import logo from "../assets/logo.png";
import fotoPerfil from "../assets/foto.png";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseOverview, getCourseProgress, saveCourseProgress } from "../services/api";

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

  useEffect(() => { window.videos = videos; window.documents = documents; }, [videos, documents]);

  const [courseStatus, setCourseStatus] = useState("in_progress");
  const [coursePct, setCoursePct] = useState(0);

  const [activeContent, setActiveContent] = useState(null); // { type: 'video'|'doc', item }
  const videoRef = useRef(null);

  const [lastVideoSec, setLastVideoSec] = useState(0);
  const saveTimerRef = useRef(null);
  const restoredMetaRef = useRef(null);

  const docHeightPx = useMemo(() => {
    if (typeof window === "undefined") return 700;
    return Math.max(650, Math.floor(window.innerHeight * 0.75));
  }, []);

  const getDisplayName = (item, fallback) => {
    const fromUri = item?.uri ? decodeURIComponent(item.uri.split("/").pop() || "") : "";
    const name = item?.filename || fromUri || item?.title || "";
    return name || fallback;
  };

  const computeCourseProgress = (vids, docs) => {
    const total = vids.length + docs.length;
    if (total === 0) return 0;
    const sumV = vids.reduce((acc, v) => acc + Math.max(0, Math.min(100, Number(v.progress_percent || 0))) / 100, 0);
    const sumD = docs.reduce((acc, d) => acc + Math.max(0, Math.min(100, Number(d.progress_percent || 0))) / 100, 0);
    return (100 * (sumV + sumD)) / total;
  };

  const upsertVideoProgress = (contentIdOrUri, pct) => {
    setVideos(prev => prev.map(v => {
      const match = v.content_id === contentIdOrUri || v.uri === contentIdOrUri;
      if (!match) return v;
      const next = Math.max(0, Math.min(100, Math.ceil(pct)));
      if (next === v.progress_percent) return v;
      return { ...v, progress_percent: next, status: next >= 100 ? "completed" : "in_progress" };
    }));
  };

  const markDocumentOpened = (contentIdOrUri) => {
    setDocuments(prev => prev.map(d => {
      const match = d.content_id === contentIdOrUri || d.uri === contentIdOrUri;
      if (!match) return d;
      if (Number(d.progress_percent || 0) >= 100) return d;
      return { ...d, progress_percent: 100, status: "completed" };
    }));
  };

  const keyOf = (x) => x.content_id || x.uri;

  const applyMetaToState = (meta) => {
    if (meta?.videos) {
      setVideos(prev => prev.map(v => {
        const k = keyOf(v); const pp = Number(meta.videos[k]);
        return isNaN(pp) ? v : { ...v, progress_percent: pp, status: pp >= 100 ? "completed" : "in_progress" };
      }));
    }
    if (meta?.docs) {
      setDocuments(prev => prev.map(d => {
        const k = keyOf(d); const pp = Number(meta.docs[k]);
        return isNaN(pp) ? d : { ...d, progress_percent: pp, status: pp >= 100 ? "completed" : "in_progress" };
      }));
    }
  };

  const buildMeta = () => ({
    videos: Object.fromEntries(videos.map(v => [keyOf(v), Number(v.progress_percent || 0)])),
    docs: Object.fromEntries(documents.map(d => [keyOf(d), Number(d.progress_percent || 0)])),
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErrorMsg("");
        const data = await getCourseOverview(id);
        if (!alive) return;
        setCourse(data?.course ?? null);
        setDocuments(data?.documents ?? []);
        setVideos(data?.videos ?? []);
        setCourseStatus(data?.course_status ?? "in_progress");
        setCoursePct(computeCourseProgress(data?.videos ?? [], data?.documents ?? []));
      } catch (e) {
        console.error("getCourseOverview error:", e);
        if (alive) setErrorMsg("No se pudo cargar el curso.");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await getCourseProgress(id); // { progress, last_video_sec, meta }
      if (!alive) return;
      if (p?.progress != null) setCoursePct(Math.max(0, Math.min(100, Number(p.progress))));
      if (p?.last_video_sec != null) setLastVideoSec(Number(p.last_video_sec));
      restoredMetaRef.current = p?.meta || null;
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!restoredMetaRef.current) return;
    applyMetaToState(restoredMetaRef.current);
    restoredMetaRef.current = null;
  }, [videos.length, documents.length]);

  useEffect(() => { setCoursePct(computeCourseProgress(videos, documents)); }, [videos, documents]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCourseProgress(id, {
        progress: Math.round(coursePct),
        last_video_sec: Math.floor(lastVideoSec),
        meta: buildMeta(),
      });
    }, 600);
    return () => saveTimerRef.current && clearTimeout(saveTimerRef.current);
  }, [id, coursePct, lastVideoSec, videos, documents]);

  const onSearch = () => {
    const q = (searchText || "").trim();
    navigate(`/admin/search?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };
  const playVideo = (v) => setActiveContent({ type: "video", item: v });
  const viewDoc   = (d) => { setActiveContent({ type: "doc", item: d }); markDocumentOpened(d.content_id || d.uri); };
  const closeViewer = () => setActiveContent(null);

  const onVideoTimeUpdate = (e) => {
    const el = e.currentTarget;
    if (!el?.duration || !activeContent?.item) return;
    const pct = (el.currentTime / el.duration) * 100;
    upsertVideoProgress(activeContent.item.content_id || activeContent.item.uri, pct);
    setLastVideoSec(el.currentTime || 0);
  };

  return (
    <div className="admin-container">
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

      <div className="sub-header"><h2>Panel del Curso</h2></div>

      <main className="admin-main">
        <aside className="sidebar">
          <h3>Menú</h3>
          <button onClick={() => navigate("/admin")}>&larr; Volver al Gestor</button>
          <div className="sidebar-divider" />
          <button className="btn-gestionar-usuarios" onClick={() => navigate("/users")}>👥 Gestionar Usuarios</button>
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
                    onLoadedMetadata={(e) => { if (lastVideoSec > 0) e.currentTarget.currentTime = lastVideoSec; }}
                    style={{ width: "100%", maxHeight: "75vh", display: "block" }}
                  />
                ) : (
                  <iframe
                    src={`http://localhost:8000${activeContent.item.uri}#toolbar=1&zoom=page-width`}
                    title="Documento"
                    style={{ width: "100%", height: `${docHeightPx}px`, border: "none", display: "block", background: "#fff", overflow: "hidden" }}
                  />
                )}
              </div>

              <button className="btn-action" onClick={closeViewer}>Cerrar vista</button>
            </div>
          ) : (
            <>
              {loading ? (
                <p>Cargando curso…</p>
              ) : (
                <div className="panel-grid">
                  <div className="panel-col">
                    <h3>Videos</h3>
                    {videos.length === 0 && <p className="muted">No hay videos.</p>}
                    {videos.map((v) => {
                      const displayName = getDisplayName(v, "Video");
                      return (
                        <div key={v.content_id || v.id || v.uri} className="resource-card">
                          <div className="resource-head">
                            <strong>🎬 {displayName}</strong>
                            <button className="btn-action" onClick={() => setActiveContent({ type: "video", item: v })}>Reproducir</button>
                          </div>
                          <ProgressBar value={v.progress_percent} />
                          <div className="resource-meta">
                            <span>Estado: {v.status === "completed" ? "Completado" : "En progreso"}</span>
                            {v.duration_sec ? (<span> · Duración: {Math.round(v.duration_sec / 60)} min</span>) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="panel-col">
                    <h3>Documentos</h3>
                    {documents.length === 0 && <p className="muted">No hay documentos.</p>}
                    {documents.map((d) => {
                      const displayName = getDisplayName(d, "Documento");
                      return (
                        <div key={d.content_id || d.id || d.uri} className="resource-card">
                          <div className="resource-head">
                            <strong>📄 {displayName}</strong>
                            <button className="btn-action" onClick={() => { setActiveContent({ type: "doc", item: d }); markDocumentOpened(d.content_id || d.uri); }}>Ver</button>
                          </div>
                          <ProgressBar value={d.progress_percent} />
                          <div className="resource-meta">
                            <span>Estado: {d.status === "completed" ? "Completado" : "En progreso"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acciones globales */}
              <div className="panel-actions">
                <button
                  className="btn-primary"
                  onClick={() => course?.id && navigate(`/courses/${course.id}/evaluations`, { state: { course, videos, documents } })}
                >
                  📝 Presentar Evaluación
                </button>

                <button className="btn-primary" disabled title="Pronto disponible">
                  🎓 Descargar certificado
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
