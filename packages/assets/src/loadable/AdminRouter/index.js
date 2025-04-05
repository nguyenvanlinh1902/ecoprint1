import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AdminRouter Loadable Component
 * This is a specialized loadable component for the AdminRouter
 */
const AdminRouterLoadable = DefaultLoadable(
  lazy(() => import('../../routes/adminRouter'))
);

export default AdminRouterLoadable; 