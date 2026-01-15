
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast.js';

const COLUMN_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda' },
  { value: 'date', label: 'Data' }
];

const CategoryManager = ({ isOpen, onClose, categories, onAdd, onUpdate, onDelete }) => {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    columns: []
  });
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      columns: [
        { key: 'name', label: 'Nome do Item', type: 'text', required: true }
      ]
    });
    setEditingId(null);
  };

  const handleEdit = (category) => {
    setFormData(category);
    setEditingId(category.id);
    setView('form');
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza? Isso pode afetar produtos existentes nesta categoria.')) {
      onDelete(id);
    }
  };

  const handleAddColumn = () => {
    setFormData(prev => ({
      ...prev,
      columns: [
        ...prev.columns,
        { 
          key: `col_${Date.now()}`, 
          label: '', 
          type: 'text', 
          required: false 
        }
      ]
    }));
  };

  const handleRemoveColumn = (index) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const updateColumn = (index, field, value) => {
    setFormData(prev => {
      const newCols = [...prev.columns];
      newCols[index] = { ...newCols[index], [field]: value };
      
      // Auto-generate key from label if key is auto-generated
      if (field === 'label' && newCols[index].key.startsWith('col_')) {
        // Simple slugify
        const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (slug) newCols[index].key = slug;
      }
      
      return { ...prev, columns: newCols };
    });
  };

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome da categoria é obrigatório', variant: 'destructive' });
      return;
    }
    if (formData.columns.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos uma coluna', variant: 'destructive' });
      return;
    }
    
    // Check duplicates
    const keys = formData.columns.map(c => c.key);
    if (new Set(keys).size !== keys.length) {
      toast({ title: 'Erro', description: 'Existem colunas com chaves duplicadas', variant: 'destructive' });
      return;
    }

    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd(formData);
    }
    setView('list');
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold">Gerenciar Categorias</h2>
            <button onClick={onClose} className="hover:bg-slate-700 p-1.5 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {view === 'list' ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-500">Categorias ativas no sistema.</p>
                    <Button onClick={() => { resetForm(); setView('form'); }} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="w-4 h-4 mr-2" /> Nova Categoria
                    </Button>
                 </div>
                 
                 <div className="space-y-3">
                   {categories.map(cat => (
                     <motion.div 
                        key={cat.id} 
                        layout
                        className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center group hover:border-blue-300 transition-colors"
                     >
                        <div>
                          <h3 className="font-bold text-gray-800">{cat.name}</h3>
                          <p className="text-xs text-gray-500">{cat.description || 'Sem descrição'}</p>
                          <div className="mt-2 flex gap-2">
                             <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                               {cat.columns.length} colunas
                             </span>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                     </motion.div>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700">Informações Básicas</label>
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Nome da Categoria (ex: Ferramentas)"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                  <input
                    className="w-full border p-2 rounded text-sm"
                    placeholder="Descrição curta"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">Estrutura de Dados (Colunas)</label>
                    <Button onClick={handleAddColumn} variant="outline" size="sm" className="text-xs">
                       <Plus className="w-3 h-3 mr-1" /> Add Coluna
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {formData.columns.map((col, idx) => (
                      <div key={idx} className="flex gap-2 items-start bg-gray-50 p-2 rounded border">
                        <div className="mt-2 text-gray-400 cursor-move">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="grid grid-cols-12 gap-2 flex-1">
                          <div className="col-span-4">
                            <input
                              className="w-full text-xs border p-1.5 rounded"
                              placeholder="Nome (Label)"
                              value={col.label}
                              onChange={e => updateColumn(idx, 'label', e.target.value)}
                            />
                            <div className="text-[9px] text-gray-400 mt-0.5 truncate px-1">Key: {col.key}</div>
                          </div>
                          <div className="col-span-3">
                             <select 
                               className="w-full text-xs border p-1.5 rounded"
                               value={col.type}
                               onChange={e => updateColumn(idx, 'type', e.target.value)}
                             >
                               {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                             </select>
                          </div>
                          <div className="col-span-4 flex items-center pt-1">
                             <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={col.required} 
                                  onChange={e => updateColumn(idx, 'required', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Obrigatório
                             </label>
                          </div>
                          <div className="col-span-1 flex justify-end">
                             <button onClick={() => handleRemoveColumn(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                               <X className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.columns.length === 0 && (
                      <div className="text-center p-4 border border-dashed rounded text-sm text-gray-400">
                        Nenhuma coluna definida.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {view === 'form' && (
            <div className="bg-gray-50 border-t p-4 flex justify-end gap-2 shrink-0">
               <Button onClick={() => setView('list')} variant="ghost" size="sm">Cancelar</Button>
               <Button onClick={handleSave} size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" /> Salvar Categoria
               </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CategoryManager;
