
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="col-name">Nome da Coluna</Label>
            <Input
              id="col-name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Ex: Fabricante, Cor, Validade..."
              className="text-gray-900"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="col-type">Tipo de Dado</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!columnName.trim()}>
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
