
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Loader2, Palette, Paintbrush, Eraser } from 'lucide-react';
import { useColorLegends } from '@/hooks/useColorLegends';
import ColorLegendManager from './ColorLegendManager';
import { usePaintingMode } from '@/contexts/PaintingModeContext';

const ColorLegendPanel = () => {
  const { legends, loading, deleteLegend, refetch } = useColorLegends();
  const { paintingMode, activeLegendId, setPaintingMode, clearPaintingMode } = usePaintingMode();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingLegend, setEditingLegend] = useState(null);

  const handleAdd = () => {
    setEditingLegend(null);
    setIsManagerOpen(true);
  };

  const handleEdit = (legend) => {
    setEditingLegend(legend);
    setIsManagerOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta legenda? Pode haver cores aplicadas usando ela.')) {
      await deleteLegend(id);
      if (activeLegendId === id) clearPaintingMode();
      refetch();
    }
  };

  const handleTogglePaint = (legend) => {
    if (paintingMode === 'paint' && activeLegendId === legend.id) {
      clearPaintingMode();
    } else {
      setPaintingMode(legend, 'paint');
    }
  };

  const handleToggleDelete = (legend) => {
    if (paintingMode === 'delete' && activeLegendId === legend.id) {
      clearPaintingMode();
    } else {
      setPaintingMode(legend, 'delete');
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Painel de Cores & Legendas
        </h3>
        <Button onClick={handleAdd} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Legenda
        </Button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : legends.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            Nenhuma legenda criada.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {legends.map(legend => {
              const isPaintActive = paintingMode === 'paint' && activeLegendId === legend.id;
              const isDeleteActive = paintingMode === 'delete' && activeLegendId === legend.id;
              const isActive = isPaintActive || isDeleteActive;

              return (
                <div key={legend.id} className={`flex items-center gap-3 p-2 pr-3 border rounded-lg shadow-sm transition-colors flex-1 min-w-[300px] ${isPaintActive ? 'bg-blue-50 border-blue-300' : isDeleteActive ? 'bg-red-50 border-red-300' : 'bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full border border-gray-200 shadow-inner shrink-0" style={{ backgroundColor: legend.color }} />
                    <div className="truncate">
                      <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        {legend.name}
                        {isPaintActive && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pintando</span>}
                        {isDeleteActive && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Apagando</span>}
                      </p>
                      {legend.description && <p className="text-xs text-gray-500 truncate">{legend.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant={isPaintActive ? "default" : "secondary"}
                      size="sm" 
                      className={`h-8 px-2 ${isPaintActive ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700'}`} 
                      onClick={() => handleTogglePaint(legend)}
                    >
                      <Paintbrush className="w-3.5 h-3.5 mr-1" />
                      {isPaintActive ? 'Cancelar' : 'Pintar'}
                    </Button>
                    <Button 
                      variant={isDeleteActive ? "destructive" : "secondary"}
                      size="sm" 
                      className={`h-8 px-2 ${isDeleteActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-600 hover:bg-red-100 border border-red-100'}`} 
                      onClick={() => handleToggleDelete(legend)}
                    >
                      <Eraser className="w-3.5 h-3.5 mr-1" />
                      {isDeleteActive ? 'Cancelar' : 'Apagar'}
                    </Button>
                    
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => handleEdit(legend)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(legend.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ColorLegendManager 
        isOpen={isManagerOpen} 
        onClose={() => { setIsManagerOpen(false); refetch(); }} 
        legendToEdit={editingLegend}
      />
    </div>
  );
};

export default ColorLegendPanel;
