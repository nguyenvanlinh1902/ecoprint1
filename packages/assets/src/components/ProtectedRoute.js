import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CircularProgress, Box } from '@mui/material';

/**
 * Protected route component that redirects to login if not authenticated
 * 
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Child components to render when authenticated
 * @param {string[]} props.requiredRoles (Optional) Roles that are allowed to access this route
 * @returns {React.ReactNode} Protected route
 */
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, token, loading, logout } = useApp();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated or missing user profile, redirect to login
  if (!token || !user) {
    // If token exists but user is missing, logout first
    if (token && !user) {
      logout();
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check for required roles if specified
  if (requiredRoles.length > 0) {
    const userRole = user.role || 'user';
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // User is authenticated and has required role, render children
  return children;
};

export default ProtectedRoute; 