// src/AppRouter.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import EvaluationForm from "./components/EvaluationForm"; // 👈 FALTABA ESTE IMPORT

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/admin" element={<AdminContentManager />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/users" element={<AdminUserManager />} />
        <Route path="/courses/new" element={<CourseForm />} />
        <Route path="/admin/search" element={<SearchResults />} />
        <Route path="/admin/course/:id" element={<CoursePanel />} />
        <Route path="/users" element={<UsersPanel />} />
        {/* lista de evaluaciones del curso */}
        <Route path="/courses/:courseId/evaluations" element={<EvaluationList />} />
        {/* formulario/página de evaluación de un material */}
        <Route path="/courses/:courseId/evaluate/:materialId" element={<EvaluationForm />} />
      </Routes>
    </Router>
  );
}
