// src/components/EvaluationForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EvaluationList.css";
import { getExamByContent } from "../services/api"; // ⬅️ aquí se importa el “nuevo examen”

export default function EvaluationForm() {
  const { courseId, materialId: materialParam } = useParams();
  const navigate = useNavigate();

  // materialId es el content_id (UUID) del item “Documento”
  const materialId = useMemo(() => decodeURIComponent(materialParam || ""), [materialParam]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [quiz, setQuiz] = useState(null); // { quiz_id, content_id, questions: [{question_id,prompt,options:[{option_id,label,is_correct?}]}] }
  const [answers, setAnswers] = useState({}); // { [question_id]: option_id }
  const [result, setResult] = useState(null);  // { total, corrects, score, passed }

  // Cargar examen por content_id
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(""); setLoading(true); setResult(null);
        if (!materialId) throw new Error("El material no es válido.");
        const data = await getExamByContent(materialId);
        if (!alive) return;

        if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error("No hay examen disponible para este contenido.");
        }
        setQuiz(data);
      } catch (e) {
        setErr(e?.message || "No se pudo cargar la evaluación.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [materialId]);

  // Enviar (calcula puntaje local si el backend incluyó is_correct)
  function onSubmit(e) {
    e.preventDefault();
    if (!quiz) return;

    // Si el backend trae is_correct podemos evaluar localmente;
    // si no, solo mostramos un resumen enviado.
    const allHaveKey = quiz.questions.every(q =>
      Array.isArray(q.options) && q.options.every(o => Object.prototype.hasOwnProperty.call(o, "is_correct"))
    );

    if (!allHaveKey) {
      // Sin claves: solo muestra un “enviado” básico
      setResult({
        total: quiz.questions.length,
        corrects: null,
        score: null,
        passed: null
      });
      return;
    }

    let corrects = 0;
    for (const q of quiz.questions) {
      const picked = answers[q.question_id];
      if (!picked) continue;
      const opt = q.options.find(o => o.option_id === picked);
      if (opt?.is_correct) corrects++;
    }
    const total = quiz.questions.length;
    const score = Math.round((corrects * 100) / Math.max(1, total));
    const passed = score >= 70; // umbral local; ajusta si lo manejas en backend

    setResult({ total, corrects, score, passed });
  }

  if (loading) return <div className="evl__loading">Cargando evaluación…</div>;

  return (
    <div className="evl__wrap" style={{ maxWidth: 900, margin: "2rem auto" }}>
      <header className="evl__header" style={{ marginBottom: 16 }}>
        <h2>Evaluación del material</h2>
        <div className="evl__badge">
          Curso: {courseId?.slice(0, 8)}… · Contenido: {materialId?.slice(0, 8)}…
        </div>
      </header>

      {err && (
        <div className="evl__error" style={{ marginBottom: 16 }}>
          {err}
          <div style={{ marginTop: 12 }}>
            <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
          </div>
        </div>
      )}

      {!err && quiz && !result && (
        <form onSubmit={onSubmit} className="evl__card" style={{ padding: 16 }}>
          {quiz.questions.map((q, idx) => (
            <div key={q.question_id} style={{ marginBottom: 18, borderBottom: "1px solid #eee", paddingBottom: 12 }}>
              <strong>{idx + 1}. {q.prompt}</strong>
              <div style={{ marginTop: 8 }}>
                {q.options.map(opt => (
                  <label key={opt.option_id} style={{ display: "block", margin: "6px 0", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={q.question_id}
                      value={opt.option_id}
                      checked={answers[q.question_id] === opt.option_id}
                      onChange={(e) => setAnswers(a => ({ ...a, [q.question_id]: e.target.value }))}
                      style={{ marginRight: 8 }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <button type="submit" className="evl__btn">Enviar</button>
            <button type="button" className="evl__btn" style={{ marginLeft: 8, background: "#888" }} onClick={() => navigate(-1)}>
              ← Cancelar
            </button>
          </div>
        </form>
      )}

      {!err && result && (
        <div className="evl__card" style={{ padding: 16 }}>
          <h3>Resultado</h3>
          {result.score == null ? (
            <>
              <p>Respuestas enviadas. (Este examen no incluye claves en la respuesta del backend.)</p>
              <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
            </>
          ) : (
            <>
              <p>Puntaje: <strong>{result.score}%</strong></p>
              <p>Correctas: <strong>{result.corrects}/{result.total}</strong></p>
              <p>Estado: <strong style={{ color: result.passed ? "#2ECC71" : "#c0392b" }}>
                {result.passed ? "APROBADO" : "REPROBADO"}
              </strong></p>
              <button className="evl__btn" onClick={() => navigate(-1)}>← Volver</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
