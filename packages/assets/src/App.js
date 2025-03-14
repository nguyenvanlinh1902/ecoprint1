import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import routes from './routes/routes';
import theme from './styles/theme';
import LoadingScreen from './components/LoadingScreen';

// Protected Route component
const ProtectedRoute = ({ children, adminRequired = false }) => {
  const { currentUser, userDetails, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  if (adminRequired && (!userDetails || userDetails.role !== 'admin')) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Create routes from route config
const renderRoutes = (routes) => {
  return routes.map((route) => {
    // Check if route has children
    if (route.children) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            route.path.startsWith('/admin') ? (
              <ProtectedRoute adminRequired={true}>
                {route.element}
              </ProtectedRoute>
            ) : (
              route.path === '/' || route.path.startsWith('/login') || route.path.startsWith('/register') || route.path.startsWith('/forgot-password') ? (
                route.element
              ) : (
                <ProtectedRoute>{route.element}</ProtectedRoute>
              )
            )
          }
        >
          {renderRoutes(route.children)}
        </Route>
      );
    }
    
    // Regular route without children
    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          route.path.startsWith('/admin') ? (
            <ProtectedRoute adminRequired={true}>
              {route.element}
            </ProtectedRoute>
          ) : (
            route.path === '/login' || route.path === '/register' || route.path === '/forgot-password' ? (
              route.element
            ) : (
              <ProtectedRoute>{route.element}</ProtectedRoute>
            )
          )
        }
      />
    );
  });
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {renderRoutes(routes)}
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 