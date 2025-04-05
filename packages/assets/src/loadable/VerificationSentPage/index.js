import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * VerificationSentPage Loadable Component
 * This is a specialized loadable component for the VerificationSentPage
 */
const VerificationSentPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/VerificationSentPage'))
);

export default VerificationSentPageLoadable; 