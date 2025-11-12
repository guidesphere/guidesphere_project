import React from "react";
import "./CourseCard.css";

export default function CourseCard({ c, role="student", onView, onEdit, onTogglePub, onDuplicate, onDelete, onManage }) {
  return (
    <div className="course-card">
      <div className="course-card__head">
        <h3 className="course-card__title">{c.title}</h3>
        <span className={`badge ${c.is_published ? "badge--ok" : "badge--draft"}`}>
          {c.is_published ? "Publicado" : "Borrador"}
        </span>
      </div>

      <p className="course-card__desc">{c.description || "Sin descripción"}</p>

      <div className="course-card__meta">
        {c.owner_username && <span>👤 {c.owner_username}</span>}
        {c.created_at && <span>🗓️ {new Date(c.created_at).toLocaleDateString()}</span>}
        {(c.video_uri || c.doc_uri) && (
          <span>📎 {(c.video_uri ? "video " : "") + (c.doc_uri ? "doc" : "")}</span>
        )}
      </div>

      <div className="course-card__actions">
        <button onClick={()=>onView?.(c)}>👁️ Ver</button>

        {(role==="professor" || role==="superadmin") && (
          <>
            <button onClick={()=>onManage?.(c)}>📂 Contenido</button>
            <button onClick={()=>onEdit?.(c)}>✏️ Editar</button>
            <button onClick={()=>onTogglePub?.(c)}>{c.is_published ? "⏸️ Despublicar" : "✅ Publicar"}</button>
            <button onClick={()=>onDelete?.(c)} className="danger">🗑️ Eliminar</button>
          </>
        )}
      </div>
    </div>
  );
}
