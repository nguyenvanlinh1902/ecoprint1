import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminProductFormPage Loadable Component
 */
const AdminProductFormPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/ProductFormPage'))
);

export default AdminProductFormPageLoadable; 