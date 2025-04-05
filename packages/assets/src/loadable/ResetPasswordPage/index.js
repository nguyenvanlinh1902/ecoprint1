import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ResetPasswordPage Loadable Component
 * This is a specialized loadable component for the ResetPasswordPage
 */
const ResetPasswordPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ResetPasswordPage'))
);

export default ResetPasswordPageLoadable; 