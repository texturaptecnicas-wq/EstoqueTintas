
import React, { useState, useEffect } from 'react';
import { Settings, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const ColumnEditor = ({ isOpen, onClose, column, onSave }) => {
  const [formData, setFormData] = useState({
    label: '',
    type: 'text',
    align: 'center',
    width: '',
    visible: true
  });

  useEffect(() => {
    if (column) {
      setFormData({
        label: column.label || '',
        type: column.type || 'text',
        align: column.align || 'center',
        width: column.width || '',
        visible: column.visible !== false // default true
      });
    }
  }, [column]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.label.trim()) return;
    
    onSave({
      ...column,
      ...formData
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Editar Coluna
          </DialogTitle>
          <DialogDescription>
            Personalize a aparência e comportamento desta coluna.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="col-name" className="text-right">
              Nome
            </Label>
            <Input
              id="col-name"
              value={formData.label}
              onChange={(e) => handleChange('label', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="col-type" className="text-right">
              Tipo
            </Label>
            <div className="col-span-3">
              <Select 
                value={formData.type} 
                onValueChange={(val) => handleChange('type', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="currency">Moeda (R$)</SelectItem>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="col-align" className="text-right">
              Alinhamento
            </Label>
            <div className="col-span-3">
              <Select 
                value={formData.align} 
                onValueChange={(val) => handleChange('align', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alinhamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centralizado</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="col-width" className="text-right">
              Largura
            </Label>
            <Input
              id="col-width"
              placeholder="ex: 150px ou auto"
              value={formData.width}
              onChange={(e) => handleChange('width', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="col-visible" className="text-right">
              Visível
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Switch
                id="col-visible"
                checked={formData.visible}
                onCheckedChange={(checked) => handleChange('visible', checked)}
              />
              <span className="text-sm text-gray-500">
                {formData.visible ? 'Mostrar na tabela' : 'Ocultar da tabela'}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnEditor;
