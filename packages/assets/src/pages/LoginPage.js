import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  TextField,
  Button,
  Grid,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Stack,
  Box,
  Avatar,
  AlertTitle,
} from '@mui/material';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  // Get email from localStorage if available
  const storedEmail = localStorage.getItem('login_email') || '';
  
  const [email, setEmail] = useState(storedEmail);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { login, resendVerification } = useAuth(); 

  // Update email in localStorage when it changes
  useEffect(() => {
    if (email) {
      localStorage.setItem('login_email', email);
    }
  }, [email]);

  // Reset messages when component mounts
  useEffect(() => {
    // Extract any error or success from query params
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    const successParam = params.get('success');
    const emailParam = params.get('email');
    
    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    }
    
    if (successParam) {
      setSuccessMessage(decodeURIComponent(successParam));
    }
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form fields
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const result = await login(email, password);
      console.log('Login result:', result); // Debug log
      
      if (result.success) {
        // Redirect to dashboard or requested page
        const from = location.state?.from?.pathname || '/';
        navigate(from);
      } else if (result.message?.includes('email not verified')) {
        // Show option to resend verification
        setVerifyEmailSent(true);
        setErrorMessage('Your email is not verified. Please check your inbox or request a new verification email.');
      } else {
        // Extract the most accurate error message
        let message = result.message;
        
        // Try to get the message from original response if available
        if (result.originalResponse && result.originalResponse.message) {
          message = result.originalResponse.message;
        }
        
        // Special error handling based on error code
        const errorCode = result.code || result.originalResponse?.code;
        
        // Handle specific error codes
        if (errorCode === 'account-inactive' || message?.includes('not active')) {
          message = 'Your account is not active. Please contact support for assistance.';
        } else if (errorCode === 'account-setup-required' || message?.includes('account setup')) {
          message = 'Your account requires additional setup. Please contact support for assistance.';
        } else if (errorCode === 'auth-error') {
          message = 'Authentication failed. Please verify your credentials or contact support.';
        }
        setErrorMessage(message || 'Login failed. Please try again.');
      }
    } catch (error) {
      if (error.message?.includes('email not verified')) {
        setVerifyEmailSent(true);
        setErrorMessage('Your email is not verified. Please check your inbox or request a new verification email.');
      } else {
        let message = error.message;
        
        if (error.originalResponse?.message) {
          message = error.originalResponse.message;
        } else if (error.response?.data?.message) {
          message = error.response.data.message;
        }
        const errorCode = error.code || error.originalResponse?.code;
        
        if (errorCode === 'account-inactive' || message?.includes('not active')) {
          message = 'Your account is not active. Please contact support for assistance.';
        } else if (errorCode === 'account-setup-required' || message?.includes('account setup')) {
          message = 'Your account requires additional setup. Please contact support for assistance.';
        } else if (errorCode === 'auth-error') {
          message = 'Authentication failed. Please verify your credentials or contact support.';
        }
        
        // Show error message
        console.log('Setting error message from caught error:', message);
        setErrorMessage(message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const result = await resendVerification(email);
      
      if (result.success) {
        setSuccessMessage('Verification email sent! Please check your inbox.');
      } else {
        setErrorMessage(result.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Update handlers for email and password
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    localStorage.setItem('login_email', newEmail);
  };
  
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <Logo />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
        )}
        
        {verifyEmailSent && (
          <Alert severity="warning" sx={{ mt: 2, width: '100%' }}>
            Please verify your email address. Check your inbox for a verification link.
            <Button color="inherit" size="small" onClick={handleResendVerification}>
              Resend Verification Email
            </Button>
          </Alert>
        )}
        
        <Paper elevation={3} sx={{ mt: 1, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5" gutterBottom>
            Sign In to Your Account
          </Typography>
          
          {/* Primary Error Message - Styled for prominence */}
          {errorMessage && (
            <Alert 
              severity="error" 
              variant="filled"
              sx={{ 
                width: '100%', 
                mb: 2,
                fontWeight: 'bold'
              }}
            >
              {errorMessage}
            </Alert>
          )}
          
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          
          {verifyEmailSent ? (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Your email address needs to be verified before you can log in.
              </Alert>
              
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? <CircularProgress size={24} /> : 'Resend Verification Email'}
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setVerifyEmailSent(false);
                    setErrorMessage('');
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              {/* Alternative prominent error display styled differently from Alert */}
              {errorMessage && (
                <Box 
                  sx={{ 
                    mb: 2, 
                    p: 2, 
                    backgroundColor: 'rgba(211, 47, 47, 0.1)', 
                    border: '1px solid rgba(211, 47, 47, 0.5)',
                    borderRadius: '4px',
                    width: '100%'
                  }}
                >
                  <Typography 
                    color="error" 
                    variant="body1" 
                    fontWeight="medium"
                  >
                    {errorMessage}
                  </Typography>
                </Box>
              )}
              
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
                onChange={handleEmailChange}
                disabled={loading}
                error={!email && Boolean(errorMessage)}
                inputProps={{ 
                  spellCheck: 'false',
                  autoCorrect: 'off'
                }}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                error={!password && Boolean(errorMessage)}
                inputProps={{ 
                  spellCheck: 'false',
                  autoCorrect: 'off'
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Sign In'}
              </Button>
              
              <Grid container>
                <Grid item xs>
                  <Link to="/auth/forgot-password" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                      Forgot password?
                    </Typography>
                  </Link>
                </Grid>
                
                <Grid item>
                  <Link to="/auth/register" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                      {"Don't have an account? Sign Up"}
                    </Typography>
                  </Link>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage; 