import React, { lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { Box, CircularProgress } from "@mui/material";
import { CONFIG } from "../config/env.js";

// Import loadable components from @loadable folder
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
  const { currentUser, userProfile, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Store the current path for redirection after login
    if (!loading && !currentUser) {
      localStorage.setItem('returnUrl', location.pathname);
    }
  }, [loading, currentUser, location]);

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to email verification page if email not verified (when required)
  if (currentUser && !currentUser.emailVerified && CONFIG.REQUIRE_EMAIL_VERIFICATION) {
    return <Navigate to="/auth/verify-email" replace />;
  }

  // Handle the case where we have a user but no profile data
  if (currentUser && !userProfile && !loading) {
    // If the user has no profile, sign them out and redirect to login
    signOut().then(() => {
      // User has no profile data. Signing out.
    }).catch((error) => {
      // Error signing out
    });
    
    return <Navigate to="/auth/login" replace />;
  }

  // If all checks pass, render the children components
  return <>{children}</>;
};

// Admin Role Guard
export const AdminGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  
  // Show loading indicator while checking role
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Chỉ sử dụng userProfile từ context
  const effectiveRole = userProfile?.role;
  
  // Kiểm tra nghiêm ngặt quyền admin
  if (!userProfile) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (effectiveRole !== 'admin') {
    // Ghi nhớ đường dẫn người dùng đang cố truy cập
    const fromPath = location.pathname;
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Guest Guard (prevents authenticated users from accessing login/register pages)
export const GuestGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
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
  if (currentUser && !isWhitelistedPath) {
    // Chỉ redirect nếu đã có userProfile hoặc đang truy cập trang login
    if (userProfile || pathname === '/auth/login') {
      return <Navigate to={from} replace />;
    }
  }
  
  // Đảm bảo render children khi:
  // - Là người dùng chưa đăng nhập
  // - Hoặc đang ở trang được whitelist
  // - Hoặc đã đăng nhập nhưng chưa có profile (đang chờ)
  return <>{children}</>;
};

// Root redirect handler
const RootRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();
  
  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Chỉ sử dụng userProfile từ context, không dùng localStorage
  const effectiveRole = userProfile?.role;
  
  // Redirect based on auth status and role
  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // Luôn kiểm tra role từ userProfile
  if (effectiveRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <Navigate to="/dashboard" replace />;
};

// Main router component
const AppRouter = () => {
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
        <AuthGuard>
          <AdminGuard>
            <AdminRouter />
          </AdminGuard>
        </AuthGuard>
      } />
      
      {/* All user routes */}
      <Route path="/*" element={
        <AuthGuard>
          <UserRouter />
        </AuthGuard>
      } />
      
      {/* Maintenance page */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* Not found page */}
      <Route path="/404" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
