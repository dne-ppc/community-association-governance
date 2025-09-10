import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import DocumentEditPage from './pages/DocumentEditPage';
import CategoriesPage from './pages/CategoriesPage';
import ApprovalsPage from './pages/ApprovalsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Box>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/documents/:id/edit" element={<DocumentEditPage />} />
        <Route path="/documents/new" element={<DocumentEditPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;