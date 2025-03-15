import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, TextField, Button, 
  CircularProgress, Divider, Alert, Card, CardContent,
  Avatar, List, ListItem, ListItemText, ListItemAvatar,
  ListItemIcon, Switch, Chip, Stack
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { formatPhoneNumber } from '../helpers/formatters';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import GoogleIcon from '@mui/icons-material/Google';
import LockIcon from '@mui/icons-material/Lock';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';

const ProfilePage = () => {
  console.log('ProfilePage rendering');
  const { userProfile, updateProfile, currentUser } = useAuth();
  console.log('User profile from auth:', userProfile);
  console.log('Current user from auth:', currentUser);
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    companyName: userProfile?.companyName || '',
    phone: userProfile?.phone || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Update form data when user profile changes
  useEffect(() => {
    console.log('userProfile changed:', userProfile);
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        companyName: userProfile.companyName || '',
        phone: userProfile.phone || '',
      });
      setInitialLoad(false);
    }
  }, [userProfile]);

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
        displayName: userProfile?.displayName || '',
        companyName: userProfile?.companyName || '',
        phone: userProfile?.phone || '',
      });
      setError('');
      setSuccess(false);
    }
    setEditing(!editing);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.displayName.trim()) {
      setError('Name is required');
      return;
    }
    
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
      // First update profile in Firestore via custom function
      await updateProfile({
        displayName: formData.displayName,
        companyName: formData.companyName,
        phone: formData.phone,
      });
      
      setSuccess(true);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'Failed to update profile');
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

  // If still loading initially, show a loading indicator
  if (initialLoad) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading profile...
        </Typography>
      </Box>
    );
  }

  // If userProfile is null after initial load, show a helpful message
  if (!userProfile) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6">Profile information unavailable</Typography>
          <Typography variant="body1">
            We couldn't load your profile information. This may be due to a network issue.
          </Typography>
        </Alert>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', py: 5 }}>
            <AccountCircleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Profile Data Unavailable</Typography>
            <Typography variant="body1" align="center">
              Please check your internet connection and try refreshing the page.
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 3 }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
  
  // Safe access to user profile with defaults to prevent errors
  const safeUserProfile = {
    displayName: userProfile?.displayName || 'User',
    email: userProfile?.email || 'No email available',
    role: userProfile?.role || 'user',
    companyName: userProfile?.companyName || 'Not set',
    phone: userProfile?.phone || 'Not set',
    photoURL: userProfile?.photoURL || null
  };

  // Check if the user has connected with Google
  const hasGoogleProvider = currentUser?.providerData?.some(
    provider => provider.providerId === 'google.com'
  );

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

      {/* User Profile Card */}
      <Paper sx={{ p: 0, mb: 4, overflow: 'hidden' }}>
        <Box sx={{ 
          p: 3, 
          backgroundColor: 'primary.main', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar 
            src={safeUserProfile.photoURL} 
            alt={safeUserProfile.displayName}
            sx={{ width: 80, height: 80, border: '3px solid white' }}
          >
            {safeUserProfile.displayName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {safeUserProfile.displayName}
            </Typography>
            <Typography variant="body1">
              {safeUserProfile.email}
            </Typography>
            <Chip 
              label={safeUserProfile.role === 'admin' ? 'Admin' : 'User'} 
              color={safeUserProfile.role === 'admin' ? 'error' : 'primary'}
              variant="outlined"
              size="small"
              sx={{ mt: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            />
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Account Information</Typography>
            <Button 
              variant={editing ? "outlined" : "contained"} 
              color={editing ? "error" : "primary"}
              onClick={handleEditToggle}
              startIcon={editing ? null : <AccountCircleIcon />}
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
                    label="Full Name"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    required
                  />
                </Grid>
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
                    value={safeUserProfile.email}
                    disabled
                    helperText="Email cannot be changed"
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
            <List>
              <ListItem>
                <ListItemIcon>
                  <BadgeIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Full Name" 
                  secondary={safeUserProfile.displayName} 
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <EmailIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Email Address" 
                  secondary={safeUserProfile.email} 
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Company Name" 
                  secondary={safeUserProfile.companyName} 
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <PhoneIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Phone Number" 
                  secondary={safeUserProfile.phone ? formatPhoneNumber(safeUserProfile.phone) : 'Not set'} 
                />
              </ListItem>
              <Divider variant="inset" component="li" />
              
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Account Type" 
                  secondary={safeUserProfile.role === 'admin' ? 'Administrator' : 'Standard User'} 
                />
              </ListItem>
            </List>
          )}
        </Box>
      </Paper>

      {/* Connected Accounts Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Connected Accounts
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <GoogleIcon color={hasGoogleProvider ? "primary" : "disabled"} />
            </ListItemIcon>
            <ListItemText 
              primary="Google" 
              secondary={hasGoogleProvider ? "Connected" : "Not connected"} 
            />
            <Chip 
              label={hasGoogleProvider ? "Connected" : "Not Connected"} 
              color={hasGoogleProvider ? "success" : "default"}
              size="small"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Password Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Password & Security</Typography>
          <Button 
            variant={changingPassword ? "outlined" : "contained"} 
            color={changingPassword ? "error" : "primary"}
            onClick={() => setChangingPassword(!changingPassword)}
            startIcon={changingPassword ? null : <LockIcon />}
            disabled={hasGoogleProvider && !currentUser?.email}
          >
            {changingPassword ? "Cancel" : "Change Password"}
          </Button>
        </Box>

        {hasGoogleProvider && !currentUser?.email && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You're signed in with Google, so no password is needed.
          </Alert>
        )}
        
        {changingPassword && (
          <>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            )}
            
            {passwordSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password updated successfully!
              </Alert>
            )}
            
            <form onSubmit={handlePasswordSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current Password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="New Password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    helperText="Password must be at least 6 characters"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Confirm New Password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={24} /> : "Update Password"}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ProfilePage; 