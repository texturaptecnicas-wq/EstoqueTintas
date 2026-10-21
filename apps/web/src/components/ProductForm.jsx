import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isBefore, startOfToday } from 'date-fns';

const ProductForm = ({ isOpen, onClose, onSave, product, category }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);

  const isInsumos = category?.name?.toLowerCase().includes('insumo');

  useEffect(() => {
    if (product && isOpen) {
       setHasRemoteUpdate(false); 
    }
  }, [isOpen, product]);

  useEffect(() => {
     if (isOpen && product) {
        if (product.updated_at && formData._loaded_at && product.updated_at > formData._loaded_at) {
           setHasRemoteUpdate(true);
        }
     }
  }, [product, isOpen, formData._loaded_at]);

  useEffect(() => {
    if (category && category.columns) {
      const initialData = {};
      category.columns.forEach(col => {
        initialData[col.key] = product ? (product[col.key] || '') : '';
      });
      
      if (isInsumos) {
         initialData.last_purchase_date = product?.last_purchase_date ? new Date(product.last_purchase_date).toISOString().split('T')[0] : '';
         initialData.alert_value = product?.purchase_alert_config?.value || '';
         initialData.alert_unit = product?.purchase_alert_config?.unit || 'dias';
      }
      
      if (product) {
         initialData.id = product.id;
         initialData._loaded_at = new Date().toISOString(); 
      }
      setFormData(initialData);
      setHasRemoteUpdate(false);
    }
    setErrors({});
  }, [product, isOpen, category, isInsumos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!category) return false;

    category.columns.forEach(col => {
      if (col.required && (!formData[col.key] || formData[col.key].toString().trim() === '')) {
        newErrors[col.key] = `${col.label} é obrigatório`;
      }
    });
    
    if (isInsumos) {
       if (formData.last_purchase_date) {
           const d = new Date(formData.last_purchase_date);
           if (!isBefore(d, startOfToday()) && d.getTime() > startOfToday().getTime()) {
               newErrors.last_purchase_date = 'Data não pode estar no futuro';
           }
       }
       if (formData.alert_value && (isNaN(formData.alert_value) || parseInt(formData.alert_value, 10) <= 0)) {
           newErrors.alert_value = 'O prazo deve ser maior que 0';
       }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    // Clean internal fields
    const { _loaded_at, id, alert_value, alert_unit, last_purchase_date, ...cleanData } = formData;
    
    if (isInsumos) {
       if (last_purchase_date) cleanData.last_purchase_date = new Date(last_purchase_date).toISOString();
       if (alert_value) cleanData.purchase_alert_config = { value: parseInt(alert_value, 10), unit: alert_unit };
    }
    
    onSave(cleanData);
    onClose();
  };
  
  const handleRefresh = () => {
     if (!product) return;
     const refreshedData = { ...formData };
     category.columns.forEach(col => {
        refreshedData[col.key] = product[col.key] || '';
     });
     if (isInsumos) {
        refreshedData.last_purchase_date = product?.last_purchase_date ? new Date(product.last_purchase_date).toISOString().split('T')[0] : '';
        refreshedData.alert_value = product?.purchase_alert_config?.value || '';
        refreshedData.alert_unit = product?.purchase_alert_config?.unit || 'dias';
     }
     refreshedData._loaded_at = new Date().toISOString();
     setFormData(refreshedData);
     setHasRemoteUpdate(false);
  };

  if (!isOpen || !category) return null;

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
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold">{product ? 'Editar Item' : 'Novo Item'}</h2>
              <p className="text-xs text-blue-100 opacity-90">{category.name}</p>
            </div>
            <button onClick={onClose} className="hover:bg-blue-700 p-1.5 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
            {hasRemoteUpdate && (
               <Alert variant="destructive" className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription className="text-xs flex flex-col gap-2">
                     <span>Este produto foi modificado em outro dispositivo enquanto você editava.</span>
                     <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-white border-yellow-300 hover:bg-yellow-100 text-yellow-900"
                        onClick={handleRefresh}
                     >
                        Atualizar com dados mais recentes
                     </Button>
                  </AlertDescription>
               </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
              {category.columns.map((col) => (
                <div key={col.key} className={['text', 'supplier'].includes(col.type) ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {col.label} {col.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {col.type === 'date' ? (
                     <input
                      type="date" 
                      name={col.key}
                      value={formData[col.key] || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                    />
                  ) : (
                    <input
                      type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                      name={col.key}
                      value={formData[col.key] || ''}
                      onChange={handleChange}
                      step={col.type === 'currency' ? "0.01" : "1"}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                      placeholder={col.type === 'currency' ? '0.00' : ''}
                    />
                  )}
                  
                  {errors[col.key] && <p className="text-red-500 text-[10px] mt-0.5">{errors[col.key]}</p>}
                </div>
              ))}
              
              {isInsumos && (
                <>
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4 text-orange-500" /> Configuração de Recompra
                    </h3>
                  </div>
                  
                  <div>
                     <label className="block text-xs font-semibold text-gray-700 mb-1">Data da Última Compra</label>
                     <input
                        type="date" 
                        name="last_purchase_date"
                        value={formData.last_purchase_date || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                     />
                     {errors.last_purchase_date && <p className="text-red-500 text-[10px] mt-0.5">{errors.last_purchase_date}</p>}
                  </div>
                  
                  <div>
                     <label className="block text-xs font-semibold text-gray-700 mb-1">Prazo para Recompra (Opcional)</label>
                     <div className="flex gap-2">
                        <input
                           type="number"
                           name="alert_value"
                           min="1"
                           value={formData.alert_value || ''}
                           onChange={handleChange}
                           placeholder="Qtd"
                           className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                        />
                        <div className="w-1/2">
                          <Select 
                             value={formData.alert_unit || 'dias'} 
                             onValueChange={(val) => setFormData(prev => ({ ...prev, alert_unit: val }))}
                          >
                             <SelectTrigger className="h-[38px] text-sm bg-white border-gray-300 focus:ring-blue-500">
                               <SelectValue placeholder="Unidade" />
                             </SelectTrigger>
                             <SelectContent className="z-[60]">
                               <SelectItem value="dias">Dias</SelectItem>
                               <SelectItem value="semanas">Semanas</SelectItem>
                               <SelectItem value="meses">Meses</SelectItem>
                             </SelectContent>
                          </Select>
                        </div>
                     </div>
                     {errors.alert_value && <p className="text-red-500 text-[10px] mt-0.5">{errors.alert_value}</p>}
                  </div>
                </>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-4 flex items-center justify-end gap-3 border-t shrink-0">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-9 px-4 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 text-sm"
            >
              <Save className="w-4 h-4 mr-1.5" />
              Salvar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductForm;