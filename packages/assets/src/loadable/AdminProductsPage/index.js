import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminProductsPage Loadable Component
 */
const AdminProductsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/ProductsPage'))
);

export default AdminProductsPageLoadable; 