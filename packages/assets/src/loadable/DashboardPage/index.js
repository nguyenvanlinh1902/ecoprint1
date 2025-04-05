import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * DashboardPage Loadable Component
 * This is a specialized loadable component for the DashboardPage
 */
const DashboardPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/DashboardPage'))
);

export default DashboardPageLoadable; 