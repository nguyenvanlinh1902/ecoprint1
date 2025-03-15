import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Outlet, BrowserRouter as Router } from 'react-router-dom';
import { Children, cloneElement } from 'react';

/**
 * Compatibility BrowserRouter component that mimics React Router v5's BrowserRouter
 * but uses React Router v6's BrowserRouter under the hood
 */
export const BrowserRouter = ({ children }) => {
  return <Router>{children}</Router>;
};

/**
 * Process route children recursively to handle nested routes
 */
const processRouteChildren = (child) => {
  if (!child.props) return null;
  
  const { path, exact, children: routeChildren } = child.props;
  
  // Handle array paths (like ['/login', '/register'])
  if (Array.isArray(path)) {
    return path.map(singlePath => (
      <Route
        key={singlePath}
        path={singlePath}
        element={routeChildren}
      />
    ));
  }
  
  const v6Path = path === '*' ? '*' : path;
  
  // Check if routeChildren contains nested routes
  let hasNestedRoutes = false;
  let childContent = routeChildren;
  
  // If the routeChildren is a React element and contains a Switch
  if (React.isValidElement(routeChildren)) {
    const childType = routeChildren.type;
    if (childType === Switch || (childType.name && childType.name === 'Switch')) {
      hasNestedRoutes = true;
      // For nested routes, we'll wrap the content in the parent route
      // and process the nested routes separately
      const nestedSwitch = routeChildren;
      childContent = cloneElement(
        routeChildren,
        {},
        <Outlet />
      );
    }
  }
  
  return (
    <Route
      key={v6Path || Math.random().toString()}
      path={v6Path}
      element={childContent}
    />
  );
};

/**
 * Compatibility Switch component that mimics React Router v5's Switch
 * but uses React Router v6's Routes under the hood
 */
export const Switch = ({ children }) => {
  // Convert children to an array
  const childrenArray = Children.toArray(children);
  
  // Transform v5 style route children to v6 style
  const v6Routes = childrenArray.map(child => {
    // Skip non-route children
    if (!child.props || child.type.name !== 'CompatRoute') {
      return null;
    }
    
    return processRouteChildren(child);
  }).flat().filter(Boolean);
  
  // Return a Routes component with the transformed children
  return <Routes>{v6Routes}</Routes>;
};

/**
 * Compatibility Route component for React Router v5 that works with our Switch
 */
export const CompatRoute = ({ path, exact, children }) => {
  // This component doesn't render anything on its own
  return children;
};

/**
 * Compatibility Redirect component that mimics React Router v5's Redirect
 * but uses React Router v6's Navigate under the hood
 */
export const Redirect = ({ to, push = false, state }) => {
  return <Navigate to={to} replace={!push} state={state} />;
};

/**
 * Compatibility useHistory hook that provides the useHistory API from React Router v5
 * while using useNavigate from React Router v6 under the hood
 */
export const useHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return {
    push: (path, state) => navigate(path, { state }),
    replace: (path, state) => navigate(path, { replace: true, state }),
    goBack: () => navigate(-1),
    go: (n) => navigate(n),
    location: location
  };
};

export default {
  BrowserRouter,
  Switch,
  Route: CompatRoute,
  Redirect,
  useHistory
}; 