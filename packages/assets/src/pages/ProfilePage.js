import React, { useState } from 'react';
import {
  Typography, Box, Paper, Grid, TextField, Button, 
  CircularProgress, Divider, Alert, Card, CardContent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatPhoneNumber } from '../helpers/formatters';

const ProfilePage = () => {
  const { userDetails, fetchUserDetails } = useAuth();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: userDetails?.companyName || '',
    phone: userDetails?.phone || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });
  };
  
  const handleEditToggle = () => {
    if (editing) {
      // Cancel editing - reset form
      setFormData({
        companyName: userDetails?.companyName || '',
        phone: userDetails?.phone || '',
      });
      setError('');
      setSuccess(false);
    }
    setEditing(!editing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      await api.put('/api/users/me', {
        companyName: formData.companyName,
        phone: formData.phone,
      });
      
      // Refresh user details
      await fetchUserDetails();
      
      setSuccess(true);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(error.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!passwordData.newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);
    
    try {
      // This is a placeholder - you'll need to implement this API endpoint
      await api.put('/api/users/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setChangingPassword(false);
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordError(error.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!userDetails) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Account Information</Typography>
          <Button 
            variant={editing ? "outlined" : "contained"} 
            color={editing ? "error" : "primary"}
            onClick={handleEditToggle}
          >
            {editing ? "Cancel" : "Edit Profile"}
          </Button>
        </Box>
        
        {editing ? (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={userDetails.email}
                  disabled
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Account Balance"
                  value={`$${userDetails.balance?.toFixed(2) || '0.00'}`}
                  disabled
                  helperText="To add funds, go to Deposit page"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Save Changes"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Company Name
              </Typography>
              <Typography variant="body1">
                {userDetails.companyName}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Phone Number
              </Typography>
              <Typography variant="body1">
                {formatPhoneNumber(userDetails.phone)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Email Address
              </Typography>
              <Typography variant="body1">
                {userDetails.email}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Account Balance
              </Typography>
              <Typography variant="body1">
                ${userDetails.balance?.toFixed(2) || '0.00'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Account Status
              </Typography>
              <Typography variant="body1" sx={{ 
                color: userDetails.status === 'active' ? 'success.main' : 'error.main' 
              }}>
                {userDetails.status === 'active' ? 'Active' : 'Inactive'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Member Since
              </Typography>
              <Typography variant="body1">
                {userDetails.createdAt ? new Date(userDetails.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        )}
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Security</Typography>
          <Button 
            variant={changingPassword ? "outlined" : "contained"} 
            color={changingPassword ? "error" : "primary"}
            onClick={() => {
              setChangingPassword(!changingPassword);
              setPasswordError('');
              setPasswordSuccess(false);
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
            }}
          >
            {changingPassword ? "Cancel" : "Change Password"}
          </Button>
        </Box>
        
        {passwordSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Password changed successfully!
          </Alert>
        )}
        
        {passwordError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {passwordError}
          </Alert>
        )}
        
        {changingPassword ? (
          <form onSubmit={handlePasswordSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  helperText="At least 6 characters"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Update Password"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        ) : (
          <Typography>
            For security reasons, we recommend changing your password regularly.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ProfilePage; 