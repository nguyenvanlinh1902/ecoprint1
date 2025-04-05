import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * NotFoundPage Loadable Component
 * This is a specialized loadable component for the NotFoundPage
 */
const NotFoundPageLoadable = DefaultLoadable(
  lazy(() => import('@pages/NotFoundPage'))
);

export default NotFoundPageLoadable; 