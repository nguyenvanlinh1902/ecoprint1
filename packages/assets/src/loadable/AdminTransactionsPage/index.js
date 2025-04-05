import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminTransactionsPage Loadable Component
 */
const AdminTransactionsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/TransactionsPage'))
);

export default AdminTransactionsPageLoadable; 