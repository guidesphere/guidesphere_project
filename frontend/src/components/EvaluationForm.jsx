// src/components/EvaluationForm.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EvaluationList.css";
import { generateFixedExam, submitFixedExam } from "../services/api";

export default function EvaluationForm() {
  const { courseId, materialId: materialParam } = useParams();
  const materialId = decodeURIComponent(materialParam || "");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [exam, setExam] = useState(null);      // {attempt_id, questions[]}
  const [answers, setAnswers] = useState({});  // {"1":"A", ...}
  const [result, setResult] = useState(null);  // {score, passed, ...}

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(""); setLoading(true); setResult(null);
        console.log("[Eval] params =>", { courseId, materialId });
        const data = await generateFixedExam();
        if (!alive) return;
        console.log("[Eval] exam =>", data);
        setExam(data);
      } catch (e) {
        console.error("[Eval] generateFixedExam error:", e);
        setErr(e?.message || "No se pudo generar el examen.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [courseId, materialId]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      setErr(""); setLoading(true);
      console.log("[Eval] submit =>", { attempt_id: exam?.attempt_id, answers });
      const r = await submitFixedExam(exam?.attempt_id, answers);
      console.log("[Eval] result =>", r);
      setResult(r);
    } catch (e) {
      console.error("[Eval] submitFixedExam error:", e);
      setErr(e?.message || "No se pudo enviar el examen.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="evl__loading">Cargando evaluación…</div>;

  return (
    <div className="evl__wrap">
      <header className="evl__header">
        <h2>Evaluación del material</h2>
        <div className="evl__badge">Curso: {courseId?.slice(0,8)}… · Material: {materialId?.slice(0,8)}…</div>
      </header>

      {err && (
        <div className="evl__error" style={{ marginBottom: 16 }}>
          {err}
          <div style={{ marginTop: 12 }}>
            <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
          </div>
        </div>
      )}

      {!err && exam && !result && (
        <form onSubmit={onSubmit} className="evl__card" style={{ padding: 16 }}>
          {exam.questions.map(q => (
            <div key={q.num} style={{ marginBottom: 16 }}>
              <strong>{q.num}. {q.question}</strong>
              <div style={{ marginTop: 8 }}>
                {Object.entries(q.options).map(([k, label]) => (
                  <label key={k} style={{ display: "block", margin: "6px 0" }}>
                    <input
                      type="radio"
                      name={`q${q.num}`}
                      value={k}
                      checked={(answers[String(q.num)] || "") === k}
                      onChange={() =>
                        setAnswers(prev => ({ ...prev, [String(q.num)]: k }))
                      }
                    />{" "}
                    {k}) {label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button type="submit" className="evl__btn">Enviar</button>
          <button type="button" className="evl__btn" style={{ marginLeft: 8, background:"#888" }} onClick={() => navigate(-1)}>
            ← Cancelar
          </button>
        </form>
      )}

      {!err && result && (
        <div className="evl__card" style={{ padding: 16 }}>
          <h3>Resultado</h3>
          <p>Puntaje: <strong>{result.score}%</strong></p>
          <p>Correctas: <strong>{result.corrects}/{result.total}</strong></p>
          <p>Estado: <strong style={{ color: result.passed ? "#2ECC71" : "#c0392b" }}>
            {result.passed ? "APROBADO" : "REPROBADO"}
          </strong></p>
          <button className="evl__btn" onClick={() => navigate(-1)}>← Volver a las evaluaciones</button>
        </div>
      )}
    </div>
  );
}
