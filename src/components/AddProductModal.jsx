
import React, { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

const AddProductModal = ({ isOpen, onClose, onSave, category }) => {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Await the save operation to ensure product is created before closing
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save product:", error);
      // Keep modal open if error occurs so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose(open)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Novo Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.columns.map((col) => (
              <div key={col.key} className="space-y-2">
                <Label htmlFor={col.key} className="text-sm font-medium text-gray-300">
                  {col.label}
                </Label>
                <Input
                  id={col.key}
                  type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                  step={col.type === 'currency' ? '0.01' : 'any'}
                  value={formData[col.key] || ''}
                  onChange={(e) => handleChange(col.key, e.target.value)}
                  placeholder={`Digite ${col.label.toLowerCase()}...`}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:ring-blue-600 focus:border-blue-600"
                  disabled={isSubmitting}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-transparent border-gray-600 text-white hover:bg-gray-800 hover:text-white">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar Produto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal;
