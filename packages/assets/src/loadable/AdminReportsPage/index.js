import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminReportsPage Loadable Component
 */
const AdminReportsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/ReportsPage'))
);

export default AdminReportsPageLoadable; 