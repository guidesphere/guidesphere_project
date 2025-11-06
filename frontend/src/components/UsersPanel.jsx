import { useState, useEffect, useMemo } from "react";
import "./UsersPanel.css";
import { getUsersPage, getCurrentUser, updateUser, deleteUser } from "../services/api";

export default function UsersPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  }, []);
  const role = (currentUser?.role || "student").toLowerCase();

  const canEdit       = (u) => role === "superadmin" || currentUser?.id === u.id;
  const canChangeRole = role === "superadmin";
  const canDelete     = (u) => role === "superadmin" && currentUser?.id !== u.id;

  async function load(pageArg = 1) {
    setLoading(true);
    setError("");
    try {
      if (role === "superadmin") {
        const data = await getUsersPage(pageArg, pageSize);
        setRows(Array.isArray(data.users) ? data.users : []);
        setTotal(Number(data.total || 0));
        setPage(Number(data.page || pageArg));
      } else {
        const me = await getCurrentUser();
        setRows(me ? [me] : []);
        setTotal(me ? 1 : 0);
        setPage(1);
      }
    } catch (e) {
      console.error("users load error:", e);
      setRows([]);
      setTotal(0);
      setError(e?.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); /* al montar */ }, [role]);
  useEffect(() => { if (role === "superadmin") load(page); }, [page]); // paginación sólo para superadmin

  return (
    <section className="up-panel">
      <header className="up-header">
        <h2 className="up-title">Panel de Usuarios</h2>
        <span className="up-subtitle">Acceso exclusivo</span>
      </header>

      <div className="up-toolbar">
        <div className="up-toolbar-left">
          <input type="search" className="up-input up-input--search" placeholder="Buscar por nombre, correo o usuario…" aria-label="Buscar usuarios" disabled />
          <select className="up-select" aria-label="Filtrar por rol" disabled>
            <option value="">Todos los roles</option>
            <option>Estudiante</option>
            <option>Profesor</option>
            <option>Superadmin</option>
          </select>
        </div>
        <div className="up-toolbar-right">
          <button className="up-btn up-btn--primary up-btn--sm" onClick={() => (window.location.href = "/admin")}>🚪 Salir</button>
        </div>
      </div>

      <div className="up-card">
        {loading ? (
          <p style={{ textAlign: "center" }}>Cargando…</p>
        ) : error ? (
          <p style={{ textAlign: "center", color: "red" }}>{error}</p>
        ) : (
          <div className="up-table-wrap">
            <table className="up-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo electrónico</th>
                  <th>Usuario</th>
                  <th>Tipo de usuario</th>
                  <th>Asignar contraseña</th>
                  <th className="up-col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(rows || []).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="text"
                        value={(u.first_name ? u.first_name : "") + (u.last_name ? " " + u.last_name : "")}
                        className="up-input up-input--sm"
                        disabled={!canChangeRole}
                        onChange={(e) => {
                          if (!canChangeRole) return;
                          const [first, ...rest] = e.target.value.split(" ");
                          setRows(rs => rs.map(r => r.id === u.id ? { ...r, first_name: first || "", last_name: rest.join(" ") } : r));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={u.email || ""}
                        className="up-input up-input--sm"
                        disabled={!canChangeRole}
                        onChange={(e) => {
                          if (!canChangeRole) return;
                          const val = e.target.value;
                          setRows(rs => rs.map(r => r.id === u.id ? { ...r, email: val } : r));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={u.username || ""}
                        className="up-input up-input--sm"
                        disabled={!canChangeRole}
                        onChange={(e) => {
                          if (!canChangeRole) return;
                          const val = e.target.value;
                          setRows(rs => rs.map(r => r.id === u.id ? { ...r, username: val } : r));
                        }}
                      />
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => setRows(rs => rs.map(r => r.id === u.id ? { ...r, role: e.target.value } : r))}
                        className="up-select up-select--sm"
                        disabled={!canChangeRole}
                      >
                        <option value="student">Estudiante</option>
                        <option value="professor">Profesor</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="password"
                        placeholder="Nueva contraseña"
                        className="up-input up-input--sm"
                        value={u._newPass || ""}
                        onChange={(e) =>
                          setRows(rs => rs.map(r => r.id === u.id ? { ...r, _newPass: e.target.value } : r))
                        }
                        disabled={!canEdit(u)}
                      />
                    </td>
                    <td className="up-actions">
                      <div className="up-actions-row">
                        <button
                          className="up-btn up-btn--secondary up-btn--xs"
                          onClick={async () => {
                            try {
                              const payload = {
                                email: u.email,
                                username: u.username,
                                first_name: u.first_name || "",
                                last_name: u.last_name || "",
                                role: u.role,
                              };
                              if (u._newPass && u._newPass.trim()) {
                                payload.new_password = u._newPass.trim(); // backend guarda en texto plano según configuración actual
                              }
                              if (!canChangeRole) {
                                // usuario normal: sólo puede cambiar su propia contraseña
                                if (currentUser?.id !== u.id) {
                                  alert("Solo puedes actualizar tu propia contraseña.");
                                  return;
                                }
                                if (!payload.new_password) {
                                  alert("Escribe la nueva contraseña.");
                                  return;
                                }
                                // limitar campos para no permitir cambios extra
                                delete payload.email;
                                delete payload.username;
                                delete payload.first_name;
                                delete payload.last_name;
                                delete payload.role;
                              }
                              await updateUser(u.id, payload);
                              setRows(rs => rs.map(r => r.id === u.id ? { ...r, _newPass: "" } : r));
                              alert("Usuario actualizado");
                            } catch (e) {
                              alert(e.message || "Error al guardar");
                            }
                          }}
                        >
                          💾 Guardar
                        </button>

                        <button
                          className="up-btn up-btn--ghost up-btn--xs"
                          onClick={async () => {
                            if (!canDelete(u)) { alert("Acceso denegado"); return; }
                            if (!confirm("¿Eliminar este usuario?")) return;
                            try {
                              await deleteUser(u.id);
                              setRows(rs => rs.filter(r => r.id !== u.id));
                            } catch (e) {
                              alert(e.message || "Error eliminando usuario");
                            }
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(rows || []).length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center" }}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="up-pagination">
        <button
          className="up-btn up-btn--ghost"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1 || role !== "superadmin"}
        >
          « Anterior
        </button>
        <span className="up-page-info">Página {page} de {totalPages}</span>
        <button
          className="up-btn up-btn--ghost"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || role !== "superadmin"}
        >
          Siguiente »
        </button>
      </div>
    </section>
  );
}
