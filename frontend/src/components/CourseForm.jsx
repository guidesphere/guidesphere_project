// src/components/CourseForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 IMPORTANTE
import "./CourseForm.css";
import logo from "../assets/logo.png";
import { createCourse, uploadFile } from "../services/api";

function CourseForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documents, setDocuments] = useState([""]);
  const [videos, setVideos] = useState([""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate(); // 👈 hook de navegación

  const addDocument = () => setDocuments([...documents, ""]);
  const addVideo = () => setVideos([...videos, ""]);

  const handleClose = () => {
    navigate("/admin"); // 👈 redirige al panel de administrador
  };

  // Subir archivo
  const handleFileChange = async (e, type, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadFile(file, type);
      if (type === "doc") {
        const copy = [...documents];
        copy[index] = res.file.path;
        setDocuments(copy);
      } else {
        const copy = [...videos];
        copy[index] = res.file.path;
        setVideos(copy);
      }
    } catch (err) {
      setError("Error al subir archivo: " + (err.message || String(err)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const cleanDocs = documents.filter(Boolean);
      const cleanVids = videos.filter(Boolean);

      const res = await createCourse({
        title,
        description,
        passing_score: 70,
        documents: cleanDocs,
        videos: cleanVids,
      });

      setSuccess(`Curso creado: ${res.course.title}`);
      setTitle("");
      setDescription("");
      setDocuments([""]);
      setVideos([""]);
    } catch (err) {
      setError(err.message || "Error creando curso");
    }
  };

  return (
    <div className="course-container">
      <div className="course-card" style={{ position: "relative" }}>
        {/* 👇 Botón cerrar dentro del área */}
        <button
          type="button"
          className="btn-close"
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            background: "transparent",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ✖
        </button>

        <div className="course-header">
          <img src={logo} alt="GuideSphere Logo" />
          <h2>Crear nuevo curso</h2>
        </div>

        <form className="course-form" onSubmit={handleSubmit}>
          {/* Columna izquierda */}
          <div>
            <label htmlFor="title">Título del curso</label>
            <input
              id="title"
              placeholder="Ej: Fundamentos de React"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              placeholder="Breve descripción del curso"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Columna derecha */}
          <div>
            <label>Documentos</label>
            {documents.map((doc, i) => (
              <div key={i} className="file-row">
                <input
                  type="text"
                  placeholder="Selecciona o pega un enlace"
                  value={doc}
                  readOnly
                />
                <div className="btn-row">
                  <button type="button" className="btn-small" onClick={addDocument}>
                    + Agregar documento
                  </button>
                  <label className="btn-small file-btn">
                    Seleccionar archivo
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "doc", i)}
                    />
                  </label>
                </div>
              </div>
            ))}

            <label>Videos</label>
            {videos.map((vid, i) => (
              <div key={i} className="file-row">
                <input
                  type="text"
                  placeholder="Selecciona o pega un enlace"
                  value={vid}
                  readOnly
                />
                <div className="btn-row">
                  <button type="button" className="btn-small" onClick={addVideo}>
                    + Agregar video
                  </button>
                  <label className="btn-small file-btn">
                    Seleccionar archivo
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "video", i)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="register-actions">
            <button type="submit" className="btn">Guardar curso</button>
          </div>
        </form>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && <p style={{ color: "green" }}>{success}</p>}
      </div>
    </div>
  );
}

export default CourseForm;
