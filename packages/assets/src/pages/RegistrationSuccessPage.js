import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, Alert } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const RegistrationSuccessPage = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          
          <Typography component="h1" variant="h5" gutterBottom>
            Registration Successful!
          </Typography>
          
          <Alert severity="info" sx={{ my: 2, textAlign: 'left' }}>
            Your account has been created and is pending approval from our administrators. 
            You will receive an email notification once your account is approved.
          </Alert>
          
          <Typography variant="body1" sx={{ mb: 4 }}>
            Thank you for registering with our platform. Once approved, you'll be able to access
            all our services and features.
          </Typography>
          
          <Button
            component={Link}
            to="/login"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
          >
            Back to Login
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegistrationSuccessPage; 