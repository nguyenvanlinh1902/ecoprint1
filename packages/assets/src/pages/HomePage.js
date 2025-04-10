import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  AppBar, 
  Toolbar, 
  Divider 
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import useHistory from '../hooks/useHistory';

const HomePage = () => {
  const { currentUser, signOut } = useAuth();
  const history = useHistory();

  const handleLogout = async () => {
    try {
      /* log removed */
      const success = await signOut();
      
      if (success) {
        /* log removed */
        history.replace('/login');
      } else {
        /* error removed */
        alert('An error occurred during logout. Please try again.');
      }
    } catch (error) {
      /* error removed */
      alert('An error occurred during logout. Please try again.');
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EcoPrint
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to EcoPrint
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body1" paragraph>
          You are currently logged in as: {currentUser?.email}
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Getting Started
          </Typography>
          <Typography variant="body1" paragraph>
            This is your dashboard. Here you can manage your eco-friendly printing projects.
          </Typography>
          
          {/* Add more dashboard content as needed */}
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage; 