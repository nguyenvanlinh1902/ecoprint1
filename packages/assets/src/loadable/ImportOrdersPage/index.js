import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ImportOrdersPage Loadable Component
 * This is a specialized loadable component for the ImportOrdersPage
 */
const ImportOrdersPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ImportOrdersPage'))
);

export default ImportOrdersPageLoadable; 