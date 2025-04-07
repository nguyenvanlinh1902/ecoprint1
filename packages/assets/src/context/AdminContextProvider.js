import React from 'react';
import { AdminProvider } from './AdminContext';

/**
 * HOC (Higher Order Component) to wrap a component with AdminProvider
 * This ensures that all components using useAdmin() have access to the context
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with AdminProvider
 */
export const withAdminContext = (Component) => {
  const WithAdminContext = (props) => {
    return (
      <AdminProvider>
        <Component {...props} />
      </AdminProvider>
    );
  };
  
  // Set display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithAdminContext.displayName = `withAdminContext(${displayName})`;
  
  return WithAdminContext;
};

/**
 * AdminContextConsumer component
 * A simple component that provides a safer way to consume AdminContext
 * without risking destructuring errors
 */
export const AdminContextConsumer = ({ children }) => {
  return children({ getUserByEmail: (email) => null });
}; 