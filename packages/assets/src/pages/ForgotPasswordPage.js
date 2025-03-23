import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Container, Box, Alert } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword, resetPasswordViaApi } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      // First try the API method
      try {
        console.log('Attempting password reset via API for:', email);
        await resetPasswordViaApi(email);
        setSuccess(true);
      } catch (apiError) {
        console.log('API reset failed, trying Firebase:', apiError);
        // If API fails, fallback to Firebase
        await resetPassword(email);
        setSuccess(true);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

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
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" textAlign="center" gutterBottom>
            Forgot Password
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>
                Password reset instructions have been sent to your email.
              </Alert>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Please check your email for instructions to reset your password. If you don't see it in your inbox, please check your spam folder.
              </Typography>
              <Button
                component={Link}
                to="/auth/login"
                fullWidth
                variant="contained"
                sx={{ mt: 2 }}
              >
                Back to Login
              </Button>
            </>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Enter your email address and we'll send you instructions to reset your password.
              </Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </Button>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Remember your password? Sign In
                  </Typography>
                </Link>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage; 