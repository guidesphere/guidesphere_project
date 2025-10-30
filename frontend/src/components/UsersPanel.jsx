import { useState, useEffect, useMemo } from "react";
import "./UsersPanel.css";
import { getUsers, getUsersPage, getCurrentUser, updateUser, deleteUser } from "../services/api";

export default function UsersPanel() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
    }, []);
    const role = currentUser?.role || "student";

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
            setLoading(true);
            if (role === "superadmin") {
                const data = await getUsersPage(page, pageSize);
                if (alive) { setRows(data.users); setTotal(data.total); }
            } else {
                const me = await getCurrentUser();
                if (alive) { setRows([me]); setTotal(1); if (page !== 1) setPage(1); }
            }
            } catch (e) {
            console.error("users load error:", e);
            if (alive) { setRows([]); setTotal(0); }
            } finally {
            if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
        }, [role, page, pageSize]);


  return (
    <section className="up-panel">
      <header className="up-header">
        <h2 className="up-title">Panel de Usuarios</h2>
        <span className="up-subtitle">Acceso exclusivo</span>
      </header>



      

      {/* Toolbar */}
      <div className="up-toolbar">
        <div className="up-toolbar-left">
          <input
            type="search"
            className="up-input up-input--search"
            placeholder="Buscar por nombre, correo o usuario…"
            aria-label="Buscar usuarios"
          />
          <select className="up-select" aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            <option>Estudiante</option>
            <option>Profesor</option>
            <option>Admin</option>
            <option>Superadmin</option>
            <option>Owner</option>
          </select>
        </div>
        <div className="up-toolbar-right">
          <button
                className="up-btn up-btn--primary up-btn--sm"
                onClick={() => window.location.href = "/admin"}
            >
                🚪 Salir
           </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="up-card">
        {loading ? (
          <p>Cargando…</p>
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
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="text"
                        value={u.nombre_completo || `${u.first_name || ""} ${u.last_name || ""}`.trim()}
                        className="up-input up-input--sm"               
                        disabled={role !== "superadmin"}                
                        onChange={(e) => {
                        if (role !== "superadmin") return;            
                        const [first, ...rest] = e.target.value.split(" ");
                        const copy = rows.slice();
                        copy.find(r => r.id === u.id).first_name = first || "";
                        copy.find(r => r.id === u.id).last_name  = rest.join(" ");
                        setRows(copy);
                        }}
                    />
                    </td>
                    <td>
                      <input
                        type="email"
                        value={u.email}
                        className="up-input up-input--sm"
                        disabled={role !== "superadmin"}                
                        onChange={(e) => {
                        if (role !== "superadmin") return;            
                        const copy = rows.slice();
                        copy.find(r => r.id === u.id).email = e.target.value;
                        setRows(copy);
                        }}
                    />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={u.username}
                        className="up-input up-input--sm"
                        disabled={role !== "superadmin"}                
                        onChange={(e) => {
                        if (role !== "superadmin") return;            
                        const copy = rows.slice();
                        copy.find(r => r.id === u.id).username = e.target.value;
                        setRows(copy);
                        }}
                    />
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => {
                            const copy = rows.slice();
                            copy.find(r => r.id===u.id).role = e.target.value;
                            setRows(copy);
                        }}
                        className="up-select up-select--sm"
                        disabled={role !== "superadmin"}
                        >
                        <option value="student">Estudiante</option>
                        <option value="professor">Profesor</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="password"
                        placeholder="Nueva contraseña"
                        className="up-input up-input--sm"
                        data-pw={u.id}
                    />
                    </td>
                    <td className="up-actions">
                      <div className="up-actions-row">
                        <button
                        className="up-btn up-btn--secondary up-btn--xs"
                        onClick={async () => {
                            const pwInput = document.querySelector(`input[data-pw="${u.id}"]`);
                            const password = (pwInput?.value || "").trim();

                            if (role !== "superadmin") {
                            const me = JSON.parse(localStorage.getItem("user") || "null");
                            if (!me || String(me.id) !== String(u.id)) {
                                alert("Solo puedes actualizar tu propia contraseña.");
                                return;
                            }
                            if (!password) { alert("Escribe la nueva contraseña."); return; }
                            try {
                                await updateUser(u.id, { password });
                                if (pwInput) pwInput.value = "";
                                alert("Contraseña actualizada");
                            } catch (e) { alert(e.message); }
                                return;
                            }

                            const payload = {
                            email: u.email,
                            username: u.username,
                            first_name: u.first_name || "",
                            last_name: u.last_name || "",
                            role: u.role,
                            ...(password ? { password } : {}),
                            };
                            try {
                            await updateUser(u.id, payload);
                            if (pwInput) pwInput.value = "";
                            alert("Usuario actualizado");
                            } catch (e) { alert(e.message); }
                        }}
                        >
                        💾 Guardar
                        </button>

                        <button
                        className="up-btn up-btn--ghost up-btn--xs"
                        onClick={async () => {
                            if (role !== "superadmin") { alert("Acceso Denegado"); return; }
                            if (!confirm("¿Eliminar este usuario?")) return;
                            try {
                            await deleteUser(u.id);
                            setRows(rows.filter(r => r.id !== u.id));
                            } catch (e) { alert(e.message); }
                        }}
                        >
                            🗑️ Eliminar
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center" }}>Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

        {/* Paginación (visual) */}
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


