import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminTransactionDetailPage Loadable Component
 */
const AdminTransactionDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/TransactionDetailPage'))
);

export default AdminTransactionDetailPageLoadable; 