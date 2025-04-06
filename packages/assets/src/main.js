import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import './styles/scss/main.scss';
import { StoreProvider } from './reducers/storeReducer';

// Create theme
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

// Get container and render app
const container = document.getElementById('root');
const root = createRoot(container);

try {
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <StoreProvider>
            <App />
            <ToastContainer 
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </StoreProvider>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error initializing app:', error);
  
  // Show error to user
  if (container) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
        <h1 style="color: #d32f2f;">Initialization Error</h1>
        <p>There was a problem starting the application. Please try refreshing the page.</p>
        <button style="padding: 10px 20px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.location.reload()">
          Refresh Page
        </button>
      </div>
    `;
  }
} 