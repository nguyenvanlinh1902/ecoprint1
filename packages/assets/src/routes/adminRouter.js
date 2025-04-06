import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout.js';

// Import loadable components from loadable folder
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminProductsPage,
  AdminProductFormPage,
  AdminOrdersPage,
  AdminOrderDetailPage,
  AdminTransactionsPage,
  AdminTransactionDetailPage,
  AdminSettingsPage,
  AdminReportsPage
} from '../loadable';

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