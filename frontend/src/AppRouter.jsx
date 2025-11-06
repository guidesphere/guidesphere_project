// src/AppRouter.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import WelcomePage from "./components/WelcomePage";
import AdminContentManager from "./components/AdminContentManager";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AdminUserManager from "./components/AdminUserManager";
import CourseForm from "./components/CourseForm";
import SearchResults from "./components/SearchResults";
import CoursePanel from "./components/CoursePanel";
import UsersPanel from "./components/UsersPanel.jsx";
import EvaluationList from "./components/EvaluationList.jsx";
import ExamViewer from "./components/ExamViewer";
import ProfessorPanel from "./components/ProfessorPanel";
import CoursesPanel from "./components/CoursesPanel";
import MyCourses from "./components/MyCourses";
import MyCertificates from "./components/MyCertificates";
import AdminStats from "./components/AdminStats";
import CourseEdit from "./components/CourseEdit";

// 🔁 Redirección automática del formato antiguo al nuevo examen
function EvalRedirect() {
  const { materialId } = useParams();
  return <Navigate to={`/user/exam?contentId=${materialId}`} replace />;
}

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Página pública inicial */}
        <Route path="/" element={<WelcomePage />} />

        {/* Panel principal de administración / landing interna */}
        <Route path="/admin" element={<AdminContentManager />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Gestión de usuarios (admin) */}
        <Route path="/admin/users" element={<AdminUserManager />} />
        <Route path="/users" element={<UsersPanel />} />

        {/* Cursos: creación, panel de gestión y mis cursos */}
        <Route path="/courses/new" element={<CourseForm />} />
        <Route path="/admin/search" element={<SearchResults />} />

        {/* Vista tipo admin de un curso concreto */}
        <Route path="/admin/course/:id" element={<CoursePanel />} />

        {/* Vista del curso para estudiante/profesor */}
        <Route path="/course/:id" element={<CoursePanel />} />

        {/* Panel de gestión de cursos (tarjetas) */}
        <Route path="/courses/panel" element={<CoursesPanel />} />

        {/* Mis cursos (estudiante/profesor) */}
        <Route path="/courses/mine" element={<MyCourses />} />

        {/* ✏️ Edición completa de curso (metadatos + contenidos) */}
        <Route path="/courses/:courseId/edit" element={<CourseEdit />} />

        {/* Panel de profesor */}
        <Route path="/professor" element={<ProfessorPanel />} />

        {/* Lista de evaluaciones del curso */}
        <Route
          path="/courses/:courseId/evaluations"
          element={<EvaluationList />}
        />

        {/* Redirección del examen antiguo */}
        <Route
          path="/courses/:courseId/evaluate/:materialId"
          element={<EvalRedirect />}
        />

        {/* Nueva vista de examen */}
        <Route path="/user/exam" element={<ExamViewer />} />

        {/* Certificados del usuario */}
        <Route path="/certificates" element={<MyCertificates />} />

        {/* Estadísticas globales (solo admin/superadmin) */}
        <Route path="/admin/stats" element={<AdminStats />} />
      </Routes>
    </Router>
  );
}
