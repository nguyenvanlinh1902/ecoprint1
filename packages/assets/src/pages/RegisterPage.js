import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Container, 
  Box, 
  Alert, 
  Grid,
  CircularProgress  // Added CircularProgress for loading indication
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { validateInput, stripHTML } from '../helpers/validation';
import PropTypes from 'prop-types';

/**
 * Registration page component with email verification
 */
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    companyName: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // Clear server error when user makes changes after a failed submission
    if (formSubmitted && serverError) {
      setServerError('');
    }
  };

  const validate = () => {
    const validationErrors = validateInput(formData);
    
    // Additional custom validations
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = 'Email is invalid';
    }
    
    if (formData.password && formData.password.length < 6) {
      validationErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't submit if already loading
    if (loading) return;
    
    setFormSubmitted(true);
    
    // Validate the form - If validation fails, form data remains intact
    if (!validate()) {
      console.log('[RegisterPage] Validation failed - keeping form data');
      return;
    }

    // Important: We'll clear previous errors but NEVER clear form data until successful
    setServerError('');
    setLoading(true);

    // Create a local copy of form data to use in the API call
    // This avoids any accidental mutations to the original form data
    const formDataCopy = { ...formData };

    try {
      // Sanitize input data WITHOUT modifying the original form data
      const sanitizedData = {
        email: stripHTML(formDataCopy.email),
        password: stripHTML(formDataCopy.password),
        displayName: stripHTML(formDataCopy.displayName),
        companyName: stripHTML(formDataCopy.companyName || ''),
        phone: stripHTML(formDataCopy.phone || '')
      };

      console.log('[RegisterPage] Submitting registration with data:', {
        email: sanitizedData.email,
        displayName: sanitizedData.displayName
      });
      
      // Call register function
      let result = null;
      
      try {
        result = await register(
          sanitizedData.email, 
          sanitizedData.password, 
          sanitizedData.displayName, 
          sanitizedData.companyName, 
          sanitizedData.phone
        );
        
        console.log('[RegisterPage] Registration result:', result);
      } catch (apiError) {
        // If there's an error calling the API, we'll handle it here
        console.error('[RegisterPage] API call error:', apiError);
        // Set the error message but KEEP the form data
        setServerError(apiError.message || 'Registration failed. Please try again.');
        // Ensure loading state is cleared
        setLoading(false);
        // Return early to ensure we don't clear the form
        return;
      }
      
      // Check if registration was successful
      if (result && result.success === true) {
        console.log('[RegisterPage] Registration successful');
        
        // Navigate to the verification page
        navigate('/auth/verification-sent', { 
          state: { 
            email: sanitizedData.email,
            message: result.message || 'Registration successful. Please verify your email address before logging in.'
          }
        });
        
        // ONLY clear the form on success and AFTER navigating
        setTimeout(() => {
          console.log('[RegisterPage] Clearing form data after successful registration');
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            displayName: '',
            companyName: '',
            phone: ''
          });
        }, 500);
      } else {
        // Any non-success response - show error and KEEP the form data
        console.error('[RegisterPage] Registration failed:', result || 'No result returned');
        
        // Set error message from the result if available
        setServerError(result?.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      // Unexpected errors - log them but KEEP the form data
      console.error('[RegisterPage] Unexpected error during registration:', error);
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" textAlign="center" gutterBottom>
            Create an Account
          </Typography>
          
          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}
          
          <Box component="form" noValidate onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="displayName"
              label="Full Name"
              id="displayName"
              autoComplete="name"
              value={formData.displayName}
              onChange={handleChange}
              error={!!errors.displayName}
              helperText={errors.displayName}
              disabled={loading}
            />
            <TextField
              margin="normal"
              fullWidth
              name="companyName"
              label="Company Name (Optional)"
              id="companyName"
              value={formData.companyName}
              onChange={handleChange}
              error={!!errors.companyName}
              helperText={errors.companyName}
              disabled={loading}
            />
            <TextField
              margin="normal"
              fullWidth
              name="phone"
              label="Phone Number (Optional)"
              id="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>
            
            <Grid container justifyContent="center">
              <Grid item>
                <Link to="/auth/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Already have an account? Login
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

RegisterPage.propTypes = {
  // No props needed for this component
};

export default RegisterPage; 