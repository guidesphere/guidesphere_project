import React from 'react';
import './WelcomePage.css';
import logo from '../assets/logo.png';
import registroIcon from '../assets/registro.png';
import { useNavigate, Link } from 'react-router-dom'; // 👈 agrega Link

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <div className="branding">
          <img src={logo} alt="Logo GuideSphere" className="logo" />
          <h2>GuideSphere</h2>
        </div>
        <div className="user-info">
          <Link to="/register" className="register-link">Regístrate</Link> {/* 👈 aquí */}
          <img src={registroIcon} alt="Registro" className="avatar" />
        </div>
      </header>

      <div className="sub-header">
        <h2>Tu Gestor de Conocimiento</h2>
      </div>

      <main className="welcome-main">
        <div className="bienvenida-box">
          <h2>¡Bienvenido a GuideSphere!</h2>
          <p>Una plataforma diseñada para ayudarte a organizar, compartir y potenciar el conocimiento en tu organización de forma efectiva y segura.</p>
          <button className="boton-ingresar" onClick={() => navigate('/login')}>
            🚀 Ingresar
          </button>
        </div>
      </main>

      <footer className="admin-footer">
        Proyecto GuideSphere por María Juliana Yepez Restrepo - Tecnológico de Antioquia Institución Universitaria
      </footer>
    </div>
  );
}

export default WelcomePage;
