
import React, { useState, useEffect } from 'react';
import { Palette, Plus, Trash2, Pencil, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_COLORS = [
  { name: 'Vermelho', color: '#EF4444', description: 'Urgente ou Crítico' },
  { name: 'Laranja', color: '#F97316', description: 'Atenção Necessária' },
  { name: 'Amarelo', color: '#EAB308', description: 'Aviso' },
  { name: 'Verde', color: '#22C55E', description: 'OK ou Completo' },
  { name: 'Azul', color: '#3B82F6', description: 'Informação' },
  { name: 'Roxo', color: '#A855F7', description: 'Especial' },
  { name: 'Rosa', color: '#EC4899', description: 'Destacado' },
  { name: 'Cinza', color: '#6B7280', description: 'Inativo ou Pausado' },
  { name: 'Ciano', color: '#06B6D4', description: 'Em Progresso' },
  { name: 'Marrom', color: '#92400E', description: 'Antigo ou Arquivado' }
];

const DEFAULT_TITLE = 'Legenda de Cores';

// Validation helper functions
const isValidColorEntry = (entry) => {
  return entry && 
         typeof entry === 'object' && 
         typeof entry.color === 'string' && 
         entry.color.trim() !== '' &&
         typeof entry.description === 'string';
};

const sanitizeLegendEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return DEFAULT_COLORS;
  }
  
  const validEntries = entries.filter(isValidColorEntry);
  return validEntries.length > 0 ? validEntries : DEFAULT_COLORS;
};

const ColorLegend = () => {
  const [legendEntries, setLegendEntries] = useState([]);
  const [legendTitle, setLegendTitle] = useState(DEFAULT_TITLE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [newEntry, setNewEntry] = useState({ color: '#3B82F6', description: '' });
  const [tempTitle, setTempTitle] = useState('');
  const { toast } = useToast();

  // Load legend and title from localStorage on mount
  useEffect(() => {
    // Load legend entries
    const saved = localStorage.getItem('colorLegend');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeLegendEntries(parsed);
        setLegendEntries(sanitized);
      } catch (error) {
        console.error('Failed to load color legend:', error);
        setLegendEntries(DEFAULT_COLORS);
      }
    } else {
      setLegendEntries(DEFAULT_COLORS);
    }

    // Load legend title
    const savedTitle = localStorage.getItem('colorLegendTitle');
    if (savedTitle) {
      setLegendTitle(savedTitle);
    }
  }, []);

  // Save legend to localStorage whenever it changes
  useEffect(() => {
    if (legendEntries.length > 0) {
      // Filter out any invalid entries before saving
      const validEntries = legendEntries.filter(isValidColorEntry);
      if (validEntries.length > 0) {
        localStorage.setItem('colorLegend', JSON.stringify(validEntries));
      }
    }
  }, [legendEntries]);

  const handleAddEntry = () => {
    if (!newEntry.description?.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    if (!newEntry.color || typeof newEntry.color !== 'string') {
      toast({ title: 'Erro', description: 'Cor inválida', variant: 'destructive' });
      return;
    }

    const entry = {
      id: Date.now().toString(),
      color: newEntry.color,
      description: newEntry.description.trim(),
      name: newEntry.description.trim().slice(0, 20)
    };

    setLegendEntries(prev => [...prev, entry]);
    setNewEntry({ color: '#3B82F6', description: '' });
    toast({ title: 'Cor adicionada à legenda!' });
  };

  const handleUpdateEntry = () => {
    if (!editingEntry || !editingEntry.description?.trim()) {
      toast({ title: 'Erro', description: 'Descrição é obrigatória', variant: 'destructive' });
      return;
    }

    if (!editingEntry.color || typeof editingEntry.color !== 'string') {
      toast({ title: 'Erro', description: 'Cor inválida', variant: 'destructive' });
      return;
    }

    setLegendEntries(prev => prev.map(e => 
      e?.id === editingEntry.id 
        ? { ...editingEntry, name: editingEntry.description.trim().slice(0, 20) }
        : e
    ).filter(isValidColorEntry));
    
    setEditingEntry(null);
    toast({ title: 'Cor atualizada!' });
  };

  const handleDeleteEntry = (id) => {
    setLegendEntries(prev => prev.filter(e => e?.id !== id && e?.name !== id));
    toast({ title: 'Cor removida da legenda' });
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Resetar a legenda para as cores padrão?')) {
      setLegendEntries(DEFAULT_COLORS);
      toast({ title: 'Legenda resetada para padrão' });
    }
  };

  const handleOpenTitleModal = () => {
    setTempTitle(legendTitle);
    setIsTitleModalOpen(true);
  };

  const handleSaveTitle = () => {
    const newTitle = tempTitle.trim() || DEFAULT_TITLE;
    setLegendTitle(newTitle);
    localStorage.setItem('colorLegendTitle', newTitle);
    setIsTitleModalOpen(false);
    toast({ title: 'Título atualizado com sucesso!' });
  };

  const handleResetTitle = () => {
    setLegendTitle(DEFAULT_TITLE);
    localStorage.setItem('colorLegendTitle', DEFAULT_TITLE);
    setIsTitleModalOpen(false);
    toast({ title: 'Título resetado para padrão' });
  };

  // Filter valid entries for rendering
  const validLegendEntries = legendEntries.filter(isValidColorEntry);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Legend Title Section */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-1">
          <Palette className="w-5 h-5 text-blue-600 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-800">{legendTitle}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isTitleModalOpen} onOpenChange={setIsTitleModalOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={handleOpenTitleModal}
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar Título
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Título da Legenda</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-sm text-gray-700 mb-2 block">Título da Legenda</Label>
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="Digite o título da legenda"
                  className="w-full"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Este título será exibido acima da legenda de cores e será salvo localmente.
                </p>
              </div>
              <DialogFooter className="flex gap-2">
                <Button 
                  onClick={handleResetTitle} 
                  variant="outline" 
                  size="sm"
                >
                  Resetar Padrão
                </Button>
                <Button 
                  onClick={() => setIsTitleModalOpen(false)} 
                  variant="outline" 
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveTitle} 
                  size="sm"
                >
                  Salvar Título
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar Legenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Legenda de Cores</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Add New Entry */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Nova Cor</h4>
                  <div className="grid grid-cols-[80px_1fr_auto] gap-3 items-end">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1">Cor</Label>
                      <input
                        type="color"
                        value={newEntry?.color || '#3B82F6'}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1">Descrição</Label>
                      <Input
                        value={newEntry?.description || ''}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ex: Pedido urgente"
                        className="h-10"
                      />
                    </div>
                    <Button onClick={handleAddEntry} size="sm" className="h-10">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>

                {/* Existing Entries */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Cores Existentes</h4>
                    <Button onClick={handleResetToDefaults} variant="outline" size="sm" className="h-8 text-xs">
                      Resetar Padrão
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {validLegendEntries.map((entry) => {
                      // Additional validation for each entry
                      if (!entry?.color || !entry?.description) {
                        return null;
                      }

                      const entryId = entry.id || entry.name;
                      const isEditing = editingEntry?.id === entryId;

                      return (
                        <div key={entryId} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                          {isEditing ? (
                            <>
                              <input
                                type="color"
                                value={editingEntry?.color || '#3B82F6'}
                                onChange={(e) => setEditingEntry(prev => ({ ...prev, color: e.target.value }))}
                                className="w-12 h-10 rounded border border-gray-300 cursor-pointer shrink-0"
                              />
                              <Input
                                value={editingEntry?.description || ''}
                                onChange={(e) => setEditingEntry(prev => ({ ...prev, description: e.target.value }))}
                                className="flex-1 h-10"
                              />
                              <Button onClick={handleUpdateEntry} size="sm" className="h-10 shrink-0">
                                Salvar
                              </Button>
                              <Button onClick={() => setEditingEntry(null)} variant="outline" size="sm" className="h-10 shrink-0">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div
                                className="w-12 h-10 rounded border-2 border-gray-300 shrink-0 shadow-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="flex-1 text-sm text-gray-700">{entry.description}</span>
                              <Button
                                onClick={() => setEditingEntry({ ...entry })}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                              >
                                <Pencil className="w-4 h-4 text-gray-500" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteEntry(entryId)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setIsModalOpen(false)} variant="outline">Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {validLegendEntries.slice(0, 10).map((entry) => {
          // Additional validation before rendering
          if (!entry?.color || !entry?.description) {
            return null;
          }

          const entryId = entry.id || entry.name;
          
          return (
            <div
              key={entryId}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:shadow-sm transition-shadow"
              title={entry.description}
            >
              <div
                className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-700 truncate max-w-[120px]">{entry.description}</span>
            </div>
          );
        })}
        {validLegendEntries.length > 10 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
          >
            +{validLegendEntries.length - 10} mais
          </button>
        )}
      </div>
    </div>
  );
};

export default ColorLegend;
