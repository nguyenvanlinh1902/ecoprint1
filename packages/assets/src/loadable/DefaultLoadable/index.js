import React, { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * DefaultLoadable HOC
 * Wraps a lazily loaded component with Suspense and a loading indicator
 * @param {React.LazyExoticComponent} Component - The lazy-loaded component to wrap
 * @returns {React.FC} - The wrapped component with loading indicator
 */
const DefaultLoadable = (Component) => (props) => {
  return (
    <Suspense fallback={
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    }>
      <Component {...props} />
    </Suspense>
  );
};

export default DefaultLoadable; 