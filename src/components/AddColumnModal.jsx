
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';

const COLUMN_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'date', label: 'Data' },
];

const AddColumnModal = ({ isOpen, onClose, onSave }) => {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState('text');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!columnName.trim()) return;

    // Create a key from the name (simple slugify)
    const key = columnName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_');

    onSave({
      label: columnName,
      key: key,
      type: columnType,
    });

    setColumnName('');
    setColumnType('text');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="col-name" className="text-gray-300">Nome da Coluna</Label>
            <Input
              id="col-name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Ex: Fabricante, Cor, Validade..."
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-blue-600 focus:border-blue-600"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="col-type" className="text-gray-300">Tipo de Dado</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:ring-blue-600">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {COLUMN_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="focus:bg-gray-700 focus:text-white">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" disabled={!columnName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Coluna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnModal;
