// src/components/MyCourses.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses } from "../services/api";
import CourseCard from "./CourseCard";
import "./CoursesPanel.css";

export default function MyCourses() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 👇 2 columnas x 3 filas = 6 cursos por página
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getCourses({
          scope: "enrolled", // cursos en los que estoy inscrito
          page,
          q: q.trim(),
          pageSize, // 👈 le pedimos 6 cursos por página al backend
        });
        if (!alive) return;
        setItems(data.courses || []);
        setTotal(data.total || 0);
      } catch (e) {
        console.error("MyCourses load error:", e);
        if (alive) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, q, pageSize]);

  const handleView = (c) => {
    if (!c?.id) return;
    // Pasamos el curso completo en el estado de navegación
    navigate(`/course/${c.id}`, { state: { course: c } });
  };

  const handleSearchSubmit = (evt) => {
    evt.preventDefault();
    setPage(1);
  };

  const handleLogout = () => {
  navigate("/admin");
  };

  return (
    <section className="my-courses">
      <header className="cp-header">
        <div className="cp-title-wrap">
          <h2 className="cp-title">Mis Cursos</h2>
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
            className="cp-logout-btn"
            onClick={handleLogout}
          >
            🚪 Salir
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Cargando…</p>
      ) : (
        <>
          <div className="cp-grid">
            {items.map((c) => (
              <CourseCard key={c.id} c={c} role="student" onView={handleView} />
            ))}
          </div>

          {!loading && items.length === 0 && (
            <p style={{ textAlign: "center", marginTop: "2rem" }}>
              Aún no estás inscrito en ningún curso.
            </p>
          )}

          {/* Paginación */}
          {total > pageSize && (
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
