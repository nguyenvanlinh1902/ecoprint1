import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Container, Box, Alert, Divider, Stack } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useSessionStorage } from '../hooks';
import GoogleIcon from '@mui/icons-material/Google';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, directLogin, loginWithGoogle } = useAuth();
  const { redirectToLastVisitedPath } = useSessionStorage();

  // Helper function to set predefined credentials
  const setCredentials = (type) => {
    if (type === 'admin') {
      setEmail('admin');
      setPassword('admin123');
    } else if (type === 'user') {
      setEmail('user');
      setPassword('user123');
    }
  };

  // Hàm xử lý đăng nhập nhanh
  const handleDirectLogin = (type) => {
    setLoading(true);
    setError('');

    try {
      // Gọi hàm đăng nhập trực tiếp từ useAuth hook
      const user = directLogin(type);
      
      // Điều hướng người dùng dựa trên vai trò
      if (type === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message || 'Quick login failed. Please try with credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      redirectToLastVisitedPath();
    } catch (error) {
      if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
        setError('Network connection error. Please check your internet or try using quick login.');
      } else {
        setError(error.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      await loginWithGoogle();
      redirectToLastVisitedPath();
    } catch (error) {
      // Check if it's a 404 error
      if (error.message && error.message.includes('404')) {
        setError('Firebase API not available. This might be due to network issues or firewall restrictions. Please try email/password login.');
      } else if (error.message && error.message.includes('popup blocked')) {
        setError('Google login popup was blocked. Please allow popups for this site and try again.');
      } else {
        setError(error.message || 'Failed to sign in with Google.');
      }
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
            Sign In
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
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
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{ mb: 2 }}
              disabled={loading}
            >
              Sign In with Google
            </Button>
            
            <Divider sx={{ my: 2 }}>Quick Login Options</Divider>
            
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth
                onClick={() => setCredentials('admin')}
              >
                Admin
              </Button>
              <Button 
                variant="outlined" 
                color="secondary" 
                fullWidth
                onClick={() => setCredentials('user')}
              >
                User
              </Button>
            </Stack>
            
            <Stack direction="row" spacing={2}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={() => handleDirectLogin('admin')}
                disabled={loading}
              >
                Admin Login
              </Button>
              <Button 
                variant="contained" 
                color="secondary" 
                fullWidth
                onClick={() => handleDirectLogin('user')}
                disabled={loading}
              >
                User Login
              </Button>
            </Stack>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  Sign Up
                </Link>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage; 