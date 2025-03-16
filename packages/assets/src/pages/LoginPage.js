import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TextField, Button, Typography, Paper, Container, Box, Alert, Divider, Stack, Chip } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import useHistory from '../hooks/useHistory';
import { useSessionStorage } from '../hooks';
import GoogleIcon from '@mui/icons-material/Google';

const LoginPage = () => {
  /* log removed */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [networkIssue, setNetworkIssue] = useState(false);
  const history = useHistory();
  /* log removed */
  const { login, register, useMockAuth, directLogin, loginWithGoogle } = useAuth();
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
      /* log removed */
      const user = directLogin(type);
      /* log removed */
      
      // Điều hướng người dùng dựa trên vai trò
      if (type === 'admin') {
        history.push('/admin/dashboard');
      } else {
        history.push('/dashboard');
      }
    } catch (error) {
      /* error removed */
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
      /* error removed */
      
      if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
        setNetworkIssue(true);
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
      /* log removed */
      await loginWithGoogle();
      /* log removed */
      redirectToLastVisitedPath();
    } catch (error) {
      /* error removed */
      
      // Check if it's a 404 error
      if (error.message && error.message.includes('404')) {
        setNetworkIssue(true);
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

  // Function to test Firebase Authentication directly
  const testFirebaseAuth = async () => {
    setTestResult('Testing Firebase Authentication...');
    try {
      const testEmail = 'test@example.com';
      const testPassword = 'password123';
      
      // First try to register a test user
      try {
        const registerResult = await register(testEmail, testPassword, 'Test User');
        setTestResult(prev => prev + '\nRegistration successful: ' + registerResult.uid);
      } catch (regError) {
        // If user already exists, that's fine
        setTestResult(prev => prev + '\nRegistration error: ' + regError.message);
      }
      
      // Now try to sign in
      try {
        const directAuthResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        setTestResult(prev => prev + '\nDirect auth successful: ' + directAuthResult.user.uid);
      } catch (authError) {
        setTestResult(prev => prev + '\nDirect auth error: ' + authError.message);
      }
    } catch (error) {
      setTestResult(prev => prev + '\nTest failed with error: ' + error.message);
    }
  };

  // Function to test with hardcoded Firebase config
  const testWithHardcodedConfig = async () => {
    setTestResult('Testing with hardcoded Firebase configuration...');
    try {
      // Hardcoded Firebase configuration
      const hardcodedConfig = {
        apiKey: "AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8",
        authDomain: "ecoprint1-3cd5c.firebaseapp.com",
        projectId: "ecoprint1-3cd5c",
        storageBucket: "ecoprint1-3cd5c.firebasestorage.app",
        messagingSenderId: "643722203154",
        appId: "1:643722203154:web:7a89c317be9292cc5688cb"
      };
      
      setTestResult(prev => prev + '\nInitializing Firebase with hardcoded config...');
      const testApp = initializeApp(hardcodedConfig, 'testApp');
      setTestResult(prev => prev + '\nFirebase app initialized successfully');
      
      const testAuth = getAuth(testApp);
      setTestResult(prev => prev + '\nFirebase Auth initialized successfully');
      
      const testEmail = 'test@example.com';
      const testPassword = 'password123';
      
      try {
        const authResult = await signInWithEmailAndPassword(testAuth, testEmail, testPassword);
        setTestResult(prev => prev + '\nDirect auth successful with hardcoded config: ' + authResult.user.uid);
      } catch (authError) {
        setTestResult(prev => prev + '\nDirect auth error with hardcoded config: ' + authError.message);
      }
    } catch (error) {
      setTestResult(prev => prev + '\nHardcoded config test failed with error: ' + error.message);
    }
  };

  // Test the Firebase API key directly
  const testFirebaseApiKey = async () => {
    setTestResult('Testing Firebase API key directly...');
    
    try {
      const apiKey = "AIzaSyAEkrwAAQ5iuqOkWNqlReRon_59lTnLKf8";
      const testEmail = "test@example.com";
      const testPassword = "password123";
      
      // This is a direct HTTP request to the Firebase Auth REST API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        setTestResult(prev => prev + '\nSending request to Firebase Auth API...');
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: testEmail,
              password: testPassword,
              returnSecureToken: true
            }),
            signal: controller.signal,
            keepalive: true
          }
        );
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (response.ok) {
          setTestResult(prev => prev + `\nAPI key is valid. Authenticated user: ${data.email}`);
        } else {
          setTestResult(prev => prev + `\nAPI key validation failed. Error: ${data.error.message}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          setTestResult(prev => prev + '\nRequest timed out after 10 seconds');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      setTestResult(prev => prev + `\nAPI key test failed with error: ${error.message}`);
      setTestResult(prev => prev + '\nThis may indicate network connectivity issues or a firewall blocking Firebase access.');
    }
  };

  // Function to test network connectivity
  const testNetworkConnectivity = async () => {
    setTestResult('Testing network connectivity...');
    let hasNetworkIssue = true; // Default to true for this case
    setNetworkIssue(true);
    
    try {
      // Test 4: General internet connectivity
      setTestResult(prev => prev + '\nTesting general internet connectivity...');
      try {
        await fetch('https://www.google.com', { mode: 'no-cors', timeout: 5000 });
        setTestResult(prev => prev + '\nGeneral internet: Connected');
      } catch (error) {
        setTestResult(prev => prev + '\nGeneral internet: Failed');
        hasNetworkIssue = true;
      }
      
      // Test 2: Firebase API
      setTestResult(prev => prev + '\nTesting connection to Firebase API...');
      try {
        await fetch('https://identitytoolkit.googleapis.com/', { mode: 'no-cors', timeout: 5000 });
        setTestResult(prev => prev + '\nFirebase API: Connected');
      } catch (error) {
        setTestResult(prev => prev + '\nFirebase API: Failed');
        hasNetworkIssue = true;
      }
      
      // Set the network issue state based on the tests
      setNetworkIssue(hasNetworkIssue);
      
      if (hasNetworkIssue) {
        setTestResult(prev => prev + '\n\nNetwork issues detected. You can use hardcoded admin/user credentials:');
        setTestResult(prev => prev + '\n- Admin: username "admin", password "admin123"');
        setTestResult(prev => prev + '\n- User: username "user", password "user123"');
      }
      
    } catch (error) {
      setTestResult(prev => prev + '\nConnectivity test error: ' + error.message);
      setNetworkIssue(true);
    }
  };

  // Test Firebase connectivity directly
  const testFirebaseConnectivity = async () => {
    setTestResult('Testing Firebase connectivity directly...');
    
    const tests = [
      {
        name: 'Internet Connectivity',
        fn: async () => {
          try {
            await fetch('https://www.google.com', { mode: 'no-cors', timeout: 5000 });
            return { success: true, message: 'Internet connection is working' };
          } catch (error) {
            return { success: false, message: `Internet connection failed: ${error.message}` };
          }
        }
      },
      {
        name: 'Firebase Auth API',
        fn: async () => {
          try {
            // Try to get the current user (doesn't require authentication)
            const currentUser = auth.currentUser;
            return { 
              success: true, 
              message: `Auth API connected, ${currentUser ? 'user is signed in' : 'no user is signed in'}` 
            };
          } catch (error) {
            return { success: false, message: `Auth API failed: ${error.message}` };
          }
        }
      },
      {
        name: 'Firestore API',
        fn: async () => {
          try {
            // Try to get a simple document that should exist
            const testDoc = await getDoc(doc(db, 'system', 'status'));
            return { 
              success: true, 
              message: `Firestore API connected, test document ${testDoc.exists() ? 'exists' : 'does not exist'}` 
            };
          } catch (error) {
            return { success: false, message: `Firestore API failed: ${error.message}` };
          }
        }
      }
    ];
    
    // Run all tests
    for (const test of tests) {
      setTestResult(prev => prev + `\n\nTesting ${test.name}...`);
      try {
        const result = await test.fn();
        setTestResult(prev => prev + `\nResult: ${result.success ? '✓' : '✗'} ${result.message}`);
      } catch (error) {
        setTestResult(prev => prev + `\nTest failed with error: ${error.message}`);
      }
    }
    
    setTestResult(prev => prev + '\n\nIf any tests failed, you may have network connectivity issues or your Firebase project might not be properly configured.');
  };

  // Restore session from localStorage
  const handleRestoreSession = () => {
    setLoading(true);
    setError('');
    
    try {
      const mockUser = localStorage.getItem('mockAuthUser');
      const mockProfile = localStorage.getItem('mockAuthProfile');
      const token = localStorage.getItem('authToken');
      
      if (!mockUser || !mockProfile || !token) {
        setError('No session data found. Please log in with your credentials.');
        return;
      }
      // Parse and validate data
      try {
        const parsedUser = JSON.parse(mockUser);
        const parsedProfile = JSON.parse(mockProfile);
        
        if (!parsedUser?.uid || !parsedProfile?.role) {
          setError('Invalid session data. Please log in again.');
          return;
        }
        
        const type = parsedProfile.role === 'admin' ? 'admin' : 'user';
        handleDirectLogin(type);
        
      } catch (parseError) {
        setError('Session data is corrupted. Please log in again.');
        localStorage.removeItem('mockAuthUser');
        localStorage.removeItem('mockAuthProfile');
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      setError('Failed to restore session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  // Run a quick network test when the component mounts 
  useEffect(() => {
    testNetworkConnectivity();
  }, []);

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            Tạm thời đăng nhập:
          </Typography>
          <Stack direction="row" spacing={2} mt={1}>
            <Button 
              fullWidth
              variant="contained" 
              color="primary" 
              onClick={() => handleDirectLogin('admin')}
              disabled={loading}
            >
              ADMIN
            </Button>
            <Button 
              fullWidth
              variant="contained" 
              color="secondary" 
              onClick={() => handleDirectLogin('user')}
              disabled={loading}
            >
              USER
            </Button>
          </Stack>
        </Alert>
        
        {networkIssue && (
          <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
            <Typography variant="body2" component="div">
              Không thể kết nối Firebase. Sử dụng tài khoản test:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label="ADMIN" 
                  color="primary" 
                  size="small" 
                  onClick={() => setCredentials('admin')}
                  sx={{ cursor: 'pointer' }}
                />
                <Typography variant="body2">Username: <strong>admin</strong> / Password: <strong>admin123</strong></Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label="USER" 
                  color="secondary" 
                  size="small" 
                  onClick={() => setCredentials('user')}
                  sx={{ cursor: 'pointer' }}
                />
                <Typography variant="body2">Username: <strong>user</strong> / Password: <strong>user123</strong></Typography>
              </Box>
            </Box>
          </Alert>
        )}
        
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" textAlign="center" gutterBottom>
            Sign In
            {useMockAuth && (
              <Chip 
                label="MOCK AUTH" 
                color="warning" 
                size="small" 
                sx={{ ml: 1, verticalAlign: 'middle' }}
              />
            )}
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
              label="Email Address or Username"
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
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading || networkIssue}
              sx={{ 
                mt: 1, 
                mb: 2, 
                borderColor: '#4285F4',
                color: '#4285F4',
                '&:hover': {
                  borderColor: '#3367D6',
                  backgroundColor: 'rgba(66, 133, 244, 0.04)'
                }
              }}
            >
              Sign in with Google
            </Button>
            
            {/* Quick Login Buttons */}
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle2" align="center" sx={{ mb: 2 }}>
                Test Accounts
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => handleDirectLogin('admin')}
                  disabled={loading}
                >
                  Admin Login
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={() => handleDirectLogin('user')}
                  disabled={loading}
                >
                  User Login
                </Button>
              </Stack>
            </Box>
            
            {networkIssue && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    size="small"
                    onClick={() => setCredentials('admin')}
                  >
                    Use Admin Account
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    size="small"
                    onClick={() => setCredentials('user')}
                  >
                    Use User Account
                  </Button>
                </Stack>
              </Box>
            )}
            
            {/* Nút khôi phục session */}
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              onClick={handleRestoreSession}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Restore Session
            </Button>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Forgot password?
                </Typography>
              </Link>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Don't have an account? Sign Up
                </Typography>
              </Link>
            </Box>
          </Box>
          
          {/* Firebase Auth Testing Section */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" gutterBottom>
            Firebase Authentication Test
          </Typography>
          <Stack spacing={1}>
            <Button 
              variant="outlined" 
              onClick={testFirebaseAuth}
              fullWidth
            >
              Test Firebase Auth
            </Button>
            <Button 
              variant="outlined" 
              onClick={testWithHardcodedConfig}
              fullWidth
              color="secondary"
            >
              Test With Hardcoded Config
            </Button>
            <Button 
              variant="outlined" 
              onClick={testFirebaseApiKey}
              fullWidth
              color="warning"
            >
              Test API Key Directly
            </Button>
            <Button 
              variant="outlined" 
              onClick={testNetworkConnectivity}
              fullWidth
              color="error"
            >
              Test Network Connectivity
            </Button>
            <Button 
              variant="outlined" 
              onClick={testFirebaseConnectivity}
              fullWidth
              color="success"
            >
              Test Firebase Connectivity
            </Button>
          </Stack>
          {testResult && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {testResult}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage; 