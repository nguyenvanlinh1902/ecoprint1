import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import useHistory from "../hooks/useHistory";
import AdminRouter from "./adminRoutes";
import AuthLayout from "../layouts/AuthLayout";
import MainLayout from "../layouts/MainLayout";
import { useAuth, useRouteProtection } from "../hooks";
import { Box, CircularProgress } from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

// Auth Pages
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

// User Pages
import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import ProductDetailPage from "../pages/ProductDetailPage";
import OrdersPage from "../pages/OrdersPage";
import OrderDetailPage from "../pages/OrderDetailPage";
import CreateOrderPage from "../pages/CreateOrderPage";
import ProfilePage from "../pages/ProfilePage";
import TransactionsPage from "../pages/TransactionsPage";
import DepositPage from "../pages/DepositPage";
import NotFoundPage from "../pages/NotFoundPage";
import ImportDetailPage from "../pages/ImportDetailPage";
import ImportOrdersPage from "../pages/ImportOrdersPage";

// Auth Guards
const AuthGuard = ({ children }) => {
  // Silent auth checking - no logs
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory();

  // Tracking state for debugging (commented out)
  // useEffect(() => {
  //   //   console.log('AuthGuard state:', {
  //     loading,
  //     currentUser: currentUser ? true : false,
  //     userProfile: userProfile ? true : false,
  //     path: location.pathname
  //   });
  // }, [loading, currentUser, userProfile, location]);

  useEffect(() => {
    // Store the current path for redirection after login
    if (!loading && !currentUser && location.pathname !== "/login") {
      /* log removed */
      sessionStorage.setItem(
        "intendedPath",
        location.pathname + location.search,
      );
    }
  }, [loading, currentUser, location]);

  // Debug current auth state
  /* log removed */

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    /* log removed */
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
  if (currentUser && !userProfile) {
    /* log removed */
    // Attempt to sign out the user before redirecting
    try {
      signOut(auth).catch((err) => {
        /* error removed */
      });
    } catch (error) {
      /* error removed */
    }

    // Xóa token khỏi localStorage để đảm bảo user sẽ đăng nhập lại
    localStorage.removeItem("authToken");
    localStorage.removeItem("mockAuthUser");
    localStorage.removeItem("mockAuthProfile");

    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = userProfile?.role === "admin";

  if (isAdmin && !location.pathname.startsWith("/admin")) {
    /* log removed */
    return <Navigate to="/admin/dashboard" replace />;
  }

  /* log removed */
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

  const isAdmin = userProfile?.role === "admin";

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const GuestGuard = ({ children }) => {
  // Silent guest access checking - no logs
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();
  const history = useHistory();

  // Tracking state for debugging (commented out)
  // useEffect(() => {
  //   //   console.log('GuestGuard state:', {
  //     loading,
  //     currentUser: currentUser ? true : false,
  //     userProfile: userProfile ? true : false
  //   });
  // }, [loading, currentUser, userProfile]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (currentUser) {
    // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
    if (!userProfile) {
      /* log removed */
      try {
        // Attempt to sign out silently since profile is missing
        signOut(auth).catch((err) => {
          /* error removed */
        });
        localStorage.removeItem("authToken");
        localStorage.removeItem("mockAuthUser");
        localStorage.removeItem("mockAuthProfile");
      } catch (error) {
        /* error removed */
      }
      return children;
    }

    const isAdmin = userProfile?.role === "admin";
    /* log removed */
    return (
      <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />
    );
  }

  /* log removed */
  return children;
};

const RootRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    /* log removed */
    return <Navigate to="/login" replace />;
  }

  // Kiểm tra nếu userProfile không tồn tại nhưng currentUser có
  if (currentUser && !userProfile) {
    /* log removed */
    return <Navigate to="/login" replace />;
  }

  const isAdmin = userProfile?.role === "admin";
  /* log removed */
  return <Navigate to={isAdmin ? "/admin/dashboard" : "/dashboard"} replace />;
};

const AppRouter = () => {
  return <AppRoutes />;
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
      <Route
        path="/login"
        element={
          <AuthLayout>
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          </AuthLayout>
        }
      />

      <Route
        path="/register"
        element={
          <AuthLayout>
            <GuestGuard>
              <RegisterPage />
            </GuestGuard>
          </AuthLayout>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <AuthLayout>
            <GuestGuard>
              <ForgotPasswordPage />
            </GuestGuard>
          </AuthLayout>
        }
      />

      <Route
        path="/reset-password"
        element={
          <AuthLayout>
            <GuestGuard>
              <ResetPasswordPage />
            </GuestGuard>
          </AuthLayout>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <AdminRouter />
          </AdminGuard>
        }
      />

      {/* User Routes */}
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      {/* Other protected routes */}
      <Route
        path="/profile"
        element={
          <AuthGuard>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/products/:productId"
        element={
          <AuthGuard>
            <MainLayout>
              <ProductDetailPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/products"
        element={
          <AuthGuard>
            <MainLayout>
              <ProductsPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/orders"
        element={
          <AuthGuard>
            <MainLayout>
              <OrdersPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/orders/create"
        element={
          <AuthGuard>
            <MainLayout>
              <CreateOrderPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/orders/:orderId"
        element={
          <AuthGuard>
            <MainLayout>
              <OrderDetailPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/transactions"
        element={
          <AuthGuard>
            <MainLayout>
              <TransactionsPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/import-orders/:importId"
        element={
          <AuthGuard>
            <MainLayout>
              <ImportDetailPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/import-orders"
        element={
          <AuthGuard>
            <MainLayout>
              <ImportOrdersPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      <Route
        path="/deposit"
        element={
          <AuthGuard>
            <MainLayout>
              <DepositPage />
            </MainLayout>
          </AuthGuard>
        }
      />

      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
