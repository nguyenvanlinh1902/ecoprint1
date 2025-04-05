import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Logo component for the application
 * @param {Object} props - Component props
 * @returns {JSX.Element} Logo component
 */
const Logo = ({ sx = {}, variant = 'primary' }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        ...sx 
      }}
    >
      <Typography 
        variant="h5" 
        component="div" 
        color={variant === 'primary' ? 'primary' : 'inherit'}
        fontWeight="bold"
        letterSpacing="1px"
      >
        EcoPrint
      </Typography>
    </Box>
  );
};

export default Logo; 