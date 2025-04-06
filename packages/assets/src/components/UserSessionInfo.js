import React from 'react';
import { Box, Typography, Paper, Avatar, Chip, Divider } from '@mui/material';
import { useApp } from '../context/AppContext';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

/**
 * Component to display user session information from the AppContext
 */
const UserSessionInfo = () => {
  const { user, isAdmin, currentRoute, lastVisited, preferences } = useApp();

  if (!user) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body1">Not logged in</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ mr: 2, bgcolor: isAdmin ? 'secondary.main' : 'primary.main' }}>
          {isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
        </Avatar>
        <Box>
          <Typography variant="h6">{user.displayName || 'User'}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>User Info:</Typography>
        <Box sx={{ ml: 2 }}>
          <Typography variant="body2">Role: <Chip size="small" label={user.role || 'user'} color={isAdmin ? 'secondary' : 'primary'} /></Typography>
          <Typography variant="body2">Status: <Chip size="small" label={user.status || 'active'} color="success" /></Typography>
          {user.companyName && (
            <Typography variant="body2">Company: {user.companyName}</Typography>
          )}
        </Box>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Navigation:</Typography>
        <Box sx={{ ml: 2 }}>
          <Typography variant="body2">Current: {currentRoute}</Typography>
          {lastVisited && (
            <Typography variant="body2">Previous: {lastVisited}</Typography>
          )}
        </Box>
      </Box>
      
      {preferences && Object.keys(preferences).length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Preferences:</Typography>
          <Box sx={{ ml: 2 }}>
            {Object.entries(preferences).map(([key, value]) => (
              <Typography key={key} variant="body2">
                {key}: {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default UserSessionInfo; 