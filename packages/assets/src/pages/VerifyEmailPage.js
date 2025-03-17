import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Container, Alert } from '@mui/material';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';

/**
 * Email Verification Page
 * 
 * This page is displayed when a user needs to verify their email address.
 * It allows the user to request a new verification email.
 */
const VerifyEmailPage = () => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleResendVerification = async () => {
    try {
      setLoading(true);
      await sendEmailVerification(currentUser);
      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.'
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send verification email. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Verify Your Email
          </Typography>
          
          <Typography variant="body1" align="center" paragraph>
            A verification email has been sent to:
          </Typography>
          
          <Typography variant="body1" align="center" fontWeight="bold" paragraph>
            {currentUser?.email}
          </Typography>
          
          <Typography variant="body2" align="center" paragraph>
            Please check your inbox and click the verification link to activate your account.
            If you don't see the email, check your spam folder.
          </Typography>
          
          {message && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 3 }}
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleResendVerification}
              disabled={loading}
              sx={{ mx: 1 }}
            >
              Resend Verification Email
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              href="/auth/login"
              sx={{ mx: 1 }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyEmailPage; 