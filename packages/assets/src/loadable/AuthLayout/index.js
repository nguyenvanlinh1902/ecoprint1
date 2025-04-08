import React from 'react';
import AuthLayout from '../../layouts/AuthLayout';

/**
 * AuthLayout Loadable Component
 * Using direct import instead of lazy loading to avoid dynamic import errors
 */
const AuthLayoutLoadable = (props) => <AuthLayout {...props} />;

export default AuthLayoutLoadable; 