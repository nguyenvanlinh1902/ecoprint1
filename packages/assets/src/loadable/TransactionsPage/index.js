import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * TransactionsPage Loadable Component
 * This is a specialized loadable component for the TransactionsPage
 */
const TransactionsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/TransactionsPage'))
);

export default TransactionsPageLoadable; 