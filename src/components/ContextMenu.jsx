
import React, { useEffect, useRef } from 'react';
import { Palette, Trash2, X, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

const ContextMenu = ({ x, y, cellName, legends, onClose, onApplyColor, onRemoveColor }) => {
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Adjust positioning to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = x;
      let newY = y;

      if (x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${Math.max(10, newX)}px`;
      menu.style.top = `${Math.max(10, newY)}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[220px] bg-white rounded-xl shadow-xl border border-gray-200/80 p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none text-gray-800"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 mb-1">
        <span className="truncate">Destacar {cellName ? `Coluna "${cellName}"` : 'Linha'}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded p-0.5 hover:bg-gray-100 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="max-h-[240px] overflow-y-auto py-0.5 space-y-0.5 scrollbar-thin">
        {legends && legends.length > 0 ? (
          legends.map((legend) => (
            <button
              key={legend.id}
              onClick={() => {
                onApplyColor(legend.id, false);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <div 
                className="w-4 h-4 rounded-full border border-gray-200 shadow-sm shrink-0" 
                style={{ backgroundColor: legend.color }} 
              />
              <span className="font-medium truncate">{legend.name}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-3 text-xs text-gray-400 text-center flex flex-col items-center gap-1">
            <Palette className="w-5 h-5 text-gray-300" />
            <span>Nenhuma legenda de cor ativa.</span>
          </div>
        )}
      </div>

      {legends && legends.length > 0 && cellName && (
        <div className="border-t border-gray-100 my-1 pt-1">
          <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Linha Inteira
          </div>
          {legends.map((legend) => (
            <button
              key={`row-${legend.id}`}
              onClick={() => {
                onApplyColor(legend.id, true);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-left"
            >
              <div 
                className="w-3.5 h-3.5 rounded border border-gray-200 shadow-sm shrink-0" 
                style={{ backgroundColor: legend.color }} 
              />
              <span className="truncate">Toda linha: {legend.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 mt-1 pt-1">
        {cellName && (
          <button
            onClick={() => {
              onRemoveColor(false);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left font-medium"
          >
            <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
            <span>Limpar cor desta célula</span>
          </button>
        )}

        <button
          onClick={() => {
            onRemoveColor(true);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors text-left font-medium"
        >
          <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
          <span>Limpar cor da linha inteira</span>
        </button>
      </div>
    </div>
  );
};

export default ContextMenu;
