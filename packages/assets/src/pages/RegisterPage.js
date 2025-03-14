import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Paper, TextField, Button, Typography, Box, 
  Grid, Alert, CircularProgress, Stepper, Step, StepLabel
} from '@mui/material';
import api from '../services/api';

const steps = ['Company Information', 'Account Information', 'Confirmation'];

const RegisterPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleNext = () => {
    // Validate current step
    if (activeStep === 0) {
      if (!companyName || !phone) {
        setError('Please fill in all required fields');
        return;
      }
      if (phone.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }
      setError('');
    } else if (activeStep === 1) {
      if (!email || !password || !confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      setError('');
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Register user
      await api.post('/api/register', {
        companyName,
        phone,
        email,
        password
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Registration failed:', error);
      if (error.response && error.response.data) {
        setError(error.response.data.error?.message || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="companyName"
              label="Company Name"
              name="companyName"
              autoComplete="organization"
              autoFocus
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="Phone Number"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </>
        );
      case 2:
        return (
          <>
            <Typography variant="h6" gutterBottom>
              Review your information
            </Typography>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="subtitle1">Company Name:</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body1">{companyName}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="subtitle1">Phone:</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body1">{phone}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="subtitle1">Email:</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography variant="body1">{email}</Typography>
                </Grid>
              </Grid>
            </Box>
          </>
        );
      default:
        return null;
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh'
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
            <Typography component="h1" variant="h5" gutterBottom>
              Registration Successful
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your account has been created successfully. Please wait for admin approval before logging in.
            </Alert>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              color="primary"
            >
              Back to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            B2B Account Registration
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {renderStepContent(activeStep)}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
          
          <Grid container justifyContent="flex-end" sx={{ mt: 3 }}>
            <Grid item>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" color="primary">
                  Already have an account? Sign in
                </Typography>
              </Link>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage; 