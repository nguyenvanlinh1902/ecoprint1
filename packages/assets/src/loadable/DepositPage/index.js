import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * DepositPage Loadable Component
 * This is a specialized loadable component for the DepositPage
 */
const DepositPageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/DepositPage'))
);

export default DepositPageLoadable; 