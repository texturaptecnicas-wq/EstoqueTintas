
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const PaintingModeContext = createContext(null);

export const usePaintingMode = () => {
  const context = useContext(PaintingModeContext);
  if (!context) {
    throw new Error('usePaintingMode must be used within a PaintingModeProvider');
  }
  return context;
};

export const PaintingModeProvider = ({ children }) => {
  const [paintingMode, setPaintingModeState] = useState(null); // null | 'paint' | 'delete'
  const [activeLegendId, setActiveLegendId] = useState(null);
  const [activeLegend, setActiveLegend] = useState(null);
  
  const isPaintingMode = paintingMode === 'paint';
  const isDeleteMode = paintingMode === 'delete';

  const setPaintingMode = useCallback((legend, mode = 'paint') => {
    setActiveLegendId(legend.id);
    setActiveLegend(legend);
    setPaintingModeState(mode);
  }, []);

  const clearPaintingMode = useCallback(() => {
    setActiveLegendId(null);
    setActiveLegend(null);
    setPaintingModeState(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && paintingMode) {
        clearPaintingMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paintingMode, clearPaintingMode]);

  return (
    <PaintingModeContext.Provider value={{ 
      paintingMode, 
      activeLegendId, 
      activeLegend, 
      isPaintingMode, 
      isDeleteMode,
      setPaintingMode, 
      clearPaintingMode 
    }}>
      {children}
    </PaintingModeContext.Provider>
  );
};
