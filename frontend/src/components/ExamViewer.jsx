// src/components/ExamViewer.jsx
import { useEffect, useMemo, useState } from "react";
import { EVAL_API } from "../services/api";

// === Helper para leer el usuario actual (igual que en MyCertificates) ===
function getCurrentUser() {
  try {
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("authUser");

    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const id =
      obj.id || obj.user_id || obj.userId || obj.uid || obj.uuid || null;
    const email = obj.email || obj.username || obj.name || "";

    if (!id) return null;
    return { id, email };
  } catch {
    return null;
  }
}

// Usamos la misma URL que el resto del frontend
const API_EVAL = EVAL_API;

export default function ExamViewer() {
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Usuario actual real (mismo helper que usa MyCertificates)
  const currentUser = useMemo(() => getCurrentUser(), []);

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const contentId = qs.get("contentId") || "";
  const type = (qs.get("type") || "document").toLowerCase();
  // para documentos, fileId es el basename sin extensión (ej: "1762199478782")
  const fileId = qs.get("fileId") || contentId;

  const normalize = (payload) => {
    const questions = (payload?.questions || []).map((q, i) => {
      const qid = q.id ?? q.question_id ?? `q${i + 1}`;
      const prompt = q.prompt ?? q.question ?? `Pregunta ${i + 1}`;

      const optionsArr = Array.isArray(q.options)
        ? q.options
        : Object.entries(q.options || {}).map(([key, label]) => ({
            id: key,
            text: label,
          }));

      const options = optionsArr.map((op, j) => ({
        id: op.id ?? op.option_id ?? String.fromCharCode(65 + j),
        text: op.text ?? op.label ?? String(op),
        is_correct:
          typeof op.is_correct === "boolean" ? op.is_correct : undefined,
      }));

      return { id: qid, prompt, options };
    });

    return { quiz_id: payload.quiz_id, questions };
  };

  // ============================
  // Carga / creación del examen
  // ============================
  useEffect(() => {
    let alive = true;

    (async () => {
      setErr("");
      setLoading(true);
      try {
        // 1) Intentar obtener un examen existente para este contenido
        let r = await fetch(
          `${API_EVAL}/exam/by-content/${encodeURIComponent(contentId)}`
        );

        // 2) Si no existe (404), crearlo según el tipo de recurso
        if (r.status === 404) {
          if (type === "video") {
            const make = await fetch(
              `${API_EVAL}/exam/from-video/${encodeURIComponent(
                contentId
              )}?count=5`,
              { method: "POST" }
            );
            if (!make.ok) {
              throw new Error(
                `No se pudo crear el examen (video ${make.status})`
              );
            }
          } else {
            // Documento: usar fileId (basename sin extensión)
            const make = await fetch(
              `${API_EVAL}/exam/from-document/${encodeURIComponent(
                fileId
              )}?count=5&contentId=${encodeURIComponent(contentId)}`,
              { method: "POST" }
            );
            if (!make.ok) {
              throw new Error(
                `No se pudo crear el examen (doc ${make.status})`
              );
            }
          }

          // 3) Volver a pedir el examen ya creado
          r = await fetch(
            `${API_EVAL}/exam/by-content/${encodeURIComponent(contentId)}`
          );
        }

        if (!r.ok) throw new Error(`by-content ${r.status}`);
        const json = await r.json();
        if (!alive) return;
        setData(normalize(json));
      } catch (e) {
        if (alive) setErr(e.message || "Error cargando examen");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [contentId, type, fileId]);

  // ============================
  // Envío de respuestas
  // ============================
  const onSubmit = async () => {
    try {
      setErr("");
      setResult(null);

      // Leer el usuario real desde el LocalStorage
      const me = JSON.parse(localStorage.getItem("user") || "null");
      
      if (!me || !me.id) {
      throw new Error(
        "No se encontró el usuario actual. Inicia sesión de nuevo antes de presentar el examen."
      );
    }
      const userId = me.id;
      
      const r = await fetch(`${API_EVAL}/exam/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // clave para que el backend pueda registrar intento + certificado
          "X-User-Id": userId,
        },
        body: JSON.stringify({
          content_id: contentId,
          answers,
        }),
      });

      const json = await r.json();
      if (!r.ok || !json?.ok)
        throw new Error(json?.detail || "No se pudo evaluar.");
      setResult(json);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e.message || "Error enviando examen");
    }
  };

  // ============================
  // Render
  // ============================
  if (loading) return uiWrap(contentId, <div>Cargando…</div>);
  if (err) return uiWrap(contentId, <div>{String(err)}</div>);
  if (!data || !Array.isArray(data.questions) || data.questions.length === 0)
    return uiWrap(contentId, <div>No hay examen para este contenido.</div>);

  const body = result ? (
    <ResultView result={result} />
  ) : (
    <form style={{ padding: 8 }}>
      {data.questions.slice(0, 5).map((q, idx) => (
        <div
          key={q.id}
          style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {idx + 1}. {q.prompt}
          </div>
          {q.options.map((op) => (
            <label
              key={op.id}
              style={{ display: "block", cursor: "pointer", margin: "6px 0" }}
            >
              <input
                type="radio"
                name={q.id}
                value={op.id}
                checked={answers[q.id] === op.id}
                onChange={() =>
                  setAnswers((a) => ({
                    ...a,
                    [q.id]: op.id,
                  }))
                }
                style={{ marginRight: 6 }}
              />
              {op.text}
            </label>
          ))}
        </div>
      ))}
      <button type="button" style={{ marginTop: 14 }} onClick={onSubmit}>
        Enviar
      </button>
    </form>
  );

  return uiWrap(contentId, body);
}

function ResultView({ result }) {
  const passed =
    typeof result.passed === "boolean"
      ? result.passed
      : (result.score_percent ?? 0) >= 60;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Puntaje: {result.correct_count}/{result.total_questions} (
          {result.score_percent}%)
        </div>
        <div
          style={{
            marginTop: 8,
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: passed ? "#2ecc71" : "#e74c3c",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {passed ? "Aprobado" : "No aprobado"}
        </div>
        {passed && (
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
            Si tu usuario está configurado correctamente, se habrá registrado un
            certificado para este curso.
          </div>
        )}
      </div>
      {(result.details || []).map((d, i) => (
        <div
          key={d.question_id}
          style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {i + 1}. {d.prompt}
          </div>
          {d.options.map((op) => {
            const chosen = d.selected_option_id === op.id;
            const correct = d.correct_option_id === op.id;
            const badge = correct
              ? "✅ Correcta"
              : chosen
              ? "❌ Tu respuesta"
              : "";
            const style = {
              display: "block",
              padding: "4px 8px",
              borderRadius: 6,
              margin: "4px 0",
              background: correct
                ? "#e8f9ee"
                : chosen
                ? "#fdeaea"
                : "transparent",
              fontWeight: correct || chosen ? 600 : 400,
            };
            return (
              <div key={op.id} style={style}>
                {op.text}{" "}
                {badge && <span style={{ opacity: 0.8 }}>· {badge}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function uiWrap(contentId, body) {
  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Evaluación</h2>
        <div
          style={{
            display: "inline-block",
            background: "#2ecc71",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          Contenido: {String(contentId).slice(0, 8)}…
        </div>
      </div>
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 4px 10px rgba(0,0,0,.08)",
        }}
      >
        {body}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => window.history.back()}>← Volver</button>
      </div>
    </div>
  );
}
