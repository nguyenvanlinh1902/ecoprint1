import React, { Suspense } from 'react';
import { LinearProgress } from '@mui/material';

/**
 * Component Loadable
 * This is a higher order component that enables code splitting with React.lazy
 * It wraps the lazy loaded component with a Suspense and provides a loading indicator
 */
const Loadable = (Component) => (props) => {
  return (
    <Suspense 
      fallback={
        <LinearProgress 
          color="primary" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 9999 
          }} 
        />
      }
    >
      <Component {...props} />
    </Suspense>
  );
};

export default Loadable; 