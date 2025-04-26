import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import { useCreateApi } from '../hooks';

/**
 * Email verification page that handles email verification process
 */
const VerifyEmailPage = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerification } = useAuth();
  const { handleCreate: verifyEmail } = useCreateApi({
    url: '/auth/verify-email',
    successMsg: 'Email verification successful',
    errorMsg: 'Verification failed'
  });

  // Extract verification code and email from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    const emailParam = params.get('email');
    
    if (codeParam) {
      setVerificationCode(codeParam);
      handleVerify(codeParam);
    }
    
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location]);

  // Verify email with code
  const handleVerify = async (code) => {
    if (!code) {
      setError('Please enter a verification code.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Call API to verify email
      const result = await verifyEmail({ code: code || verificationCode });
      
      if (result) {
        setSuccess(true);
        setError('');
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { verified: true },
            replace: true 
          });
        }, 3000);
      } else {
        setError('Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification email
  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    
    setResendLoading(true);
    setError('');
    setResendSuccess(false);
    
    try {
      const result = await resendVerification(email);
      
      if (result.success) {
        setResendSuccess(true);
        setError('');
      } else {
        setError(result.message || 'Failed to resend verification email. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Logo sx={{ mb: 3 }} />
        
        <Typography variant="h5" component="h1" gutterBottom>
          {success ? 'Email Verified!' : 'Verify Your Email'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success ? (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your email has been verified successfully!
            </Alert>
            
            <Typography variant="body1" paragraph>
              You will be redirected to the login page in a few seconds...
            </Typography>
            
            <Button
              component={Link}
              to="/login"
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Typography variant="body1" paragraph>
              Please enter the verification code sent to your email address 
              or click the link in the email to verify your account.
            </Typography>
            
            <TextField
              label="Verification Code"
              fullWidth
              margin="normal"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={loading}
            />
            
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => handleVerify()}
              disabled={loading || !verificationCode}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Verify Email'}
            </Button>
            
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                Didn't receive a verification code?
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <TextField
                label="Your Email Address"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={resendLoading}
              />
              
              {resendSuccess && (
                <Alert severity="success">
                  Verification email sent! Please check your inbox.
                </Alert>
              )}
              
              <Button
                fullWidth
                variant="outlined"
                onClick={handleResend}
                disabled={resendLoading || !email}
              >
                {resendLoading ? <CircularProgress size={24} /> : 'Resend Verification Email'}
              </Button>
              
              <Button
                component={Link}
                to="/login"
                fullWidth
                color="inherit"
                sx={{ mt: 1 }}
              >
                Back to Login
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default VerifyEmailPage; 