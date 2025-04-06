import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.js';

// Import loadable components from @loadable folder
import {
  DashboardPage,
  ProfilePage,
  ProductsPage,
  ProductDetailPage,
  OrdersPage,
  OrderDetailPage,
  CreateOrderPage,
  ImportOrdersPage,
  ImportDetailPage,
  DepositPage,
  TransactionsPage,
  NotFoundPage
} from '../loadable';

/**
 * User router component
 * 
 * This component handles all routes for the regular user section including:
 * - Dashboard
 * - Profile
 * - Products browsing
 * - Orders management
 * - Transactions and deposits
 */
const UserRouter = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="orders/create" element={<CreateOrderPage />} />
        <Route path="import-orders" element={<ImportOrdersPage />} />
        <Route path="import-orders/:importId" element={<ImportDetailPage />} />
        <Route path="deposit" element={<DepositPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};

export default UserRouter; 