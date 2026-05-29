
import React, { useEffect } from 'react';
import HomePage from '@/pages/HomePage';
import { Toaster } from '@/components/ui/toaster';
import { PaintingModeProvider } from '@/contexts/PaintingModeContext';

function App() {
  useEffect(() => {
    // Clean up legacy color state from localStorage
    localStorage.removeItem('erp-color-state');
    localStorage.removeItem('erp-color-palette');
  }, []);

  return (
    <PaintingModeProvider>
      <HomePage />
      <Toaster />
    </PaintingModeProvider>
  );
}

export default App;
