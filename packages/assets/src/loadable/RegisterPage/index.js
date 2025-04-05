import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * RegisterPage Loadable Component
 * This is a specialized loadable component for the RegisterPage
 */
const RegisterPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/RegisterPage'))
);

export default RegisterPageLoadable; 