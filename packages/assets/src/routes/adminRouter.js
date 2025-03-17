import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Loadable from '../components/Loadable';

// Lazy load admin pages for better performance
const AdminDashboardPage = Loadable(lazy(() => import('../pages/admin/DashboardPage')));
const AdminUsersPage = Loadable(lazy(() => import('../pages/admin/UsersPage')));
const AdminUserDetailPage = Loadable(lazy(() => import('../pages/admin/UserDetailPage')));
const AdminProductsPage = Loadable(lazy(() => import('../pages/admin/ProductsPage')));
const AdminProductFormPage = Loadable(lazy(() => import('../pages/admin/ProductFormPage')));
const AdminOrdersPage = Loadable(lazy(() => import('../pages/admin/OrdersPage')));
const AdminOrderDetailPage = Loadable(lazy(() => import('../pages/admin/OrderDetailPage')));
const AdminTransactionsPage = Loadable(lazy(() => import('../pages/admin/TransactionsPage')));
const AdminTransactionDetailPage = Loadable(lazy(() => import('../pages/admin/TransactionDetailPage')));
const AdminSettingsPage = Loadable(lazy(() => import('../pages/admin/SettingsPage')));
const AdminReportsPage = Loadable(lazy(() => import('../pages/admin/ReportsPage')));

/**
 * Admin router component
 * 
 * This component handles all routes for the admin section including:
 * - Products management
 * - Transactions management
 * - Users management
 * - Orders management
 * - Reports and settings
 */
const AdminRouter = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/:productId/edit" element={<AdminProductFormPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:userId" element={<AdminUserDetailPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="transactions/:transactionId" element={<AdminTransactionDetailPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRouter; 