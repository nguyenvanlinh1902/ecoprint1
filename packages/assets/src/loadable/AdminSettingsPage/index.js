import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminSettingsPage Loadable Component
 */
const AdminSettingsPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/admin/SettingsPage'))
);

export default AdminSettingsPageLoadable; 