import React, { lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { CONFIG } from "../config/env.js";
import ProtectedRoute from "../components/ProtectedRoute";
import useAppRouteTracker from "../hooks/useAppRouteTracker";
import { useApp } from "../context/AppContext";

import {
  UserRouter,
  AdminRouter,
  AuthLayout,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  VerificationSentPage,
  RegistrationSuccessPage,
  NotFoundPage,
  MaintenancePage
} from '../loadable';

// Auth Guards
export const AuthGuard = ({ children }) => {
  const { user, token, loading, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !token) {
      localStorage.setItem('returnUrl', location.pathname);
    }
  }, [loading, token, location]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!token || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to email verification page if email not verified (when required)
  if (user && !user.emailVerified && CONFIG.REQUIRE_EMAIL_VERIFICATION) {
    return <Navigate to="/auth/verify-email" replace />;
  }

  return <>{children}</>;
};

// Admin Role Guard
export const AdminGuard = ({ children }) => {
  const { user, loading, isAdmin } = useApp();
  const location = useLocation();
  
  // Show loading indicator while checking role
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Kiểm tra nghiêm ngặt quyền admin
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (!isAdmin) {
    // Ghi nhớ đường dẫn người dùng đang cố truy cập
    const fromPath = location.pathname;
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Guest Guard (prevents authenticated users from accessing login/register pages)
export const GuestGuard = ({ children }) => {
  const { user, token, loading } = useApp();
  const location = useLocation();
  const pathname = location.pathname;
  
  // Kiểm tra nếu đang ở những trang không cần redirect khi đã đăng nhập
  const whitelist = [
    '/auth/verify-email',
    '/registration-success',
    '/auth/reset-password',
    '/auth/verification-sent'
  ];
  
  const isWhitelistedPath = whitelist.some(path => pathname.startsWith(path));
  
  // Get return URL or use dashboard as default
  const from = location.state?.from?.pathname || '/dashboard';
  
  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Redirect to dashboard if already authenticated and not on whitelisted page
  if (token && user && !isWhitelistedPath) {
    return <Navigate to={from} replace />;
  }
  
  // Render children for guest routes
  return <>{children}</>;
};

// Root redirect handler
const RootRedirect = () => {
  const { user, token, loading } = useApp();
  
  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Redirect based on auth status and role
  if (!token || !user) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // Check if user is admin
  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

// Main router component
const AppRouter = () => {
  // Use the route tracker hook to update AppContext with current route
  useAppRouteTracker();
  
  return (
    <Routes>
      {/* Root path redirect */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Auth routes */}
      <Route path="/auth/*" element={
        <GuestGuard>
          <AuthLayout>
            <Routes>
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="verification-sent" element={<VerificationSentPage />} />
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </AuthLayout>
        </GuestGuard>
      } />
      
      {/* Registration success page - outside of auth layout */}
      <Route path="/registration-success" element={<RegistrationSuccessPage />} />
      
      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute requiredRoles={['admin']}>
          <AdminRouter />
        </ProtectedRoute>
      } />
      
      {/* All user routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <UserRouter />
        </ProtectedRoute>
      } />
      
      {/* Maintenance page */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* Not found page */}
      <Route path="/404" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
