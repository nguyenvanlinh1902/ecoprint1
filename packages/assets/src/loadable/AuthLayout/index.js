import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * AuthLayout Loadable Component
 * This is a specialized loadable component for the AuthLayout
 */
const AuthLayoutLoadable = DefaultLoadable(
  lazy(() => import('@layouts/AuthLayout'))
);

export default AuthLayoutLoadable; 