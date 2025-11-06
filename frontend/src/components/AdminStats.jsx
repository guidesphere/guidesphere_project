// src/components/AdminStats.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminStatsOverview } from "../services/api";
import "./AdminContentManager.css";
import "./CoursePanel.css"; // para reutilizar estilos de caja
import logo from "../assets/logo.png";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6518af", "#f39c12", "#27ae60", "#e74c3c", "#3498db"];

export default function AdminStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const role = (currentUser?.role || "").toLowerCase();

  // Protección básica: solo admin / superadmin
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (role !== "admin" && role !== "superadmin") {
      navigate("/");
    }
  }, [currentUser, role, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAdminStatsOverview();
        if (!alive) return;
        setStats(data);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error cargando estadísticas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleBack = () => {
    navigate("/admin");
  };

  // =======================
  //  Datos para las gráficas
  // =======================

  const userRoleData = useMemo(() => {
    if (!stats) return [];
    const totalUsers = Number(stats.total_users || 0);
    const students = Number(stats.total_students || 0);
    const professors = Number(stats.total_professors || 0);
    const superadmins = Math.max(totalUsers - students - professors, 0);
    return [
      { name: "Estudiantes", value: students },
      { name: "Profesores", value: professors },
      { name: "Superadmins", value: superadmins },
    ];
  }, [stats]);

  const activitySummaryData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Cursos", value: Number(stats.total_courses || 0) },
      { name: "Matrículas", value: Number(stats.total_enrollments || 0) },
      { name: "Intentos examen", value: Number(stats.total_exam_attempts || 0) },
      { name: "Certificados", value: Number(stats.total_certificates || 0) },
    ];
  }, [stats]);

  const topEnrolledData = useMemo(() => {
    if (!stats || !Array.isArray(stats.top_enrolled)) return [];
    return stats.top_enrolled.map((c) => ({
      name: c.title || "Curso",
      value: Number(c.value || 0),
    }));
  }, [stats]);

  const topRatedData = useMemo(() => {
    if (!stats || !Array.isArray(stats.top_rated)) return [];
    return stats.top_rated.map((c) => ({
      name: c.title || "Curso",
      value: Number(c.value || 0),
    }));
  }, [stats]);

  const examVsCertData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Intentos de examen",
        value: Number(stats.total_exam_attempts || 0),
      },
      {
        name: "Certificados emitidos",
        value: Number(stats.total_certificates || 0),
      },
    ];
  }, [stats]);

  return (
    <div className="admin-container">
      {/* Header superior morado */}
      <header className="admin-header">
        <div className="branding">
          <img src={logo} alt="GuideSphere Logo" className="logo" />
          <h1 className="titulo-centrado">GuideSphere</h1>
        </div>
        <div className="user-info">
          <span>{currentUser?.email || "Usuario"}</span>
        </div>
      </header>

      {/* Banda naranja */}
      <div className="sub-header">
        <h2>Estadísticas generales</h2>
      </div>

      <main className="admin-main">
        <aside className="sidebar">
          <h3>Menú</h3>
          <button className="menu-link" onClick={handleBack}>
            ← Volver al Gestor
          </button>
        </aside>

        <section className="section-funcionalidades">
          {loading && <p>Cargando estadísticas…</p>}
          {error && (
            <p style={{ color: "crimson", fontWeight: 600 }}>{error}</p>
          )}

          {stats && !loading && !error && (
            <>
              {/* Tarjetas de totales */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <StatCard label="Usuarios" value={stats.total_users} />
                <StatCard label="Estudiantes" value={stats.total_students} />
                <StatCard label="Profesores" value={stats.total_professors} />
                <StatCard label="Cursos" value={stats.total_courses} />
                <StatCard
                  label="Matrículas"
                  value={stats.total_enrollments}
                />
                <StatCard
                  label="Intentos de examen"
                  value={stats.total_exam_attempts}
                />
                <StatCard
                  label="Certificados emitidos"
                  value={stats.total_certificates}
                />
              </div>

              {/* Fila 1: Usuarios por rol + Actividad general */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <ChartBox title="Distribución de usuarios por rol">
                  {userRoleData.length === 0 ? (
                    <p>No hay datos.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={userRoleData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6518af" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>

                <ChartBox title="Actividad general">
                  {activitySummaryData.length === 0 ? (
                    <p>No hay datos.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={activitySummaryData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f39c12" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>
              </div>

              {/* Fila 2: Top cursos por matrículas y rating */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <ChartBox title="Top cursos por matrículas">
                  {topEnrolledData.length === 0 ? (
                    <p>No hay datos todavía.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topEnrolledData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={160} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#27ae60" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>

                <ChartBox title="Top cursos por rating promedio">
                  {topRatedData.length === 0 ? (
                    <p>No hay calificaciones todavía.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topRatedData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 5]} />
                        <YAxis dataKey="name" type="category" width={160} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3498db" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>
              </div>

              {/* Fila 3: Relación exámenes vs certificados + Progresión temporal (futuro) */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "24px",
                  marginBottom: "24px",
                }}
              >
                <ChartBox title="Intentos de examen vs certificados">
                  {examVsCertData.length === 0 ? (
                    <p>No hay datos.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={examVsCertData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label
                        >
                          {examVsCertData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </ChartBox>

                <ChartBox title="Progresión temporal (pendiente)">
                  <p style={{ marginBottom: 8 }}>
                    Para mostrar una evolución semanal o mensual (matrículas,
                    intentos, certificados), necesitamos guardar datos
                    agregados por fecha.
                  </p>
                  <p style={{ marginBottom: 8 }}>
                    A futuro podríamos añadir una tabla como{" "}
                    <code>daily_stats</code> o <code>monthly_stats</code> y
                    graficar aquí la curva de crecimiento.
                  </p>
                  <p style={{ fontStyle: "italic", color: "#666" }}>
                    Por ahora se muestran solo métricas acumuladas (snapshot
                    actual).
                  </p>
                </ChartBox>
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de
        Antioquia Institución Universitaria
      </footer>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "#ffffff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        border: "1px solid #eee",
      }}
    >
      <div style={{ fontSize: "0.9rem", color: "#666" }}>{label}</div>
      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 700,
          marginTop: 4,
          color: "#6518af",
        }}
      >
        {Number(value || 0)}
      </div>
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: "280px",
        background: "#fff",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 4px 10px rgba(0,0,0,.06)",
        border: "1px solid #eee",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 12,
          color: "#6518af",
          fontSize: "1rem",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
