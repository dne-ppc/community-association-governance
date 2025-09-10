import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { store } from './store';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Layout
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import Documents from './pages/documents/Documents';
import DocumentDetail from './pages/documents/DocumentDetail';
import DocumentCreate from './pages/documents/DocumentCreate';
import DocumentEdit from './pages/documents/DocumentEdit';
import Categories from './pages/categories/Categories';
import Approvals from './pages/approvals/Approvals';
import Users from './pages/users/Users';
import UserProfile from './pages/users/UserProfile';
import Search from './pages/Search';
import Settings from './pages/Settings';

// Components
import PrivateRoute from './components/PrivateRoute';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <AuthProvider>
            <NotificationProvider>
              <Router>
                <Routes>
                  {/* Auth Routes */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                  </Route>

                  {/* Protected Routes */}
                  <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    
                    {/* Documents */}
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/documents/create" element={<DocumentCreate />} />
                    <Route path="/documents/:id" element={<DocumentDetail />} />
                    <Route path="/documents/:id/edit" element={<DocumentEdit />} />
                    
                    {/* Categories */}
                    <Route path="/categories" element={<Categories />} />
                    
                    {/* Approvals */}
                    <Route path="/approvals" element={<Approvals />} />
                    
                    {/* Users */}
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:id" element={<UserProfile />} />
                    <Route path="/profile" element={<UserProfile />} />
                    
                    {/* Search */}
                    <Route path="/search" element={<Search />} />
                    
                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Routes>
              </Router>
            </NotificationProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
};

export default App;