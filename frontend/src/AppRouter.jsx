import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import AdminContentManager from './components/AdminContentManager';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminUserManager from './components/AdminUserManager';
import UserManagement from './components/UserManagement';
import CourseForm from "./components/CourseForm";
import SearchResults from "./components/SearchResults";
import CoursePanel from "./components/CoursePanel";

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />

        {/* Panel principal del admin */}
        <Route path="/admin" element={<AdminContentManager />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Gestión de usuarios */}
        <Route path="/admin/users" element={<AdminUserManager />} />
        <Route path="/users" element={<UserManagement />} />

        {/* Crear curso */}
        <Route path="/courses/new" element={<CourseForm />} />

        {/* Búsqueda y panel del curso */}
        <Route path="/admin/search" element={<SearchResults />} />
        <Route path="/admin/course/:id" element={<CoursePanel />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
