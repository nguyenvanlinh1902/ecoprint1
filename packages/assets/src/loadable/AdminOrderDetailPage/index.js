import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminOrderDetailPage Loadable Component
 */
const AdminOrderDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/OrderDetailPage'))
);

export default AdminOrderDetailPageLoadable; 