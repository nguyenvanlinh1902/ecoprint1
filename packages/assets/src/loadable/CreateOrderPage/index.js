import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * CreateOrderPage Loadable Component
 * This is a specialized loadable component for the CreateOrderPage
 */
const CreateOrderPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/CreateOrderPage'))
);

export default CreateOrderPageLoadable; 