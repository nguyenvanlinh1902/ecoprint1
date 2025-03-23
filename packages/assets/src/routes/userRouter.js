import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.js';
import Loadable from '../components/Loadable.js';

// Lazy load pages for better performance
const DashboardPage = Loadable(lazy(() => import('../pages/DashboardPage.js')));
const ProfilePage = Loadable(lazy(() => import('../pages/ProfilePage.js')));
const ProductsPage = Loadable(lazy(() => import('../pages/ProductsPage.js')));
const ProductDetailPage = Loadable(lazy(() => import('../pages/ProductDetailPage.js')));
const OrdersPage = Loadable(lazy(() => import('../pages/OrdersPage.js')));
const OrderDetailPage = Loadable(lazy(() => import('../pages/OrderDetailPage.js')));
const CreateOrderPage = Loadable(lazy(() => import('../pages/CreateOrderPage.js')));
const ImportOrdersPage = Loadable(lazy(() => import('../pages/ImportOrdersPage.js')));
const ImportDetailPage = Loadable(lazy(() => import('../pages/ImportDetailPage.js')));
const DepositPage = Loadable(lazy(() => import('../pages/DepositPage.js')));
const TransactionsPage = Loadable(lazy(() => import('../pages/TransactionsPage.js')));
const NotFoundPage = Loadable(lazy(() => import('../pages/NotFoundPage.js')));

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