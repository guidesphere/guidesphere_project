// src/components/ProfessorPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./UsersPanel.css";
import { getCourses, deleteCourse } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function ProfessorPanel() {
  const navigate = useNavigate();

  // Usuario actual
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  // Rol normalizado
  const role = (currentUser?.role || "student").toLowerCase();

  // Protección de acceso
  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/login");
  }, [navigate]);

  if (!["professor", "superadmin"].includes(role))
    return <div style={{ padding: "2rem" }}>Acceso denegado.</div>;

  // Estados locales
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [profId, setProfId] = useState(role === "superadmin" ? "ALL" : currentUser?.id);

  // Cargar cursos
  const load = async (p = page) => {
    try {
      const scope = role === "superadmin" ? (profId === "ALL" ? "all" : "by_prof") : "mine";
      const res = await getCourses({ scope, professorId: profId, page: p, q });
      setRows(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("Error cargando cursos:", err);
      alert("No se pudieron cargar los cursos.");
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId]);

  // Eliminar curso
  const onDelete = async (id) => {
    if (!confirm("¿Eliminar el curso completo?")) return;
    try {
      await deleteCourse(id);
      load(1);
    } catch (err) {
      console.error("Error eliminando curso:", err);
      alert("No se pudo eliminar el curso.");
    }
  };

  // Paginación
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="evl__wrap">
      <div className="evl__header" style={{ marginBottom: "1rem" }}>
        <h2>Panel de Profesor</h2>
        <p>Acceso exclusivo</p>
      </div>

      {/* Barra de búsqueda */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
          placeholder="Buscar por título..."
          className="evl__input"
          style={{ minWidth: 360 }}
        />
        {role === "superadmin" && (
          <select
            value={profId}
            onChange={(e) => setProfId(e.target.value)}
            className="evl__select"
          >
            <option value="ALL">Todos los profesores</option>
            {/* Aquí podrías agregar más opciones dinámicas si el backend lo soporta */}
          </select>
        )}
        <button className="btn-primary" onClick={() => load(1)}>
          Buscar
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setQ("");
            load(1);
          }}
        >
          Limpiar
        </button>
        <button
          className="btn-warning"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          Salir
        </button>
      </div>

      {/* Tabla de cursos */}
      <div className="evl__card">
        <div className="evl__grid evl__thead">
          <div>Título</div>
          <div>Descripción</div>
          <div>Estado</div>
          <div>Acciones</div>
        </div>

        {rows.map((c) => (
          <div key={c.id} className="evl__grid evl__row">
            <input defaultValue={c.title} readOnly className="evl__input" />
            <input defaultValue={c.short_description || ""} readOnly className="evl__input" />
            <select defaultValue={c.status || "draft"} disabled className="evl__select">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => navigate(`/courses/${c.id}/edit`)}
              >
                Editar
              </button>
              <button className="btn-danger" onClick={() => onDelete(c.id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {rows.length === 0 && <div style={{ padding: "1rem" }}>Sin cursos para mostrar.</div>}
      </div>

      {/* Paginación */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
        <button
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => {
            setPage((p) => p - 1);
            load(page - 1);
          }}
        >
          « Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          className="btn-secondary"
          disabled={page >= totalPages}
          onClick={() => {
            setPage((p) => p + 1);
            load(page + 1);
          }}
        >
          Siguiente »
        </button>
      </div>
    </div>
  );
}
