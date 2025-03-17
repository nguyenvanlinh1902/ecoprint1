import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loadable from '../components/Loadable';
import MainLayout from '../layouts/MainLayout';

// Lazy load user pages for better performance
const DashboardPage = Loadable(lazy(() => import('../pages/DashboardPage')));
const ProductsPage = Loadable(lazy(() => import('../pages/ProductsPage')));
const ProductDetailPage = Loadable(lazy(() => import('../pages/ProductDetailPage')));
const OrdersPage = Loadable(lazy(() => import('../pages/OrdersPage')));
const OrderDetailPage = Loadable(lazy(() => import('../pages/OrderDetailPage')));
const ImportOrdersPage = Loadable(lazy(() => import('../pages/ImportOrdersPage')));
const ImportDetailPage = Loadable(lazy(() => import('../pages/ImportDetailPage')));
const DepositPage = Loadable(lazy(() => import('../pages/DepositPage')));
const TransactionsPage = Loadable(lazy(() => import('../pages/TransactionsPage')));
const ProfilePage = Loadable(lazy(() => import('../pages/ProfilePage')));
const NotFoundPage = Loadable(lazy(() => import('../pages/NotFoundPage')));

/**
 * User Router Component
 * 
 * This component handles all routes for regular users including:
 * - Dashboard
 * - Products browsing
 * - Orders management
 * - Import orders
 * - Financial operations (deposit, transactions)
 * - User profile
 */
const UserRouter = () => {
  return (
    <MainLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="import-orders" element={<ImportOrdersPage />} />
        <Route path="import-orders/:importId" element={<ImportDetailPage />} />
        <Route path="deposit" element={<DepositPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};

export default UserRouter; 