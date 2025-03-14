import React from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import OrdersPage from '../pages/OrdersPage';
import OrderDetailPage from '../pages/OrderDetailPage';
import ProfilePage from '../pages/ProfilePage';
import ImportOrdersPage from '../pages/ImportOrdersPage';
import ImportDetailPage from '../pages/ImportDetailPage';
import DepositPage from '../pages/DepositPage';
import TransactionsPage from '../pages/TransactionsPage';

// Admin Pages
import AdminDashboardPage from '../pages/admin/DashboardPage';
import AdminUsersPage from '../pages/admin/UsersPage';
import AdminUserDetailPage from '../pages/admin/UserDetailPage';
import AdminProductsPage from '../pages/admin/ProductsPage';
import AdminProductFormPage from '../pages/admin/ProductFormPage';
import AdminOrdersPage from '../pages/admin/OrdersPage';
import AdminOrderDetailPage from '../pages/admin/OrderDetailPage';
import AdminTransactionsPage from '../pages/admin/TransactionsPage';
import AdminSettingsPage from '../pages/admin/SettingsPage';
import AdminReportsPage from '../pages/admin/ReportsPage';

// Other pages
import NotFoundPage from '../pages/NotFoundPage';
import MaintenancePage from '../pages/MaintenancePage';

// Guards
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";

// Route configuration
const routes = [
  {
    path: 'auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        ),
      },
      {
        path: 'register',
        element: (
          <GuestGuard>
            <RegisterPage />
          </GuestGuard>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <GuestGuard>
            <ForgotPasswordPage />
          </GuestGuard>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <GuestGuard>
            <ResetPasswordPage />
          </GuestGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },
  {
    path: 'admin',
    element: (
      <AuthGuard>
        <RoleGuard roles={['admin']}>
          <AdminLayout />
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'users/:userId',
        element: <AdminUserDetailPage />,
      },
      {
        path: 'products',
        element: <AdminProductsPage />,
      },
      {
        path: 'products/create',
        element: <AdminProductFormPage />,
      },
      {
        path: 'products/:productId/edit',
        element: <AdminProductFormPage />,
      },
      {
        path: 'orders',
        element: <AdminOrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <AdminOrderDetailPage />,
      },
      {
        path: 'transactions',
        element: <AdminTransactionsPage />,
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />,
      },
      {
        path: 'reports',
        element: <AdminReportsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/admin/dashboard" replace />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: '',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'products/:productId',
        element: <ProductDetailPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:orderId',
        element: <OrderDetailPage />,
      },
      {
        path: 'import-orders',
        element: <ImportOrdersPage />,
      },
      {
        path: 'import-orders/:importId',
        element: <ImportDetailPage />,
      },
      {
        path: 'deposit',
        element: <DepositPage />,
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: 'maintenance',
    element: <MaintenancePage />,
  },
  {
    path: '404',
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
];

export default routes; 