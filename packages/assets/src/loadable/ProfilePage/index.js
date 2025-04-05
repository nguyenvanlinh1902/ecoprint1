import React, { lazy } from 'react';
import DefaultLoadable from '../DefaultLoadable';

/**
 * ProfilePage Loadable Component
 * This is a specialized loadable component for the ProfilePage
 */
const ProfilePageLoadable = DefaultLoadable(
  lazy(() => import('../../pages/ProfilePage'))
);

export default ProfilePageLoadable; 