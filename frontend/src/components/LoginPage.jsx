// src/components/LoginPage.jsx
import React, { useRef, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./LoginPage.css";
import { login } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const passRef  = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // nombres aleatorios para romper autofill
  const afix = useMemo(() => Math.random().toString(36).slice(2), []);

  // limpia inputs al montar (doble pasada para ganarle al autofill)
  useEffect(() => {
    const wipe = () => {
      if (emailRef.current) emailRef.current.value = "";
      if (passRef.current)  passRef.current.value  = "";
    };
    wipe();
    const t1 = setTimeout(wipe, 120);
    const t2 = setTimeout(wipe, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = (emailRef.current?.value || "").trim();
    const password = passRef.current?.value || "";
    if (!email || !password) { setError("Por favor completa todos los campos."); return; }

    setError(""); setLoading(true);
    try {
      const data = await login({ email, password });
      localStorage.setItem("user", JSON.stringify(data.user));
      // limpiar antes de salir para que /login vuelva vacío si regresan
      if (emailRef.current) emailRef.current.value = "";
      if (passRef.current)  passRef.current.value  = "";
      navigate("/admin");
    } catch (err) {
      console.error(err);
      setError(err.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => navigate("/register");

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo" className="logo" />
        <h2 className="login-title">Iniciar Sesión - GuideSphere</h2>

        <form className="login-form" onSubmit={handleLogin} autoComplete="off">
          <label htmlFor="email">Email</label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            name={`email_${afix}`}
            placeholder="Correo electrónico"
            autoComplete="username"
            readOnly
            onFocus={(e) => e.target.readOnly = false}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            ref={passRef}
            id="password"
            type="password"
            name={`password_${afix}`}
            placeholder="Contraseña"
            autoComplete="new-password"
            readOnly
            onFocus={(e) => e.target.readOnly = false}
          />

          {error && <p style={{ color: "red", fontSize: 14 }}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <button type="button" className="register-button" onClick={handleRegisterClick}>
          Regístrate
        </button>
      </div>
    </div>
  );
}
