import React, { lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Loadable from '../components/Loadable.js';
import { useAuth } from "../hooks/useAuth.js";
import useHistory from "../hooks/useHistory.js";
import { Box, CircularProgress } from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase.js";
import { CONFIG } from "../config/env.js";

// Lazy load router components
const UserRouter = Loadable(lazy(() => import('./userRouter.js')));
const AdminRouter = Loadable(lazy(() => import('./adminRouter.js')));

// Lazy load auth-related pages
const AuthLayout = Loadable(lazy(() => import('../layouts/AuthLayout.js')));
const LoginPage = Loadable(lazy(() => import('../pages/LoginPage.js')));
const RegisterPage = Loadable(lazy(() => import('../pages/RegisterPage.js')));
const ForgotPasswordPage = Loadable(lazy(() => import('../pages/ForgotPasswordPage.js')));
const ResetPasswordPage = Loadable(lazy(() => import('../pages/ResetPasswordPage.js')));
const VerifyEmailPage = Loadable(lazy(() => import('../pages/VerifyEmailPage.js')));
const RegistrationSuccessPage = Loadable(lazy(() => import('../pages/RegistrationSuccessPage.js')));
const NotFoundPage = Loadable(lazy(() => import('../pages/NotFoundPage.js')));
const MaintenancePage = Loadable(lazy(() => import('../pages/MaintenancePage.js')));

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
  
  // Kiểm tra cả từ localStorage (dùng làm backup để tránh mất state)
  const storedRole = localStorage.getItem('userRole');
  const effectiveRole = userProfile?.role || storedRole;
  
  console.log('AdminGuard - Checking role:', {
    userRole: userProfile?.role,
    storedRole,
    effectiveRole,
    hasProfile: !!userProfile
  });
  
  // Kiểm tra nghiêm ngặt quyền admin
  if (!userProfile && !storedRole) {
    console.log('Access denied: No user profile found and no stored role');
    return <Navigate to="/dashboard" replace />;
  }
  
  if (effectiveRole !== 'admin') {
    console.log('Access denied: User is not an admin, role is:', effectiveRole);
    // Ghi nhớ đường dẫn người dùng đang cố truy cập
    const fromPath = location.pathname;
    console.log(`User with role ${effectiveRole} tried to access ${fromPath}`);
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('Admin access granted for user with role:', effectiveRole);
  return <>{children}</>;
};

// Guest Guard (prevents authenticated users from accessing login/register pages)
export const GuestGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  
  // Log for debugging
  console.log('GuestGuard - Current path:', pathname);
  console.log('GuestGuard - Authentication state:', { 
    currentUser: currentUser ? 'Logged in' : 'Not logged in',
    loading
  });
  
  // Kiểm tra nếu đang ở những trang không cần redirect khi đã đăng nhập
  const whitelist = [
    '/auth/verify-email',
    '/registration-success',
    '/auth/reset-password'
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
    console.log('User authenticated, redirecting from', pathname, 'to', from);
    
    // Chỉ redirect nếu đã có userProfile hoặc đang truy cập trang login
    if (userProfile || pathname === '/auth/login') {
      return <Navigate to={from} replace />;
    }
  }
  
  // Đảm bảo render children khi:
  // - Là người dùng chưa đăng nhập
  // - Hoặc đang ở trang được whitelist
  // - Hoặc đã đăng nhập nhưng chưa có profile (đang chờ)
  console.log('Rendering auth page:', pathname);
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
  
  // Kiểm tra cả từ localStorage để tránh mất state
  const storedRole = localStorage.getItem('userRole');
  const effectiveRole = userProfile?.role || storedRole;
  
  // Log trạng thái cho debugging
  console.log('RootRedirect - Auth state:', { 
    isLoggedIn: !!currentUser,
    role: userProfile?.role,
    storedRole,
    effectiveRole,
    userId: userProfile?.id || currentUser?.uid
  });
  
  // Redirect based on auth status and role
  if (!currentUser) {
    console.log('No authenticated user, redirecting to login page');
    return <Navigate to="/auth/login" replace />;
  }
  
  // Luôn kiểm tra role từ userProfile hoặc localStorage
  if (effectiveRole === 'admin') {
    console.log('User has admin role, redirecting to admin dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  console.log('User has regular role, redirecting to user dashboard');
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
