import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ImportDetailPage Loadable Component
 * This is a specialized loadable component for the ImportDetailPage
 */
const ImportDetailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ImportDetailPage'))
);

export default ImportDetailPageLoadable; 