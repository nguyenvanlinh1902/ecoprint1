import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, 
  Button, Alert, Container
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const MaintenancePage = () => {
  const [message, setMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await api.get('/api/maintenance-info');
        
        setMessage(response.data.message || 'We are currently performing scheduled maintenance. Please check back later.');
        setEstimatedTime(response.data.estimatedTime || 'soon');
        
        // Check if user is admin
        try {
          const userResponse = await api.get('/api/auth/me');
          setIsAdmin(userResponse.data.data.role === 'admin');
        } catch (error) {
          // Not logged in or not admin
          setIsAdmin(false);
        }
        
      } catch (error) {
        console.error('Error fetching maintenance info:', error);
        setError('Unable to fetch maintenance information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    checkMaintenanceStatus();
    
    // Check maintenance status every minute
    const interval = setInterval(checkMaintenanceStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleAdminAccess = () => {
    navigate('/admin/dashboard');
  };
  
  const handleRetry = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/health');
      
      if (response.data.status === 'ok') {
        navigate('/dashboard');
      } else {
        // Still in maintenance
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 5, mt: 10, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Typography sx={{ fontSize: '80px' }}>🛠️ 🔧</Typography>
        </Box>
        
        <Typography variant="h3" gutterBottom>
          Site Under Maintenance
        </Typography>
        
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4 }}>
          We'll be back {estimatedTime}. Thank you for your patience.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary" onClick={handleRetry} sx={{ mr: 2 }}>
            Try Again
          </Button>
          
          {isAdmin && (
            <Button variant="outlined" onClick={handleAdminAccess}>
              Admin Access
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default MaintenancePage; 