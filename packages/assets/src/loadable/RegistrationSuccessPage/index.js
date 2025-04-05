import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * RegistrationSuccessPage Loadable Component
 * This is a specialized loadable component for the RegistrationSuccessPage
 */
const RegistrationSuccessPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/RegistrationSuccessPage'))
);

export default RegistrationSuccessPageLoadable; 