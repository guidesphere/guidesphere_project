// src/components/AdminUserManager.jsx
import React, { useEffect, useState } from "react";
import "./AdminUserManager.css";
import { getUsersPage, updateUser, deleteUser } from "../services/api";

function AdminUserManager() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsersPage(page, pageSize);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      alert("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleSave = async (user) => {
    try {
      await updateUser(user.id, user);
      alert("Usuario actualizado correctamente.");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      console.error("Error actualizando usuario:", err);
      alert("Error al guardar los cambios del usuario.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await deleteUser(id);
      alert("Usuario eliminado correctamente.");
      loadUsers();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      alert("Error al eliminar usuario.");
    }
  };

  const handleChange = (field, value) => {
    setEditingUser((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="admin-users-container">
      <h2>Gestión de Usuarios</h2>

      {loading ? (
        <p>Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Nombre completo</th>
              <th>Email</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {editingUser?.id === u.id ? (
                    <input
                      type="text"
                      value={editingUser.nombre_completo || ""}
                      onChange={(e) =>
                        handleChange("nombre_completo", e.target.value)
                      }
                    />
                  ) : (
                    u.nombre_completo
                  )}
                </td>
                <td>{u.email}</td>
                <td>{u.username}</td>
                <td>
                  {editingUser?.id === u.id ? (
                    <select
                      value={editingUser.role || ""}
                      onChange={(e) => handleChange("role", e.target.value)}
                    >
                      <option value="student">Estudiante</option>
                      <option value="professor">Profesor</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                  ) : (
                    u.role
                  )}
                </td>
                <td>
                  {editingUser?.id === u.id ? (
                    <>
                      <button
                        className="btn-guardar"
                        onClick={() => handleSave(editingUser)}
                      >
                        Guardar
                      </button>
                      <button
                        className="btn-cancelar"
                        onClick={() => setEditingUser(null)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-editar"
                        onClick={() => setEditingUser(u)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-eliminar"
                        onClick={() => handleDelete(u.id)}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          ◀ Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
}

export default AdminUserManager;
