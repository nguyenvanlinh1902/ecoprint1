import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './styles/index.css';

// Tạo theme mặc định
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

// Use ReactDOM.render for React Router v5 compatibility
ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
); 