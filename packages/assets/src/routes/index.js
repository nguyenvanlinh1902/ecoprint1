import React, { lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Loadable from '../components/Loadable';
import { useAuth } from "../hooks/useAuth";
import useHistory from "../hooks/useHistory";
import { Box, CircularProgress } from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { CONFIG } from "../config/env";

// Lazy load router components
const UserRouter = Loadable(lazy(() => import('./userRouter')));
const AdminRouter = Loadable(lazy(() => import('./adminRouter')));

// Lazy load auth-related pages
const AuthLayout = Loadable(lazy(() => import('../layouts/AuthLayout')));
const LoginPage = Loadable(lazy(() => import('../pages/LoginPage')));
const RegisterPage = Loadable(lazy(() => import('../pages/RegisterPage')));
const ForgotPasswordPage = Loadable(lazy(() => import('../pages/ForgotPasswordPage')));
const ResetPasswordPage = Loadable(lazy(() => import('../pages/ResetPasswordPage')));
const VerifyEmailPage = Loadable(lazy(() => import('../pages/VerifyEmailPage')));
const NotFoundPage = Loadable(lazy(() => import('../pages/NotFoundPage')));
const MaintenancePage = Loadable(lazy(() => import('../pages/MaintenancePage')));

// Auth Guards
export const AuthGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory();

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
    signOut(auth).then(() => {
      console.error("User has no profile data. Signing out.");
    }).catch((error) => {
      console.error("Error signing out:", error);
    });
    
    return <Navigate to="/auth/login" replace />;
  }

  // If all checks pass, render the children components
  return <>{children}</>;
};

// Admin Role Guard
export const AdminGuard = ({ children }) => {
  const { userProfile, loading } = useAuth();
  
  // Show loading indicator while checking role
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Check if user has admin role
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Guest Guard (prevents authenticated users from accessing login/register pages)
export const GuestGuard = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  
  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Redirect to dashboard if already authenticated
  if (currentUser) {
    return <Navigate to={from} replace />;
  }
  
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
  
  // Redirect based on auth status and role
  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }
  
  if (userProfile?.role === 'admin') {
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
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </AuthLayout>
        </GuestGuard>
      } />
      
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
