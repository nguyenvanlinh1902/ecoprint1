import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminOrdersPage Loadable Component
 */
const AdminOrdersPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/OrdersPage'))
);

export default AdminOrdersPageLoadable; 