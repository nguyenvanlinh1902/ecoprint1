import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * VerifyEmailPage Loadable Component
 * This is a specialized loadable component for the VerifyEmailPage
 */
const VerifyEmailPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/VerifyEmailPage'))
);

export default VerifyEmailPageLoadable; 