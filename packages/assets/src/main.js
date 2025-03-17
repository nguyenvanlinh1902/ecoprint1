import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './styles/index.css';

// Create default theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50', // Green color for eco theme
    },
    secondary: {
      main: '#2196f3',
    },
  },
});

// Use createRoot instead of ReactDOM.render
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
); 