import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Typography,
  Button,
  Container,
  Paper,
  Box,
  Alert,
  Stack
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PropTypes from 'prop-types';

/**
 * VerificationSentPage displays a confirmation that a verification email has been sent
 */
const VerificationSentPage = () => {
  const location = useLocation();
  const email = location.state?.email || 'your email';

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          marginBottom: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <EmailIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            
            <Typography component="h1" variant="h5" align="center" gutterBottom>
              Verification Email Sent
            </Typography>
            
            <Typography variant="body1" align="center" paragraph>
              We've sent a verification link to <strong>{email}</strong>.
            </Typography>
            
            <Typography variant="body1" align="center">
              Please check your email and click the verification link to activate your account.
            </Typography>
          </Box>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            If you don't see the email, please check your spam folder or try to request another verification email.
          </Alert>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Link to="/auth/login" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary">
                Return to Login
              </Button>
            </Link>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};

VerificationSentPage.propTypes = {
  // No props needed
};

export default VerificationSentPage; 