// src/components/CoursesPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses, publishCourse, deleteCourse } from "../services/api";
import CourseCard from "./CourseCard";
import "./CoursesPanel.css";

const PAGE_SIZE = 6; // 2 columnas x 3 filas

export default function CoursesPanel() {
  const navigate = useNavigate();

  // Usuario actual
  const me = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "null"),
    []
  );
  const role = (me?.role || "").toLowerCase();

  // superadmin ve todos, profesor solo los suyos
  const scope = role === "superadmin" ? "all" : "mine";

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0); // fuerza recarga tras acciones

  // Cargar cursos del scope y query, y paginar en frontend
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await getCourses({
          scope,
          page: 1,
          q,
          pageSize: 1000, // traemos “muchos” y paginamos nosotros
        });
        const list = d.courses || [];
        setItems(list);
        setTotal(list.length);
        setPage(1); // siempre volver a página 1 al cambiar filtro
      } catch (e) {
        console.error(e);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [scope, q, reload]);

  // Asegura que la página actual nunca sea mayor que el total de páginas
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(Math.max(total, 0) / PAGE_SIZE));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [total, page]);

  const totalPages = Math.max(1, Math.ceil(Math.max(total, 0) / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleItems = items.slice(startIndex, startIndex + PAGE_SIZE);

  // 👁 Ver curso como estudiante
  const onView = (c) => {
    navigate(`/course/${c.id}`, { state: { course: c } });
  };

  // 📁 Gestionar contenido (usa CoursePanel en modo gestión admin)
  const onManage = (c) => {
    navigate(`/admin/course/${c.id}`, { state: { course: c } });
  };

  // ✏️ Edición completa (metadatos + contenidos)
  const onEdit = (c) => {
    navigate(`/courses/${c.id}/edit`);
  };

  const onTogglePub = async (c) => {
    try {
      await publishCourse(c.id, !c.is_published);
      setReload((x) => x + 1);
    } catch (e) {
      alert(e.message || "Error al cambiar estado de publicación");
    }
  };

  const onDelete = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.title}"?`)) return;
    try {
      await deleteCourse(c.id);
      setReload((x) => x + 1);
    } catch (e) {
      alert(e.message || "Error eliminando curso");
    }
  };

  const handleSearchSubmit = (evt) => {
    evt.preventDefault();
    setPage(1); // el efecto ya recarga por cambio en q
  };

  const handleExit = () => {
    // salir al gestor de contenido
    navigate("/admin");
  };

  return (
    <section className="courses-panel my-courses">
      <header className="cp-header">
        <div className="cp-title-wrap">
          <h2 className="cp-title">
            Gestión de Cursos {scope === "all" ? "(todos)" : "(mis cursos)"}
          </h2>
        </div>

        <div className="cp-header-right">
          <form className="cp-search" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder="Buscar por título o descripción…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="cp-search-btn">
              🔍 Buscar
            </button>
          </form>

          <button
            type="button"
            className="cp-exit-btn"
            onClick={handleExit}
          >
            📋 Salir
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Cargando…</p>
      ) : (
        <>
          <div className="cp-grid">
            {visibleItems.map((c) => (
              <CourseCard
                key={c.id}
                c={c}
                role={role}
                onView={onView}
                onManage={onManage}
                onEdit={onEdit}
                onTogglePub={onTogglePub}
                onDelete={onDelete}
              />
            ))}
          </div>

          {!loading && visibleItems.length === 0 && (
            <p style={{ textAlign: "center", marginTop: "2rem" }}>
              No hay cursos.
            </p>
          )}

          {/* Paginación 2x3 */}
          {total > PAGE_SIZE && (
            <footer className="cp-pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                « Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
              >
                Siguiente »
              </button>
            </footer>
          )}
        </>
      )}
    </section>
  );
}
