// src/components/EvaluationList.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import "./EvaluationList.css";
import { getCourseOverview, getEvaluationOptions } from "../services/api";
import { adaptLocalProgressToItems } from "../utils/progressAdapter";

export default function EvaluationList() {
  const { courseId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [course, setCourse] = useState(state?.course || null);
  const [videos, setVideos] = useState(state?.videos || []);
  const [documents, setDocuments] = useState(state?.documents || []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (state?.course && state?.videos && state?.documents) return;
      try {
        const res = await getCourseOverview(courseId);
        if (!alive) return;
        setCourse(res.course || null);
        setVideos(res.videos || []);
        setDocuments(res.documents || []);
      } catch (e) {
        if (!alive) return;
        setError("No se pudo cargar el curso.");
      }
    })();
    return () => { alive = false; };
  }, [courseId, state]);

  const courseItems = useMemo(() => ([
    ...videos.map(v => ({
      item_id: v.content_id || v.uri,
      item_type: "video",
      title: v.title || v.filename || "Video",
    })),
    ...documents.map(d => ({
      item_id: d.content_id || d.uri,
      item_type: "document",
      title: d.title || d.filename || "Documento",
    })),
  ]), [videos, documents]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!courseId || courseItems.length === 0) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const uid = JSON.parse(localStorage.getItem("user") || "null")?.id;
        const payload = adaptLocalProgressToItems(uid, courseId, courseItems);
        const resp = await getEvaluationOptions(courseId, payload);
        if (!alive) return;
        setData(resp);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error cargando opciones");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [courseId, courseItems]);

  if (loading) return <div className="evl__loading">Cargando…</div>;
  if (error) return (
    <div className="evl__error">
      {error}
      <div style={{ marginTop: 12 }}>
        <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    </div>
  );
  if (!data) return (
    <div className="evl__error">
      Sin datos de evaluación para este curso.
      <div style={{ marginTop: 12 }}>
        <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
      </div>
    </div>
  );

  return (
    <div className="evl__wrap">
      <header className="evl__header">
        <h2>Evaluaciones de: {course?.title || "Curso"}</h2>
        <div className={`evl__badge evl__badge--${data.aggregate.overall_status}`}>
          Estado del curso: {String(data.aggregate.overall_status || "").toUpperCase()}
          {data.aggregate.overall_score_percent != null && (
            <span className="evl__score"> · Promedio: {Number(data.aggregate.overall_score_percent).toFixed(1)}%</span>
          )}
        </div>
      </header>

      <table className="evl__table">
        <thead>
          <tr>
            <th>Recurso</th>
            <th>Tipo</th>
            <th>Progreso</th>
            <th>Último intento</th>
            <th>Calificación</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {data.options.map(op => (
            <tr key={op.item_id}>
              <td>{op.title}</td>
              <td>{op.item_type}</td>
              <td>{Math.round(Number(op.progress_percent || 0))}%</td>
              <td>{op.last_attempt?.status ? String(op.last_attempt.status).toUpperCase() : "—"}</td>
              <td>
                {op.last_attempt?.score_percent != null
                  ? `${Number(op.last_attempt.score_percent).toFixed(1)}%`
                  : "—"}
              </td>
              <td>
                <button
                  className="evl__btn"
                  disabled={!op.eligible}
                  onClick={() => navigate(`/courses/${courseId}/evaluate/${encodeURIComponent(op.item_id)}`)}
                  title={op.eligible ? "Presentar evaluación" : "Completa el 100% del recurso"}
                >
                  Presentar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="evl__footer">
        <div>Completados: {data.aggregate.total_items_completed}</div>
        <div>
          Aprobados: {data.aggregate.items_approved} · Reprobados: {data.aggregate.items_failed} · En proceso: {data.aggregate.items_in_progress}
        </div>
      </footer>

      <div style={{ marginTop: 16 }}>
        <button className="evl__btn" onClick={() => navigate(-1)}>← Volver al curso</button>
      </div>
    </div>
  );
}
