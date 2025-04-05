import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * LoginPage Loadable Component
 * This is a specialized loadable component for the LoginPage
 */
const LoginPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/LoginPage'))
);

export default LoginPageLoadable; 