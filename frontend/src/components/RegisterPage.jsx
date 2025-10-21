// src/components/RegisterPage.jsx
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import logo from "../assets/logo.png";
import { register } from "../services/api";   // 👈 importa tu API real

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // Validez del formulario (para deshabilitar el botón)
  const isValid = useMemo(() => {
    const { fullName, email, username, password, confirmPassword } = form;
    const allFilled =
      fullName.trim() &&
      email.trim() &&
      username.trim() &&
      password.trim() &&
      confirmPassword.trim();

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const passLenOk = password.length >= 4 && password.length <= 8;
    const passMatch = password === confirmPassword;

    return Boolean(allFilled && emailOk && passLenOk && passMatch);
  }, [form]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    try {
      const res = await register(form);   // 👈 llamada al backend
      console.log("Usuario registrado:", res);
      alert("Registro exitoso");
      navigate("/login");                 // redirige solo si todo salió bien
    } catch (err) {
      alert(err.message || "Error en el registro");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <img src={logo} alt="Logo GuideSphere" className="register-logo" />
          <h2 className="register-title">Crear cuenta - GuideSphere</h2>
        </div>

        <form className="register-form" onSubmit={onSubmit} noValidate>
          <div>
            <label htmlFor="fullName">Nombre completo</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Tu nombre completo"
              value={form.fullName}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Usuario"
              value={form.username}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Contraseña (4–8 caracteres)</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Contraseña"
              minLength={4}
              maxLength={8}
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirmar contraseña"
              minLength={4}
              maxLength={8}
              value={form.confirmPassword}
              onChange={onChange}
              required
            />
          </div>

          <div className="register-actions">
            <button
              type="submit"
              disabled={!isValid}
              className="register-submit"
              title={!isValid ? "Completa todos los campos correctamente" : "Registrarme"}
            >
              Registrarme
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
