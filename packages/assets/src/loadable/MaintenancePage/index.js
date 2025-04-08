import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * MaintenancePage Loadable Component
 * This is a specialized loadable component for the MaintenancePage
 */
const MaintenancePageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/MaintenancePage'))
);

export default MaintenancePageLoadable; 