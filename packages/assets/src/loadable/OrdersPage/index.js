import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * OrdersPage Loadable Component
 * This is a specialized loadable component for the OrdersPage
 */
const OrdersPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/OrdersPage'))
);

export default OrdersPageLoadable; 