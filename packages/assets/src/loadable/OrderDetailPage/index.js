import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * OrderDetailPage Loadable Component
 * This is a specialized loadable component for the OrderDetailPage
 */
const OrderDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/OrderDetailPage'))
);

export default OrderDetailPageLoadable; 