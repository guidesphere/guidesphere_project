// src/components/MyCertificates.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EVAL_API } from "../services/api";

// Lee y normaliza el usuario actual desde localStorage
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

export default function MyCertificates() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleBack = () => {
    // simplemente regresa a la vista anterior (curso o lo que haya antes)
    navigate(-1);
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setError("No se encontró el usuario actual. Inicia sesión de nuevo.");
      return;
    }

    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await fetch(`${EVAL_API}/certificates/me`, {
          headers: { "X-User-Id": currentUser.id },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json.ok) throw new Error(json.detail || "Error del servidor.");
        if (!alive) return;
        setItems(json.items || []);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error cargando certificados.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentUser]);

  const handleOpen = (item) => setSelected(item);
  const handleClose = () => setSelected(null);
  const handlePrint = () => window.print();

  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <div style={pageWrapStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>Mis certificados</h2>
          <button style={backButtonStyle} onClick={handleBack}>
            ← Volver atrás
          </button>
        </div>

        <p>
          Estos certificados se generan automáticamente al aprobar un examen de
          curso con al menos 60% de puntaje.
        </p>

        {loading && <p>Cargando certificados…</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}

        {!loading && !error && !hasItems && (
          <p style={{ marginTop: 16 }}>
            Todavía no tienes certificados emitidos.
          </p>
        )}

        {hasItems && (
          <div style={{ marginTop: 20, overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Curso</th>
                  <th style={thStyle}>Puntaje</th>
                  <th style={thStyle}>Emitido</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>{c.course_title || c.course_id}</td>
                    <td style={tdStyle}>
                      {(c.score_percent ?? 0).toFixed(2)}%
                    </td>
                    <td style={tdStyle}>
                      {c.issued_at
                        ? new Date(c.issued_at).toLocaleString()
                        : "-"}
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => handleOpen(c)}
                        style={viewButtonStyle}
                      >
                        Ver / Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div style={modalOverlayStyle} onClick={handleClose}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={certificateFrameStyle}>
              <div style={certificateInnerStyle}>
                <h2>Certificado de finalización</h2>
                <p style={{ fontSize: "0.9rem", color: "#555" }}>
                  Emitido por GuideSphere
                </p>
                <p style={{ marginTop: 24 }}>Se certifica que</p>
                <h3 style={{ margin: 0, color: "#2c3e50" }}>
                  {currentUser?.email}
                </h3>
                <p style={{ marginTop: 24 }}>
                  ha completado satisfactoriamente el curso
                </p>
                <h4 style={{ margin: 0, color: "#2c3e50" }}>
                  {selected.course_title || selected.course_id}
                </h4>
                <p style={{ marginTop: 24 }}>
                  Puntaje: <strong>{(selected.score_percent ?? 0).toFixed(2)}%</strong>
                </p>
                <p>
                  Fecha:{" "}
                  <strong>
                    {selected.issued_at
                      ? new Date(selected.issued_at).toLocaleString()
                      : "-"}
                  </strong>
                </p>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button style={printButtonStyle} onClick={handlePrint}>
                Imprimir / PDF
              </button>
              <button style={closeButtonStyle} onClick={handleClose}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* === Estilos === */
const pageWrapStyle = { maxWidth: 900, margin: "2rem auto", padding: "0 1rem" };
const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
};
const backButtonStyle = {
  background: "#6518af",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "6px 14px",
  cursor: "pointer",
  fontWeight: 600,
};
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #eee",
  background: "#fafafa",
};
const tdStyle = { padding: "8px 10px", borderBottom: "1px solid #f2f2f2" };
const viewButtonStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "none",
  background: "#2ecc71",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.85rem",
};
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const modalContentStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  maxWidth: 720,
  width: "100%",
};
const certificateFrameStyle = {
  border: "3px solid #2ecc71",
  borderRadius: 16,
  padding: 24,
};
const certificateInnerStyle = { textAlign: "center" };
const printButtonStyle = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "none",
  background: "#27ae60",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.9rem",
};
const closeButtonStyle = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid #ccc",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
  fontSize: "0.9rem",
};
