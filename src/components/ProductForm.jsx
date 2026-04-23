import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseBRNumber } from '@/utils/numberParser.js';
import { cn } from '@/lib/utils';

const ProductForm = ({ isOpen, onClose, onSave, product, category }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
       setHasRemoteUpdate(false); 
    }
  }, [isOpen]);

  useEffect(() => {
     if (isOpen && product) {
        if (product.updated_at && formData._loaded_at && product.updated_at > formData._loaded_at) {
           setHasRemoteUpdate(true);
        }
     }
  }, [product, isOpen]);

  useEffect(() => {
    if (category && category.columns) {
      const initialData = {};
      category.columns.forEach(col => {
        initialData[col.key] = product ? (product[col.key] || '') : '';
      });
      if (product) {
         initialData.id = product.id;
         initialData.caixa_aberta = product.caixa_aberta || false;
         initialData.meia_caixa = product.meia_caixa || false;
         initialData._loaded_at = new Date().toISOString(); 
      } else {
         initialData.caixa_aberta = false;
         initialData.meia_caixa = false;
      }
      setFormData(initialData);
      setHasRemoteUpdate(false);
    }
    setErrors({});
  }, [product, isOpen, category]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const { _loaded_at, id, ...cleanData } = formData;
    
    // Parse numeric fields properly
    if (cleanData.estoque !== undefined) {
      cleanData.estoque = Number(parseBRNumber(cleanData.estoque));
    }
    if (cleanData.lote_minimo !== undefined) {
      cleanData.lote_minimo = Number(parseBRNumber(cleanData.lote_minimo));
    }

    console.log('ProductForm submitting:', { 
      estoque: cleanData.estoque, 
      lote_minimo: cleanData.lote_minimo,
      caixa_aberta: cleanData.caixa_aberta,
      meia_caixa: cleanData.meia_caixa
    });

    onSave(cleanData);
    onClose();
  };
  
  const handleRefresh = () => {
     if (!product) return;
     const refreshedData = { ...formData };
     category.columns.forEach(col => {
        refreshedData[col.key] = product[col.key] || '';
     });
     refreshedData.caixa_aberta = product.caixa_aberta || false;
     refreshedData.meia_caixa = product.meia_caixa || false;
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
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold">{product ? 'Editar Item' : 'Novo Item'}</h2>
              <p className="text-xs text-blue-100 opacity-90">{category.name}</p>
            </div>
            <button onClick={onClose} className="hover:bg-blue-700 p-1.5 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
            {hasRemoteUpdate && (
               <Alert variant="destructive" className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription className="text-xs flex flex-col gap-2">
                     <span>Este produto foi modificado em outro dispositivo enquanto você editava.</span>
                     <Button type="button" variant="outline" size="sm" className="w-full bg-white border-yellow-300 hover:bg-yellow-100 text-yellow-900" onClick={handleRefresh}>
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
                      type={col.type === 'number' || col.type === 'currency' ? 'text' : 'text'}
                      name={col.key}
                      value={formData[col.key] || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white text-gray-900"
                      placeholder={col.type === 'currency' ? '0.00' : ''}
                    />
                  )}
                  
                  {errors[col.key] && <p className="text-red-500 text-[10px] mt-0.5">{errors[col.key]}</p>}
                </div>
              ))}
            </div>

            {formData.caixa_aberta && (
              <div className="mt-5 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <label className="block text-sm font-semibold text-orange-800 mb-3">
                  Nível da Caixa (Aberta)
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, meia_caixa: false}))}
                    className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors", !formData.meia_caixa ? "bg-green-600 text-white shadow-md border-green-700" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50")}
                  >
                    Mais de meia caixa
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({...prev, meia_caixa: true}))}
                    className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-colors", formData.meia_caixa ? "bg-red-500 text-white shadow-md border-red-600" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50")}
                  >
                    Menos de meia caixa
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="bg-gray-50 px-5 py-4 flex items-center justify-end gap-3 border-t shrink-0">
            <Button type="button" onClick={onClose} variant="outline" size="sm" className="h-9 px-4 text-sm">Cancelar</Button>
            <Button type="submit" onClick={handleSubmit} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 text-sm">
              <Save className="w-4 h-4 mr-1.5" /> Salvar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductForm;