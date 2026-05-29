
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Plus, Loader2 } from 'lucide-react';
import { useColorLegends } from '@/hooks/useColorLegends';
import { useToast } from '@/components/ui/use-toast';

const ColorLegendManager = ({ isOpen, onClose, legendToEdit }) => {
  const { createLegend, updateLegend, refetch } = useColorLegends();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (legendToEdit) {
        setFormData({ name: legendToEdit.name, color: legendToEdit.color, description: legendToEdit.description || '' });
      } else {
        setFormData({ name: '', color: '#3b82f6', description: '' });
      }
    }
  }, [isOpen, legendToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.name.trim()) {
      toast({ title: "Erro de Validação", description: "O nome da legenda não pode estar vazio.", variant: "destructive" });
      return;
    }
    
    if (!formData.color) {
      toast({ title: "Erro de Validação", description: "Você deve escolher uma cor para a legenda.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (legendToEdit) {
        await updateLegend(legendToEdit.id, formData.name, formData.color, formData.description);
        await refetch();
        setIsSubmitting(false);
        onClose();
      } else {
        const result = await createLegend(formData.name, formData.color, formData.description);
        
        if (result && result.success) {
          toast({ title: "Sucesso", description: "A legenda de cor foi criada com sucesso!" });
          setFormData({ name: '', color: '#3b82f6', description: '' });
          await refetch();
          onClose();
        } else {
          toast({ title: "Erro", description: result?.error || "Ocorreu um erro desconhecido ao criar a legenda.", variant: "destructive" });
        }
      }
    } catch (err) {
      toast({ title: "Erro Crítico", description: err.message || "Erro inesperado.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{legendToEdit ? 'Editar Legenda' : 'Nova Legenda'}</DialogTitle>
          <DialogDescription>Configure o nome e a cor para esta legenda.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3 space-y-2">
              <Label>Nome</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                placeholder="Ex: Urgente, Em falta..." 
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={formData.color} 
                  onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 p-1 border rounded cursor-pointer w-full bg-white"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Textarea 
              value={formData.description} 
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes sobre quando usar esta cor..."
              className="resize-none h-20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (legendToEdit ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />)}
              {legendToEdit ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ColorLegendManager;
