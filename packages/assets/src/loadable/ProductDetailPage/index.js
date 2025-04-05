import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ProductDetailPage Loadable Component
 * This is a specialized loadable component for the ProductDetailPage
 */
const ProductDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ProductDetailPage'))
);

export default ProductDetailPageLoadable; 