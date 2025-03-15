import React from 'react';
import { Box, Container, Typography } from '@mui/material';

/**
 * Layout component for authentication pages (login, register)
 * Provides a consistent wrapper for all authentication related pages
 */
const AuthLayout = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Box 
        sx={{
          py: 2,
          textAlign: 'center',
          backgroundColor: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          mb: 4
        }}
      >
        <Container maxWidth={false}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography 
              sx={{ 
                fontWeight: 'bold', 
                color: 'primary.main',
                fontSize: '24px'
              }}
            >
              🌿 EcoPrint
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container component="main" sx={{ flex: 1 }} maxWidth={false}>
        {children}
      </Container>

      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          textAlign: 'center',
          mt: 4,
          backgroundColor: '#fff',
          borderTop: '1px solid #eaeaea'
        }}
      >
        <Container maxWidth={false}>
          <Typography variant="body2" color="text.secondary">
            &copy; {new Date().getFullYear()} EcoPrint. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthLayout; 