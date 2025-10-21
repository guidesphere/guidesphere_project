import React, { useEffect, useState } from "react";
import "./AdminContentManager.css"; // reutilizamos estilos base
import logo from "../assets/logo.png";
import fotoPerfil from "../assets/foto.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchCourses } from "../services/api";

export default function SearchResults() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qParam = (params.get("q") || "").trim();

  // estado de búsqueda y resultados
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState(qParam);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = qParam ? await searchCourses(qParam) : { results: [] };
        setResults(data?.results || []);
      } catch (e) {
        setError("No se pudieron obtener los resultados.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [qParam]);

  const submitNewSearch = () => {
    const next = (searchText || "").trim();
    if (!next) return;
    // 👉 esta ruta DEBE coincidir con AppRouter
    navigate(`/admin/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>
        <div className="user-info">
          <img src={fotoPerfil} alt="Foto de perfil" className="avatar" />
          <span>Profesor</span>
        </div>
      </header>

      {/* Subheader */}
      <div className="sub-header">
        <h2>Resultados de Búsqueda</h2>
      </div>

      {/* Contenido */}
      <main className="admin-main">
        {/* sin sidebar aquí, solo el panel central */}
        <section className="section-funcionalidades results-section">
          {/* barra con buscador y volver */}
          <div className="results-toolbar">
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar curso por título o descripción…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNewSearch()}
              />
              <button className="btn-buscar" onClick={submitNewSearch}>
                Buscar
              </button>
            </div>

            <button className="btn-buscar" onClick={() => navigate("/admin")}>
              Volver
            </button>
          </div>

          {/* información del término actual */}
          <div className="results-term" style={{ marginTop: 10, textAlign: "left" }}>
            {qParam ? <>Buscaste: <strong>“{qParam}”</strong></> : "Sin término de búsqueda"}
          </div>

          {loading && <p style={{ textAlign: "left" }}>Cargando…</p>}
          {error && <p style={{ color: "red", textAlign: "left" }}>{error}</p>}

          {!loading && !error && results.length === 0 && (
            <p className="no-matches" style={{ textAlign: "left" }}>
              No hay coincidencias.
            </p>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="results-list">
              {results.map((c) => (
                <li key={c.id} className="results-item">
                  <div className="results-main">
                    <strong>{c.title}</strong>
                    {c.description ? <span className="muted"> — {c.description}</span> : null}
                  </div>
                  <div className="results-actions">
                    {/* 👉 Debe coincidir con AppRouter: /admin/course/:id */}
                    <button
                      className="btn-primary"
                      onClick={() => navigate(`/admin/course/${c.id}`)}
                    >
                      Seleccionar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de Antioquia Institución Universitaria
      </footer>
    </div>
  );
}
