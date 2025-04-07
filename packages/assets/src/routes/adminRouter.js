import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';

// Import the AdminProvider
import { AdminProvider } from '../context/AdminContext';

// Loadable components
import AdminDashboardPage from '../loadable/AdminDashboardPage';
import AdminUsersPage from '../loadable/AdminUsersPage';
import AdminUserDetailPage from '../loadable/AdminUserDetailPage';
import AdminProductsPage from '../loadable/AdminProductsPage';
import AdminProductFormPage from '../loadable/AdminProductFormPage';
import AdminOrdersPage from '../loadable/AdminOrdersPage';
import AdminOrderDetailPage from '../loadable/AdminOrderDetailPage';
import AdminTransactionsPage from '../loadable/AdminTransactionsPage';
import AdminTransactionDetailPage from '../loadable/AdminTransactionDetailPage';
import AdminSettingsPage from '../loadable/AdminSettingsPage';
import AdminReportsPage from '../loadable/AdminReportsPage';
import AdminCustomersPage from '@/pages/admin/CustomersPage';
import AdminCategoriesPage from '@/pages/admin/CategoriesPage';
import AdminProductOptionsPage from '@/pages/admin/ProductOptionsPage';

/**
 * Admin Router Component
 * Routes configuration for admin section of the app
 */
const AdminRouter = () => {
  return (
    <AdminProvider>
      <AdminLayout>
        <Routes>
          {/* Dashboard */}
          <Route path="dashboard" element={<AdminDashboardPage />} />
          
          {/* Users management */}
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
          
          {/* Products management */}
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:productId" element={<AdminProductsPage />} />
          <Route path="products/:productId/edit" element={<AdminProductFormPage />} />
          <Route path="products/:productId/view" element={<AdminProductsPage />} />
          
          {/* Orders management */}
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
          
          {/* Transactions management */}
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="transactions/:transactionId" element={<AdminTransactionDetailPage />} />
          
          {/* Settings and Reports */}
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          
          {/* Customers management */}
          <Route path="customers" element={<AdminCustomersPage />} />
          
          {/* Categories management */}
          <Route path="categories" element={<AdminCategoriesPage />} />
          
          {/* Product options management */}
          <Route path="product-options" element={<AdminProductOptionsPage />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    </AdminProvider>
  );
};

export default AdminRouter; 