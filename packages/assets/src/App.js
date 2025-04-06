import React from 'react';
import AppRouter from './routes';
import { AppProvider } from './context/AppContext';

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App; 