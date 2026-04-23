
import React, { useState, useEffect } from 'react';
import { Paintbrush, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  { name: 'Vermelho', color: '#EF4444' },
  { name: 'Laranja', color: '#F97316' },
  { name: 'Amarelo', color: '#EAB308' },
  { name: 'Verde', color: '#22C55E' },
  { name: 'Azul', color: '#3B82F6' },
  { name: 'Roxo', color: '#A855F7' },
  { name: 'Rosa', color: '#EC4899' },
  { name: 'Cinza', color: '#6B7280' },
  { name: 'Ciano', color: '#06B6D4' },
  { name: 'Marrom', color: '#92400E' }
];

const ColorizeModal = ({ isOpen, onClose, product, columns, onApply }) => {
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0].color);
  const [colorMode, setColorMode] = useState('row'); // 'row' or 'column'
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [description, setDescription] = useState('');

  // Load existing color data when product changes
  useEffect(() => {
    if (product?.color_data) {
      setSelectedColor(product.color_data.color || DEFAULT_COLORS[0].color);
      setColorMode(product.color_data.column ? 'column' : 'row');
      setSelectedColumn(product.color_data.column || null);
      setDescription(product.color_data.description || '');
    } else {
      setSelectedColor(DEFAULT_COLORS[0].color);
      setColorMode('row');
      setSelectedColumn(null);
      setDescription('');
    }
  }, [product]);

  const handleApply = () => {
    if (!product) return;

    const colorData = {
      color: selectedColor,
      column: colorMode === 'column' ? selectedColumn : null,
      description: description || (colorMode === 'row' ? 'Linha colorida' : `Coluna ${selectedColumn} colorida`)
    };

    onApply(product.id, colorData);
    onClose();
  };

  const handleRemoveColor = () => {
    if (!product) return;
    onApply(product.id, null); // Pass null to remove color
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-blue-600" />
            Colorir Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Color Picker */}
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Escolha uma Cor</Label>
            <div className="grid grid-cols-5 gap-3">
              {DEFAULT_COLORS.map((colorOption) => (
                <button
                  key={colorOption.color}
                  onClick={() => setSelectedColor(colorOption.color)}
                  className={cn(
                    "w-full aspect-square rounded-lg border-2 transition-all hover:scale-110",
                    selectedColor === colorOption.color
                      ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2"
                      : "border-gray-300 hover:border-gray-400"
                  )}
                  style={{ backgroundColor: colorOption.color }}
                  title={colorOption.name}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs text-gray-600">Ou escolha personalizada:</Label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>

          {/* Color Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 block">Aplicar Cor Em</Label>
            
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="colorMode"
                  checked={colorMode === 'row'}
                  onChange={() => setColorMode('row')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="font-medium text-gray-900 text-sm">Linha Inteira</span>
                  <p className="text-xs text-gray-500">Aplica cor de fundo em todas as colunas</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="colorMode"
                  checked={colorMode === 'column'}
                  onChange={() => setColorMode('column')}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-sm">Coluna Específica</span>
                  <p className="text-xs text-gray-500 mb-2">Aplica cor apenas em uma coluna</p>
                  {colorMode === 'column' && (
                    <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns?.filter(col => col.visible !== false).map((col) => (
                          <SelectItem key={col.key} value={col.key}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg p-3">
            <Label className="text-xs text-gray-600 mb-2 block">Preview</Label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {colorMode === 'row' ? (
                <>
                  <div className="p-2 rounded border border-gray-200" style={{ backgroundColor: `${selectedColor}33` }}>
                    Coluna 1
                  </div>
                  <div className="p-2 rounded border border-gray-200" style={{ backgroundColor: `${selectedColor}33` }}>
                    Coluna 2
                  </div>
                  <div className="p-2 rounded border border-gray-200" style={{ backgroundColor: `${selectedColor}33` }}>
                    Coluna 3
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 rounded border border-gray-200 bg-white">Coluna 1</div>
                  <div className="p-2 rounded border border-gray-200" style={{ backgroundColor: `${selectedColor}33` }}>
                    {selectedColumn || 'Coluna'}
                  </div>
                  <div className="p-2 rounded border border-gray-200 bg-white">Coluna 3</div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {product?.color_data && (
            <Button onClick={handleRemoveColor} variant="outline" className="text-red-600 hover:bg-red-50">
              <X className="w-4 h-4 mr-2" /> Remover Cor
            </Button>
          )}
          <Button onClick={onClose} variant="outline">Cancelar</Button>
          <Button 
            onClick={handleApply} 
            disabled={colorMode === 'column' && !selectedColumn}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Paintbrush className="w-4 h-4 mr-2" /> Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColorizeModal;
