import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ProductsPage Loadable Component
 * This is a specialized loadable component for the ProductsPage
 */
const ProductsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ProductsPage'))
);

export default ProductsPageLoadable; 