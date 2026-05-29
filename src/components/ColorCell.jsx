
import React from 'react';
import { cn } from '@/lib/utils.js';
import { usePaintingMode } from '@/contexts/PaintingModeContext.jsx';

const ColorCell = ({ children, className, isEditing, onContextMenu, onClick, style }) => {
  const { isDeleteMode, isPaintingMode } = usePaintingMode();
  
  return (
    <div 
      className={cn(
        "flex items-center h-full border-r border-gray-100/50 px-4 relative overflow-hidden transition-all",
        isEditing ? "bg-blue-50/50 outline outline-2 outline-blue-400 outline-offset-[-2px] z-20" : "",
        isDeleteMode && "delete-mode-active cursor-eraser",
        isPaintingMode && "cursor-crosshair hover:opacity-75",
        className
      )}
      onContextMenu={onContextMenu}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

export default ColorCell;
