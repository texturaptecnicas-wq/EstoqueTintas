
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Palette, Plus, Trash2, Pencil, X, Check, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { detectUsedColors } from '@/hooks/useProducts';

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

// Inline editable legend item component
const EditableLegendItem = ({ entry, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.description);
  const inputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditValue(entry.description);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast({ 
        title: 'Descrição vazia', 
        description: 'A descrição não pode estar vazia', 
        variant: 'destructive' 
      });
      setEditValue(entry.description);
      setIsEditing(false);
      return;
    }

    if (trimmed !== entry.description) {
      onUpdate(entry.id || entry.name, { ...entry, description: trimmed, name: trimmed.slice(0, 20) });
      toast({ title: 'Descrição atualizada!' });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(entry.description);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Auto-save on blur
    handleSave();
  };

  const entryId = entry.id || entry.name;

  // Check if this is an auto-detected color with empty description
  const isAutoDetected = entry.autoDetected && !entry.description;

  if (isEditing) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-full border-2 border-blue-500 bg-blue-50 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
          style={{ backgroundColor: entry.color }}
        />
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="h-6 text-xs px-2 py-0 border-0 bg-white shadow-sm max-w-[120px]"
          placeholder="Digite a descrição"
        />
        <button
          onClick={handleSave}
          className="shrink-0 p-1 hover:bg-green-100 rounded-full transition-colors"
          title="Salvar (Enter)"
        >
          <Check className="w-3 h-3 text-green-600" />
        </button>
        <button
          onClick={handleCancel}
          className="shrink-0 p-1 hover:bg-red-100 rounded-full transition-colors"
          title="Cancelar (Esc)"
        >
          <X className="w-3 h-3 text-red-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      key={entryId}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer group",
        isAutoDetected 
          ? "border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400" 
          : "border-gray-200 bg-gray-50 hover:shadow-sm hover:border-blue-300"
      )}
      title={isAutoDetected ? "Clique para adicionar descrição" : `Clique para editar: ${entry.description}`}
      onClick={handleStartEdit}
    >
      <div
        className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
        style={{ backgroundColor: entry.color }}
      />
      <span className={cn(
        "text-xs truncate max-w-[120px] transition-colors",
        isAutoDetected 
          ? "text-blue-600 italic font-medium" 
          : "text-gray-700 group-hover:text-blue-700"
      )}>
        {entry.description || '[clique para editar]'}
      </span>
      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
};

const ColorLegend = ({ products = [] }) => {
  const [legendEntries, setLegendEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [newEntry, setNewEntry] = useState({ color: '#3B82F6', description: '' });
  const [autoDetectedCount, setAutoDetectedCount] = useState(0);
  const { toast } = useToast();

  // Auto-detect colors used in products and sync with legend
  const syncUsedColors = useCallback(() => {
    const usedColors = detectUsedColors(products);
    
    if (usedColors.length === 0) return;

    const saved = localStorage.getItem('colorLegend');
    let currentLegend = [];
    
    if (saved) {
      try {
        currentLegend = JSON.parse(saved);
        if (!Array.isArray(currentLegend)) currentLegend = [];
      } catch (e) {
        currentLegend = [];
      }
    }

    let addedCount = 0;
    const updatedLegend = [...currentLegend];

    usedColors.forEach(colorHex => {
      const exists = updatedLegend.some(entry => 
        entry && entry.color && entry.color.toUpperCase() === colorHex
      );

      if (!exists) {
        updatedLegend.push({
          id: `auto-${Date.now()}-${Math.random()}`,
          color: colorHex,
          description: '',
          name: 'Auto-detectada',
          autoDetected: true
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      localStorage.setItem('colorLegend', JSON.stringify(updatedLegend));
      setLegendEntries(updatedLegend);
      setAutoDetectedCount(addedCount);
      console.log(`[ColorLegend] Auto-detected and added ${addedCount} new colors`);
    }
  }, [products]);

  // Load legend from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Auto-detect colors when products change
  useEffect(() => {
    if (products && products.length > 0) {
      syncUsedColors();
    }
  }, [products, syncUsedColors]);

  // Refresh detection when modal opens
  useEffect(() => {
    if (isModalOpen && products && products.length > 0) {
      syncUsedColors();
    }
  }, [isModalOpen, products, syncUsedColors]);

  // Save legend to localStorage whenever it changes
  useEffect(() => {
    if (legendEntries.length > 0) {
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
        ? { ...editingEntry, name: editingEntry.description.trim().slice(0, 20), autoDetected: false }
        : e
    ).filter(isValidColorEntry));
    
    setEditingEntry(null);
    toast({ title: 'Cor atualizada!' });
  };

  const handleInlineUpdate = (entryId, updatedEntry) => {
    setLegendEntries(prev => prev.map(e => {
      const currentId = e.id || e.name;
      return currentId === entryId ? { ...updatedEntry, autoDetected: false } : e;
    }));
  };

  const handleDeleteEntry = (id) => {
    setLegendEntries(prev => prev.filter(e => e?.id !== id && e?.name !== id));
    toast({ title: 'Cor removida da legenda' });
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Resetar a legenda para as cores padrão? Cores auto-detectadas serão perdidas.')) {
      setLegendEntries(DEFAULT_COLORS);
      setAutoDetectedCount(0);
      toast({ title: 'Legenda resetada para padrão' });
    }
  };

  const handleRescanColors = () => {
    syncUsedColors();
    toast({ 
      title: 'Cores detectadas!', 
      description: autoDetectedCount > 0 
        ? `${autoDetectedCount} novas cores adicionadas` 
        : 'Nenhuma nova cor encontrada'
    });
  };

  // Filter valid entries for rendering
  const validLegendEntries = legendEntries.filter(isValidColorEntry);
  const autoDetectedEntries = validLegendEntries.filter(e => e.autoDetected);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">Legenda de Cores</h3>
          <span className="text-xs text-gray-500 italic">(Clique para editar)</span>
          {autoDetectedEntries.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {autoDetectedEntries.length} auto-detectada{autoDetectedEntries.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRescanColors} 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            title="Detectar cores usadas nos produtos"
          >
            <Scan className="w-3.5 h-3.5 mr-1.5" /> Detectar Cores
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Gerenciar Legenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Legenda de Cores</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Auto-detected colors notice */}
                {autoDetectedEntries.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Scan className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">
                          {autoDetectedEntries.length} cor{autoDetectedEntries.length > 1 ? 'es' : ''} detectada{autoDetectedEntries.length > 1 ? 's' : ''} automaticamente
                        </p>
                        <p className="text-xs text-blue-700">
                          Essas cores estão sendo usadas nos produtos mas não têm descrição. Clique para adicionar descrições.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                      if (!entry?.color || typeof entry.description !== 'string') {
                        return null;
                      }

                      const entryId = entry.id || entry.name;
                      const isEditing = editingEntry?.id === entryId;
                      const isAutoDetected = entry.autoDetected && !entry.description;

                      return (
                        <div 
                          key={entryId} 
                          className={cn(
                            "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                            isAutoDetected 
                              ? "border-blue-200 bg-blue-50 hover:bg-blue-100" 
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          )}
                        >
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
                                placeholder="Digite a descrição"
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
                              <div className="flex-1">
                                <span className={cn(
                                  "text-sm",
                                  isAutoDetected ? "text-blue-700 italic" : "text-gray-700"
                                )}>
                                  {entry.description || '[sem descrição - clique para editar]'}
                                </span>
                                {isAutoDetected && (
                                  <p className="text-xs text-blue-600 mt-0.5">Auto-detectada dos produtos</p>
                                )}
                              </div>
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
          if (!entry?.color || typeof entry.description !== 'string') {
            return null;
          }

          return (
            <EditableLegendItem 
              key={entry.id || entry.name}
              entry={entry}
              onUpdate={handleInlineUpdate}
            />
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
