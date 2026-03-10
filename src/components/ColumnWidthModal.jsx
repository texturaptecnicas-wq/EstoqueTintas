
import React, { useState, useEffect } from 'react';
import { X, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ColumnWidthModal = ({ isOpen, onClose, column, currentWidth, onSave }) => {
  const [width, setWidth] = useState(currentWidth || 220);

  useEffect(() => {
    if (isOpen) {
      setWidth(currentWidth || 220);
    }
  }, [isOpen, currentWidth]);

  if (!isOpen || !column) return null;

  const handleSave = () => {
    const newWidth = Math.max(parseInt(width) || 150, 150);
    onSave(column.key, newWidth);
    onClose();
  };

  const setPreset = (val) => setWidth(val);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Ajustar Largura</h3>
            <p className="text-sm text-gray-500">Coluna: <span className="font-semibold text-gray-700">{column.label}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Tamanhos Predefinidos</Label>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setPreset(150)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${width === 150 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:border-blue-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Smartphone className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Pequeno</span>
                <span className="text-[10px] opacity-70">150px</span>
              </button>
              
              <button 
                onClick={() => setPreset(220)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${width === 220 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:border-blue-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Tablet className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Médio</span>
                <span className="text-[10px] opacity-70">220px</span>
              </button>
              
              <button 
                onClick={() => setPreset(350)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${width === 350 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:border-blue-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <Monitor className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Grande</span>
                <span className="text-[10px] opacity-70">350px</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Largura Personalizada (px)</Label>
            <Input 
              type="number" 
              value={width} 
              onChange={(e) => setWidth(e.target.value)}
              className="h-12 text-lg text-gray-900 border-gray-300 bg-white font-medium focus-visible:ring-blue-500"
              min="150"
            />
            <p className="text-xs text-gray-500">A largura mínima permitida é de 150px para garantir a legibilidade.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="bg-white">Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Aplicar Ajuste</Button>
        </div>
      </div>
    </div>
  );
};

export default ColumnWidthModal;
