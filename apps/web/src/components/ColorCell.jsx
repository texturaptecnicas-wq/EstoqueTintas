import React, { useState } from 'react';
import { cn } from '@/lib/utils.js';
import { usePaintingMode } from '@/contexts/PaintingModeContext.jsx';
import { Loader2 } from 'lucide-react';

const ColorCell = ({ children, className, isEditing, onContextMenu, onClick, style }) => {
  const { isDeleteMode, isPaintingMode } = usePaintingMode();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async (e) => {
    if (onClick && (isPaintingMode || isDeleteMode)) {
      e.stopPropagation();
      setIsLoading(true);
      try {
        await onClick(e);
      } catch (err) {
        console.error("ColorCell error processing click:", err);
      } finally {
        setIsLoading(false);
      }
    } else if (onClick) {
      onClick(e);
    }
  };

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
      onClick={handleClick}
      style={style}
    >
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-30 pointer-events-none">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        </div>
      )}
    </div>
  );
};

export default ColorCell;