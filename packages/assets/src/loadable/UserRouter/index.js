import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * UserRouter Loadable Component
 * This is a specialized loadable component for the UserRouter
 */
const UserRouterLoadable = DefaultLoadable(
  lazy(() => import('../../routes/userRouter'))
);

export default UserRouterLoadable; 