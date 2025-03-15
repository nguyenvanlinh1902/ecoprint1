import React, { useEffect } from 'react';
import { 
  BrowserRouter, 
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
import { useAuth, useSessionPersistence } from '../hooks';

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
      sessionStorage.setItem('intendedPath', location.pathname + location.search);
    }
  }, [loading, currentUser, location]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  
  if (isAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
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
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (currentUser) {
    const isAdmin = userProfile?.role === 'admin';
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  
  return children;
};

const RootRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default AppRouter; 