import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NotFoundIllustration from '../resources/404.svg';

const NotFoundPage = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ textAlign: 'center', pt: 10, pb: 5 }}>
        <Box component="img" src={NotFoundIllustration} alt="404" sx={{ width: '100%', maxWidth: 400, mb: 4 }} />
        
        <Typography variant="h3" paragraph>
          Oops! Page Not Found
        </Typography>
        
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </Typography>
        
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          size="large"
        >
          Go to Homepage
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage; 