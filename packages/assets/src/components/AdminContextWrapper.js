import React from 'react';
import { AdminProvider } from '../context/AdminContext';

/**
 * AdminContextWrapper component
 * Wraps children with AdminProvider to ensure the admin context is available
 * This can be used as a safety measure around individual admin pages
 */
const AdminContextWrapper = ({ children }) => {
  return (
    <AdminProvider>
      {children}
    </AdminProvider>
  );
};

export default AdminContextWrapper; 