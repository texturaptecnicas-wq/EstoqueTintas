import React, { useEffect } from 'react';
import HomePage from '@/pages/HomePage';
import { Toaster } from '@/components/ui/toaster';
import { PaintingModeProvider } from '@/contexts/PaintingModeContext';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Root Application Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro Crítico</h1>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Um erro inesperado ocorreu. Pode haver um conflito de estados ou dados.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>Recarregar Página</Button>
            <Button variant="outline" onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Limpar Cache e Recarregar
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  useEffect(() => {
    localStorage.removeItem('erp-color-state');
    localStorage.removeItem('erp-color-palette');
  }, []);

  return (
    <RootErrorBoundary>
      <PaintingModeProvider>
        <HomePage />
        <Toaster />
      </PaintingModeProvider>
    </RootErrorBoundary>
  );
}

export default App;