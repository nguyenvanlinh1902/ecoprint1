import React, { useEffect } from 'react';
import { 
  Routes, 
  Route, 
  Navigate, 
  useLocation,
  Outlet
} from 'react-router-dom';
import useHistory from '../hooks/useHistory';
import AdminRouter from './adminRoutes';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import { useAuth, useRouteProtection } from '../hooks';
import { Box, CircularProgress } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Auth Pages
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// User Pages
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import ProfilePage from '../pages/ProfilePage';
import TransactionsPage from '../pages/TransactionsPage';
import DepositPage from '../pages/DepositPage';
import NotFoundPage from '../pages/NotFoundPage';

// Auth Guards
const AuthGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory();
  
  useEffect(() => {
    // Store the current path for redirection after login
    if (!loading && !currentUser && location.pathname !== '/login') {
      console.log('User not authenticated, storing intended path:', location.pathname);
      sessionStorage.setItem('intendedPath', location.pathname + location.search);
    }
  }, [loading, currentUser, location]);
  
  // Debug current auth state
  useEffect(() => {
    console.log('AuthGuard state:', {
      loading,
      currentUser: currentUser ? true : false,
      userProfile: userProfile ? true : false,
      path: location.pathname
    });
  }, [loading, currentUser, userProfile, location]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!currentUser) {
    console.log('AuthGuard: User not logged in, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
  if (currentUser && !userProfile) {
    console.log('AuthGuard: User logged in but profile missing, redirecting to login');
    // Attempt to sign out the user before redirecting
    try {
      signOut(auth).catch(err => console.error('Error signing out user with missing profile:', err));
    } catch (error) {
      console.error('Error during signOut in AuthGuard:', error);
    }
    
    // Xóa token khỏi localStorage để đảm bảo user sẽ đăng nhập lại
    localStorage.removeItem('authToken');
    localStorage.removeItem('mockAuthUser');
    localStorage.removeItem('mockAuthProfile');
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  
  if (isAdmin && !location.pathname.startsWith('/admin')) {
    console.log('AuthGuard: Admin user accessing non-admin route, redirecting to admin dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  console.log('AuthGuard: User authenticated, rendering protected content');
  return children;
};

const AdminGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const GuestGuard = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  
  // Debug current auth state
  useEffect(() => {
    console.log('GuestGuard state:', {
      loading,
      currentUser: currentUser ? true : false,
      userProfile: userProfile ? true : false
    });
  }, [loading, currentUser, userProfile]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (currentUser) {
    // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
    if (!userProfile) {
      console.log('GuestGuard: User logged in but profile missing, allowing guest access');
      try {
        // Attempt to sign out silently since profile is missing
        signOut(auth).catch(err => console.error('Error signing out user with missing profile in GuestGuard:', err));
        localStorage.removeItem('authToken');
        localStorage.removeItem('mockAuthUser');
        localStorage.removeItem('mockAuthProfile');
      } catch (error) {
        console.error('Error during cleanup in GuestGuard:', error);
      }
      return children;
    }
    
    const isAdmin = userProfile?.role === 'admin';
    console.log('GuestGuard: User already logged in, redirecting to dashboard');
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  
  console.log('GuestGuard: Guest access allowed');
  return children;
};

const RootRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    console.log('RootRedirect: User not logged in, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
  if (currentUser && !userProfile) {
    console.log('RootRedirect: User logged in but profile missing, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  console.log('RootRedirect: User logged in, redirecting to appropriate dashboard');
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
};

const AppRouter = () => {
  return (
    <AppRoutes />
  );
};

// Separate component to use hooks inside Router
const AppRoutes = () => {
  // Enable global route protection
  useRouteProtection();
  
  return (
    <Routes>
      {/* Root Route */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Guest Routes */}
      <Route path="/login" element={
        <AuthLayout>
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        </AuthLayout>
      } />
      
      <Route path="/register" element={
        <AuthLayout>
          <GuestGuard>
            <RegisterPage />
          </GuestGuard>
        </AuthLayout>
      } />
      
      <Route path="/forgot-password" element={
        <AuthLayout>
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        </AuthLayout>
      } />
      
      <Route path="/reset-password" element={
        <AuthLayout>
          <GuestGuard>
            <ResetPasswordPage />
          </GuestGuard>
        </AuthLayout>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/*" element={
        <AdminGuard>
          <AdminRouter />
        </AdminGuard>
      } />
      
      {/* User Routes */}
      <Route path="/dashboard" element={
        <AuthGuard>
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      {/* Other protected routes */}
      <Route path="/profile" element={
        <AuthGuard>
          <MainLayout>
            <ProfilePage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/products/:productId" element={
        <AuthGuard>
          <MainLayout>
            <ProductDetailPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/products" element={
        <AuthGuard>
          <MainLayout>
            <ProductsPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/orders/:orderId" element={
        <AuthGuard>
          <MainLayout>
            <OrderDetailPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/orders" element={
        <AuthGuard>
          <MainLayout>
            <OrdersPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/transactions" element={
        <AuthGuard>
          <MainLayout>
            <TransactionsPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      <Route path="/deposit" element={
        <AuthGuard>
          <MainLayout>
            <DepositPage />
          </MainLayout>
        </AuthGuard>
      } />
      
      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter; 