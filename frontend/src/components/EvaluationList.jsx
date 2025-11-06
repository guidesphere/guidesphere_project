// src/components/EvaluationList.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import "./EvaluationList.css";
import { getCourseOverview } from "../services/api";

export default function EvaluationList() {
  const { courseId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [course, setCourse] = useState(state?.course || null);
  const [videos, setVideos] = useState(state?.videos || []);
  const [documents, setDocuments] = useState(state?.documents || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar overview si no vino todo por state
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (state?.course && state?.videos && state?.documents) {
          setLoading(false);
          return;
        }
        const res = await getCourseOverview(courseId);
        if (!alive) return;
        setCourse(res.course || null);
        setVideos(res.videos || []);
        setDocuments(res.documents || []);
      } catch (e) {
        if (!alive) return;
        setError("No se pudo cargar el curso.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId, state]);

  // Construir filas: videos + documentos con progreso
  const rows = useMemo(() => {
    const list = [];

    // helper para quitar extensión del nombre
    const stripExt = (name) =>
      (name || "").replace(/\.[^.]+$/, "");

    // Videos
    for (const v of videos || []) {
      const raw = v.progress_percent ?? v.progress ?? 0;
      const progress = Math.max(0, Math.min(100, Number(raw) || 0));

      const baseTitle = v.title || v.filename || "Video";
      const displayTitle = stripExt(baseTitle);

      list.push({
        item_id: v.content_id || v.id || v.uri,
        type: "video",
        title: displayTitle || "Video",
        progress,
        fileId: null,
      });
    }

    // Documentos
    for (const d of documents || []) {
      const raw = d.progress_percent ?? d.progress ?? 0;
      const progress = Math.max(0, Math.min(100, Number(raw) || 0));

      const uri = d.uri || "";
      const base = uri.split("/").pop() || "";
      const fileId = base.replace(/\.[^.]+$/, ""); // basename sin extensión

      const baseTitle = d.title || d.filename || base || "Documento";
      const displayTitle = stripExt(baseTitle);

      list.push({
        item_id: d.content_id || d.id || d.uri,
        type: "document",
        title: displayTitle || "Documento",
        progress,
        fileId,
      });
    }

    return list;
  }, [videos, documents]);

  const completedCount = rows.filter((r) => r.progress >= 100).length;

  const goPresentar = (row) => {
    const contentId = row.item_id;
    if (!contentId) return;

    if (row.type === "document") {
      const fileId = row.fileId || contentId;
      navigate(
        `/user/exam?contentId=${encodeURIComponent(
          contentId
        )}&type=document&fileId=${encodeURIComponent(fileId)}`
      );
      return;
    }

    if (row.type === "video") {
      navigate(
        `/user/exam?contentId=${encodeURIComponent(contentId)}&type=video`
      );
      return;
    }

    navigate(`/user/exam?contentId=${encodeURIComponent(contentId)}`);
  };

  if (loading) return <div className="evl__loading">Cargando…</div>;

  if (error)
    return (
      <div className="evl__error">
        {error}
        <div style={{ marginTop: 12 }}>
          <button className="evl__btn" onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>
      </div>
    );

  if (rows.length === 0)
    return (
      <div className="evl__error">
        No hay recursos evaluables en este curso.
        <div style={{ marginTop: 12 }}>
          <button className="evl__btn" onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>
      </div>
    );

  return (
    <div className="evl__wrap">
      <header className="evl__header">
        <h2>Evaluaciones de: {course?.title || "Curso"}</h2>
        <div className="evl__badge evl__badge--pending">
          Recursos completados al 100%: {completedCount}/{rows.length}
        </div>
      </header>

      <table className="evl__table">
        <thead>
          <tr>
            <th>Recurso</th>
            <th>Tipo</th>
            <th>Progreso</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const canPresent = r.progress >= 100;
            return (
              <tr key={`${r.type}-${r.item_id}`}>
                <td>{r.title}</td>
                <td>{r.type}</td>
                <td>{r.progress}%</td>
                <td>
                  <button
                    className="evl__btn"
                    disabled={!canPresent}
                    onClick={() => goPresentar(r)}
                    title={
                      canPresent
                        ? "Presentar evaluación"
                        : "Completa el 100% del recurso para habilitar la evaluación"
                    }
                  >
                    Presentar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <button className="evl__btn" onClick={() => navigate(-1)}>
          ← Volver al curso
        </button>
      </div>
    </div>
  );
}
