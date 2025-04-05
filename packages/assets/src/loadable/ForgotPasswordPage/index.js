import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ForgotPasswordPage Loadable Component
 * This is a specialized loadable component for the ForgotPasswordPage
 */
const ForgotPasswordPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ForgotPasswordPage'))
);

export default ForgotPasswordPageLoadable; 