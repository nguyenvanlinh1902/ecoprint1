import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <AuthLayout title="Đăng nhập vào cửa hàng của bạn">
            <LoginPage />
          </AuthLayout>
        } />
        <Route path="/register" element={
          <AuthLayout title="Đăng ký tài khoản mới">
            <RegisterPage />
          </AuthLayout>
        } />
        {/* Thêm các route khác ở đây */}
        <Route path="/" element={<div>Trang chủ</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 