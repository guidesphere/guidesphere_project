// src/components/CoursePanel.jsx
import React, { useMemo, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./CoursePanel.css";
import "./AdminContentManager.css";
import logo from "../assets/logo.png";
import {
  getCourseOverview,
  getCourseProgress,
  saveCourseProgress,
  getCourseRatingSummary,
  setCourseRating,
  CORE_API,
} from "../services/api";

const BASE_API = CORE_API; // usamos la misma base que el backend

const buildUrl = (uri) => {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${BASE_API.replace(/\/$/, "")}${uri}`;
};

// Calcula el progreso general del curso a partir de videos + documentos
function computeOverallProgress(videoMap, docMap, videos, documents) {
  const items = [...(videos || []), ...(documents || [])];
  const totalItems = items.length;
  if (totalItems === 0) return 0;

  let sum = 0;

  for (const v of videos || []) {
    const stored =
      videoMap?.[v.id] ??
      videoMap?.[String(v.id)] ??
      Number(v.progress_percent ?? v.progress ?? 0);
    const p = Math.max(0, Math.min(100, Number(stored) || 0));
    sum += p;
  }

  for (const d of documents || []) {
    const stored =
      docMap?.[d.id] ??
      docMap?.[String(d.id)] ??
      Number(d.progress_percent ?? d.progress ?? 0);
    const p = Math.max(0, Math.min(100, Number(stored) || 0));
    sum += p;
  }

  return Math.round(sum / totalItems);
}

// Construye el objeto meta que se guarda en course_progress.meta
function buildMetaForSave(videos, documents, lastVideoInfo, videoMap, docMap) {
  const items = {};
  const norm = (val) => Math.max(0, Math.min(100, Number(val ?? 0) || 0));

  (videos || []).forEach((v) => {
    const id = v.id;
    if (!id) return;
    const stored =
      videoMap?.[id] ??
      videoMap?.[String(id)] ??
      v.progress_percent ??
      v.progress ??
      0;
    const progress = norm(stored);
    let status = "pending";
    if (progress >= 100) status = "completed";
    else if (progress > 0) status = "in_progress";

    const last_sec =
      lastVideoInfo &&
      (String(lastVideoInfo.id) === String(id) || lastVideoInfo.id === id)
        ? lastVideoInfo.sec || 0
        : 0;

    items[id] = {
      progress_percent: progress,
      status,
      last_sec,
    };
  });

  (documents || []).forEach((d) => {
    const id = d.id;
    if (!id) return;
    const stored =
      docMap?.[id] ??
      docMap?.[String(id)] ??
      d.progress_percent ??
      d.progress ??
      0;
    const progress = norm(stored);
    let status = "pending";
    if (progress >= 100) status = "completed";
    else if (progress > 0) status = "in_progress";

    items[id] = {
      progress_percent: progress,
      status,
      last_sec: 0,
    };
  });

  const lastVideoId = lastVideoInfo?.id || null;
  const lastVideoTitle = lastVideoId
    ? (videos || []).find((v) => String(v.id) === String(lastVideoId))?.title ||
      ""
    : "";

  return {
    lastVideoId,
    lastVideoTitle,
    videoProgress: videoMap || {},
    docProgress: docMap || {},
    items,
  };
}

export default function CoursePanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const courseId = params.id || params.courseId || null;

  const videoRef = useRef(null);

  // --- Usuario actual ---
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const role = (currentUser?.role || "").toLowerCase();
  const currentUserId = currentUser?.id || null;

  // Curso que viene desde la navegación (solo para título / desc)
  const courseFromState = location.state?.course || null;

  const [videos, setVideos] = useState(
    Array.isArray(courseFromState?.videos) ? courseFromState.videos : []
  );
  const [documents, setDocuments] = useState(
    Array.isArray(courseFromState?.documents) ? courseFromState.documents : []
  );
  const [courseProgress, setCourseProgress] = useState(
    Number(courseFromState?.progress ?? 0)
  );

  // Mapas de progreso
  const [videoProgressMap, setVideoProgressMap] = useState({});
  const [docProgressMap, setDocProgressMap] = useState({});

  // Último video visto
  const [lastVideoInfo, setLastVideoInfo] = useState({ id: null, sec: 0 });

  const [activeVideo, setActiveVideo] = useState(null); // video que se está viendo
  const [activeDoc, setActiveDoc] = useState(null); // documento que se está viendo

  const title = courseFromState?.title || "…";
  const description =
    courseFromState?.description || "Este curso aún no tiene descripción.";

  /* === Rating del curso === */
  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [pendingRating, setPendingRating] = useState(0);
  const [pendingComment, setPendingComment] = useState("");
  const [savingRating, setSavingRating] = useState(false);

  const loadRating = async () => {
    if (!courseId || !currentUserId) return;
    try {
      setRatingError("");
      setRatingLoading(true);
      const summary = await getCourseRatingSummary(courseId, currentUserId);
      setRatingSummary(summary);
      if (summary.user_rating) {
        setPendingRating(summary.user_rating);
        setPendingComment(summary.user_comment || "");
      }
    } catch (e) {
      setRatingError(e.message || "Error cargando calificación.");
    } finally {
      setRatingLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && currentUserId) {
      loadRating();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, currentUserId]);

  const handleSaveRating = async () => {
    if (!courseId || !currentUserId) return;
    if (!pendingRating || pendingRating < 1 || pendingRating > 5) {
      alert("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }
    try {
      setSavingRating(true);
      setRatingError("");
      await setCourseRating(
        courseId,
        { rating: pendingRating, comment: pendingComment || null },
        currentUserId
      );
      await loadRating();
      alert("¡Gracias por tu opinión!");
    } catch (e) {
      setRatingError(e.message || "No se pudo guardar tu opinión.");
    } finally {
      setSavingRating(false);
    }
  };

  /* === Cargar overview (videos/docs) desde backend === */
  useEffect(() => {
    if (!courseId) return;
    let cancelado = false;

    (async () => {
      try {
        const data = await getCourseOverview(courseId);
        if (cancelado || !data) return;

        if (Array.isArray(data.videos)) setVideos(data.videos);
        if (Array.isArray(data.documents)) setDocuments(data.documents);
      } catch (err) {
        console.error("Error cargando overview del curso:", err);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [courseId]);

  /* === Cargar progreso guardado (local / servidor) === */
  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const p = await getCourseProgress(courseId);
        if (!p) return;

        const meta = p.meta || {};
        const vp = meta.videoProgress || {};
        const dp = meta.docProgress || {};
        setVideoProgressMap(vp);
        setDocProgressMap(dp);

        setLastVideoInfo({
          id: meta.lastVideoId || null,
          sec: Number(p.last_video_sec || 0),
        });
      } catch {
        // sin problema, ya hay valores por defecto
      }
    })();
  }, [courseId]);

  /* === Aplicar mapa de progreso a la lista de videos === */
  useEffect(() => {
    if (!videos || videos.length === 0) return;
    if (!videoProgressMap || Object.keys(videoProgressMap).length === 0)
      return;

    setVideos((prev) =>
      prev.map((v) => {
        const stored =
          videoProgressMap[v.id] ?? videoProgressMap[String(v.id)];
        if (typeof stored === "number") {
          return { ...v, progress_percent: stored };
        }
        return v;
      })
    );
  }, [videoProgressMap, videos]);

  /* === Aplicar mapa de progreso a la lista de documentos === */
  useEffect(() => {
    if (!documents || documents.length === 0) return;
    if (!docProgressMap || Object.keys(docProgressMap).length === 0) return;

    setDocuments((prev) =>
      prev.map((d) => {
        const stored = docProgressMap[d.id] ?? docProgressMap[String(d.id)];
        if (typeof stored === "number") {
          return { ...d, progress_percent: stored };
        }
        return d;
      })
    );
  }, [docProgressMap, documents]);

  /* === Recalcular progreso general cada vez que cambian ítems o mapas === */
  useEffect(() => {
    const overall = computeOverallProgress(
      videoProgressMap,
      docProgressMap,
      videos,
      documents
    );
    setCourseProgress(overall);
  }, [videoProgressMap, docProgressMap, videos, documents]);

  // --- Navegación ---
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
      return;
    }
    if (role === "student") {
      navigate("/courses/mine");
    } else {
      navigate("/admin");
    }
  };

  const handleDoExam = () => {
    if (!courseId) return;

    // 👇 Aviso nativo del navegador mientras se genera el examen
  window.alert(
    "Estamos generando tu examen. Esto puede tardar unos segundos, por favor espera…"
  );
  
    // Ir a la lista de evaluaciones del curso
    window.location.href = `/courses/${courseId}/evaluations`;
  };

  // 🔁 Descargar certificado -> ir a /certificates y recordar desde qué curso vinimos
  const handleDownloadCert = () => {
    try {
      if (courseId) {
        localStorage.setItem("lastCourseIdForCertificates", courseId);
      }
    } catch {
      // si localStorage falla, no es crítico para la navegación
    }
    // Navegación completa para evitar problemas con el router
    window.location.href = "/certificates";
  };

  // Abrir video o documento
  const handleOpenItem = (item, kind) => {
    const uri = item?.uri || item?.url || "";
    if (!uri) {
      alert(
        `Este ${kind === "video" ? "video" : "documento"} no tiene archivo asociado.`
      );
      return;
    }

    const href = buildUrl(uri);

    if (kind === "video") {
      const startFrom =
        lastVideoInfo.id === item.id && lastVideoInfo.sec > 0
          ? lastVideoInfo.sec
          : 0;

      setActiveVideo({
        ...item,
        href,
        startFrom,
      });
    } else {
      // Documento: marcar 100%, guardar progreso y mostrar visor interno
      const docId = item.id;

      const updatedDocs = (documents || []).map((d) =>
        d.id === docId ? { ...d, progress_percent: 100 } : d
      );
      setDocuments(updatedDocs);

      const newDocMap = { ...docProgressMap, [docId]: 100 };
      setDocProgressMap(newDocMap);

      const newOverall = computeOverallProgress(
        videoProgressMap,
        newDocMap,
        videos,
        updatedDocs
      );

      const meta = buildMetaForSave(
        videos,
        updatedDocs,
        lastVideoInfo,
        videoProgressMap,
        newDocMap
      );

      saveCourseProgress(courseId, {
        progress: newOverall,
        last_video_sec: lastVideoInfo.sec || 0,
        meta,
      }).catch(() => {});

      setActiveDoc({
        ...item,
        href,
      });
    }
  };

  // Cuando el video carga metadatos, saltar al segundo guardado (si existe)
  const handleVideoLoaded = () => {
    if (activeVideo?.startFrom && videoRef.current) {
      try {
        videoRef.current.currentTime = activeVideo.startFrom;
      } catch (e) {
        console.warn("No se pudo posicionar el video:", e);
      }
    }
  };

  // Actualizar progreso viendo un video
  const handleVideoTimeUpdate = async (e) => {
    if (!courseId || !activeVideo) return;
    const el = e.currentTarget;
    if (!el.duration || el.duration === Infinity) return;

    const percent = Math.round((el.currentTime / el.duration) * 100) || 0;
    const currentSec = Math.floor(el.currentTime);

    const updatedVideos = (videos || []).map((v) =>
      v.id === activeVideo.id ? { ...v, progress_percent: percent } : v
    );
    setVideos(updatedVideos);

    const newVideoMap = {
      ...videoProgressMap,
      [activeVideo.id]: percent,
    };
    setVideoProgressMap(newVideoMap);

    const newLastVideoInfo = { id: activeVideo.id, sec: currentSec };
    setLastVideoInfo(newLastVideoInfo);

    const newOverall = computeOverallProgress(
      newVideoMap,
      docProgressMap,
      updatedVideos,
      documents
    );

    const meta = buildMetaForSave(
      updatedVideos,
      documents,
      newLastVideoInfo,
      newVideoMap,
      docProgressMap
    );

    try {
      await saveCourseProgress(courseId, {
        progress: newOverall,
        last_video_sec: currentSec,
        meta,
      });
    } catch {
      // fallback local ya lo maneja saveCourseProgress
    }
  };

  const handleCloseVideo = () => setActiveVideo(null);
  const handleCloseDoc = () => setActiveDoc(null);

  const overallProgress = Math.max(
    0,
    Math.min(100, Number(courseProgress || 0))
  );

  const renderStars = (value, onSelect) => {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      const filled = i <= value;
      stars.push(
        <span
          key={i}
          onClick={() => onSelect && onSelect(i)}
          style={{
            cursor: onSelect ? "pointer" : "default",
            fontSize: "1.4rem",
            marginRight: 4,
            color: filled ? "#f1c40f" : "#ccc",
          }}
        >
          {filled ? "★" : "☆"}
        </span>
      );
    }
    return stars;
  };

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
        <h2>Panel del Curso</h2>
      </div>

      <main className="admin-main">
        {/* Sidebar izquierdo */}
        <aside className="sidebar">
          <h3>Menú</h3>

          <button className="menu-link" onClick={handleBack}>
            {role === "student" ? "← Volver a Mis Cursos" : "← Volver al Gestor"}
          </button>

          <button className="menu-link" onClick={handleDoExam}>
            📝 Presentar evaluación
          </button>

          <button className="menu-link" onClick={handleDownloadCert}>
            📄 Descargar certificado
          </button>
        </aside>

        {/* Contenido principal dentro del recuadro punteado */}
        <section className="section-funcionalidades">
          {!courseFromState && (
            <p
              style={{
                textAlign: "center",
                marginTop: "40px",
                color: "crimson",
              }}
            >
              No se pudo cargar el curso.
            </p>
          )}

          {courseFromState && (
            <>
              {/* Título centrado + descripción */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: "24px",
                  maxWidth: "800px",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <h2 style={{ marginBottom: "8px", color: "#6518af" }}>
                  {title}
                </h2>
                <p style={{ margin: 0, color: "#555" }}>{description}</p>
              </div>

              {/* Progreso general del curso */}
              <div className="course-progress-box">
                <div className="course-progress-header">
                  <span
                    className={
                      "course-progress-pill " +
                      (overallProgress >= 100
                        ? "done"
                        : overallProgress > 0
                        ? "in-progress"
                        : "not-started")
                    }
                  >
                    {overallProgress >= 100
                      ? "Completado"
                      : overallProgress > 0
                      ? "En progreso"
                      : "Sin iniciar"}
                  </span>
                  <span className="course-progress-title">
                    Progreso del curso
                  </span>
                  <span className="course-progress-percent">
                    {overallProgress}%
                  </span>
                </div>
                <div className="course-progress-bar">
                  <div
                    className="course-progress-inner"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* VISOR DE VIDEO */}
              {activeVideo && (
                <div
                  style={{
                    margin: "24px 0",
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#fafafa",
                  }}
                >
                  <strong>{activeVideo.title || "Video"}</strong>
                  <video
                    src={activeVideo.href}
                    controls
                    autoPlay
                    style={{
                      display: "block",
                      marginTop: "12px",
                      maxWidth: "100%",
                    }}
                    ref={videoRef}
                    onLoadedMetadata={handleVideoLoaded}
                    onTimeUpdate={handleVideoTimeUpdate}
                  />
                  <button
                    type="button"
                    className="course-item-button"
                    style={{ marginTop: "8px" }}
                    onClick={handleCloseVideo}
                  >
                    Cerrar video
                  </button>
                </div>
              )}

              {/* VISOR DE DOCUMENTO */}
              {activeDoc && (
                <div
                  style={{
                    margin: "24px 0",
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#fafafa",
                  }}
                >
                  <strong>{activeDoc.title || "Documento"}</strong>
                  <iframe
                    src={activeDoc.href}
                    title={activeDoc.title || "Documento"}
                    style={{
                      display: "block",
                      marginTop: "12px",
                      width: "100%",
                      height: "600px",
                      border: "none",
                    }}
                  />
                  <button
                    type="button"
                    className="course-item-button"
                    style={{ marginTop: "8px" }}
                    onClick={handleCloseDoc}
                  >
                    Cerrar documento
                  </button>
                </div>
              )}

              {/* Dos columnas: Videos / Documentos */}
              <div
                style={{
                  display: "flex",
                  gap: "40px",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  textAlign: "left",
                }}
              >
                {/* Columna de videos */}
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <h3 style={{ color: "#6518af", marginTop: 0 }}>Videos</h3>

                  {videos.length === 0 ? (
                    <p>No hay videos disponibles aún.</p>
                  ) : (
                    <ul className="course-items-list">
                      {videos.map((v) => {
                        const raw = v.progress_percent ?? v.progress ?? 0;
                        const p = Math.max(0, Math.min(100, Number(raw)));
                        return (
                          <li
                            key={v.id || v.title}
                            className="course-item-row"
                          >
                            <div className="course-item-main">
                              <strong>{v.title || "Video"}</strong>
                              {v.description && <p>{v.description}</p>}
                              <div className="course-item-progress-bar">
                                <div
                                  className="course-item-progress-inner"
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "0.9rem",
                                  marginLeft: "8px",
                                }}
                              >
                                {p}%
                              </span>
                            </div>
                            <button
                              className="course-item-button"
                              type="button"
                              onClick={() => handleOpenItem(v, "video")}
                            >
                              Ver
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Columna de documentos */}
                <div style={{ flex: 1, minWidth: "260px" }}>
                  <h3 style={{ color: "#6518af", marginTop: 0 }}>
                    Documentos
                  </h3>

                  {documents.length === 0 ? (
                    <p>No hay documentos disponibles aún.</p>
                  ) : (
                    <ul className="course-items-list">
                      {documents.map((d) => {
                        const raw = d.progress_percent ?? d.progress ?? 0;
                        const p = Math.max(0, Math.min(100, Number(raw)));
                        return (
                          <li
                            key={d.id || d.title}
                            className="course-item-row"
                          >
                            <div className="course-item-main">
                              <strong>{d.title || "Documento"}</strong>
                              {d.description && <p>{d.description}</p>}
                              <div className="course-item-progress-bar">
                                <div
                                  className="course-item-progress-inner"
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                            </div>
                            <button
                              className="course-item-button"
                              type="button"
                              onClick={() => handleOpenItem(d, "doc")}
                            >
                              Ver
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Bloque de calificación del curso (solo estudiantes) */}
              {role === "student" && (
                <div
                  style={{
                    marginTop: "32px",
                    padding: "16px 20px",
                    borderRadius: "10px",
                    border: "1px solid #eee",
                    background: "#fafafa",
                    maxWidth: "640px",
                  }}
                >
                  <h3 style={{ marginTop: 0, marginBottom: "8px" }}>
                    Tu opinión sobre el curso
                  </h3>

                  {ratingLoading && <p>Cargando calificaciones…</p>}
                  {ratingError && (
                    <p style={{ color: "crimson" }}>{ratingError}</p>
                  )}

                  {ratingSummary && (
                    <p
                      style={{
                        fontSize: "0.9rem",
                        marginTop: 0,
                        marginBottom: "8px",
                        color: "#555",
                      }}
                    >
                      Promedio general:{" "}
                      <strong>{ratingSummary.avg_rating.toFixed(2)}</strong> (
                      {ratingSummary.ratings_count}{" "}
                      {ratingSummary.ratings_count === 1
                        ? "opinión"
                        : "opiniones"}
                      )
                    </p>
                  )}

                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ marginBottom: "4px", fontSize: "0.9rem" }}>
                      Tu calificación:
                    </div>
                    <div>{renderStars(pendingRating || 0, setPendingRating)}</div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <textarea
                      value={pendingComment}
                      onChange={(e) => setPendingComment(e.target.value)}
                      placeholder="¿Qué te pareció este curso?"
                      rows={3}
                      style={{
                        width: "100%",
                        resize: "vertical",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveRating}
                    disabled={savingRating}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      border: "none",
                      background: "#6518af",
                      color: "#fff",
                      cursor: savingRating ? "default" : "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    {savingRating ? "Guardando..." : "Guardar opinión"}
                  </button>
                </div>
              )}
            </>
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
