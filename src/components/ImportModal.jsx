
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, RotateCcw, ArrowRight, Ban, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useImport } from '@/hooks/useImport';
import { useToast } from '@/components/ui/use-toast.js';
import { motion, AnimatePresence } from 'framer-motion';

const ImportModal = ({ isOpen, onClose, onImport, category, categories, onCategoryChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const { fileData, columnMapping, handleFileUpload, mapColumns, importData, cancelImport, resetImport, loading, progress } = useImport();
  const { toast } = useToast();

  // Reset when modal opens/closes or category changes
  useEffect(() => {
    if (isOpen) {
        setValidationError(null);
    } else {
        resetImport();
        setSelectedFile(null);
    }
  }, [isOpen, category]);

  // Auto-map columns when file is loaded or category changes
  useEffect(() => {
    if (fileData?.headers && category) {
      const newMapping = { ...columnMapping };
      let hasChanges = false;

      category.columns.forEach(appCol => {
        if (!newMapping[appCol.key]) {
          const matchingHeader = fileData.headers.find(
            h => h.toLowerCase() === appCol.label.toLowerCase() || 
                 h.toLowerCase() === appCol.key.toLowerCase()
          );
          if (matchingHeader) {
            newMapping[appCol.key] = matchingHeader;
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        mapColumns(newMapping);
      }
    }
  }, [fileData, category]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      await handleFileUpload(file);
      setValidationError(null);
    }
  };

  const handleMappingChange = (appColumnKey, fileColumn) => {
    mapColumns({
      ...columnMapping,
      [appColumnKey]: fileColumn
    });
    setValidationError(null);
  };

  const validateMapping = () => {
    if (!category) return false;
    const missingColumns = category.columns.filter(col => col.required && !columnMapping[col.key]);
    if (missingColumns.length > 0) {
      const missingNames = missingColumns.map(c => c.label).join(', ');
      setValidationError(`Campos obrigatórios não mapeados: ${missingNames}`);
      return false;
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateMapping()) return;

    try {
      const result = await importData();
      
      // The importData hook returns objects with keys mapped from columnMapping.
      // We need to ensure these match our schema.
      onImport(result.validRows);
      
      handleClose();

    } catch (error) {
      if (error.message !== 'Importação cancelada pelo usuário') {
        console.error('Import error:', error);
        setValidationError('Erro na importação. Tente novamente.');
      }
    }
  };

  const handleClose = () => {
    if (loading) return; 
    onClose();
  };

  if (!isOpen || !category) return null;

  const allMapped = category.columns.every(col => !col.required || columnMapping[col.key]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              <div>
                <h2 className="text-lg font-bold leading-tight">Importar: {category.name}</h2>
              </div>
            </div>
            {!loading && (
              <button onClick={handleClose} className="hover:bg-blue-700 p-1.5 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
            {/* Category Selector (if enabled) */}
            {categories && categories.length > 1 && !loading && !fileData && (
                <div className="mb-6 bg-white p-4 rounded shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-blue-500"/>
                        Selecionar Categoria de Destino
                    </label>
                    <select 
                        value={category.id} 
                        onChange={(e) => {
                            const newCat = categories.find(c => c.id === e.target.value);
                            if(newCat) onCategoryChange(newCat);
                        }}
                        className="w-full border p-2 rounded text-sm bg-gray-50"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Loading / Progress State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-6">
                <div className="relative w-full max-w-md">
                   <div className="flex justify-between text-sm text-gray-600 mb-2 font-medium">
                     <span>Processando...</span>
                     <span>{progress.percentage}%</span>
                   </div>
                   <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                     <motion.div 
                       className="h-full bg-blue-600"
                       initial={{ width: 0 }}
                       animate={{ width: `${progress.percentage}%` }}
                       transition={{ duration: 0.2 }}
                     />
                   </div>
                   <div className="grid grid-cols-1 gap-4 mt-4 text-center">
                      <div className="bg-white p-3 rounded shadow-sm border border-green-100">
                        <p className="text-xs text-green-600 uppercase">Processados</p>
                        <p className="text-xl font-bold text-green-600">{progress.success} / {progress.total}</p>
                      </div>
                   </div>
                </div>
                <Button 
                  onClick={cancelImport}
                  variant="destructive"
                  className="mt-4 gap-2"
                >
                  <Ban className="w-4 h-4" /> Cancelar Importação
                </Button>
              </div>
            ) : (
              <>
                {/* File Upload State */}
                {!fileData && (
                  <div className="flex flex-col items-center justify-center min-h-[250px]">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-500 transition-all bg-white shadow-sm w-full max-w-xl">
                      <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">Selecione seu arquivo</h3>
                      <p className="text-gray-500 text-sm mb-6">CSV ou Excel (XLSX, XLS)</p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 h-auto rounded-full shadow hover:shadow-md transition-all text-sm"
                      >
                        Escolher Arquivo
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mapping State */}
                {fileData && (
                  <div className="space-y-6">
                    {/* File Info Bar */}
                    <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-green-100 p-1.5 rounded">
                          <FileSpreadsheet className="w-4 h-4 text-green-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{selectedFile?.name}</p>
                          <p className="text-xs text-gray-500">{fileData.rows.length} linhas detectadas</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { resetImport(); setSelectedFile(null); }}
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs h-8 px-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                        Reiniciar
                      </Button>
                    </div>

                    {validationError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-red-700 font-medium text-sm">{validationError}</p>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Mapping Interface */}
                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                          <Check className="w-4 h-4 text-blue-600" />
                          Mapeamento ({category.columns.length} colunas)
                        </h3>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-h-[400px] overflow-y-auto">
                          {category.columns.map((appCol) => {
                            const isMapped = !!columnMapping[appCol.key];
                            return (
                              <div 
                                key={appCol.key} 
                                className={`px-3 py-2 border-b last:border-0 transition-colors ${isMapped ? 'bg-blue-50/30' : 'bg-white'}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="w-1/3">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                      {appCol.label}
                                      {appCol.required && <span className="text-red-500 text-[10px] bg-red-100 px-1.5 rounded-full">Req</span>}
                                    </label>
                                    <p className="text-[10px] text-gray-500 truncate capitalize">{appCol.type}</p>
                                  </div>
                                  
                                  <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />

                                  <div className="flex-1 relative">
                                    <select
                                      value={columnMapping[appCol.key] || ''}
                                      onChange={(e) => handleMappingChange(appCol.key, e.target.value)}
                                      className={`w-full pl-2 pr-6 py-1.5 text-xs border rounded appearance-none focus:ring-1 focus:ring-blue-500 outline-none transition-all
                                        ${isMapped ? 'border-blue-500 bg-white text-blue-700 font-medium' : 'border-gray-300 bg-gray-50 text-gray-600'}
                                      `}
                                    >
                                      <option value="">Selecione...</option>
                                      {fileData.headers.map((header, idx) => (
                                        <option key={idx} value={header}>{header}</option>
                                      ))}
                                    </select>
                                    {isMapped && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Check className="w-3 h-3 text-blue-600" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-gray-800">Prévia de Dados</h3>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100">
                                <tr>
                                  {fileData.headers.slice(0, 3).map((header, idx) => (
                                    <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-700 border-b whitespace-nowrap">
                                      {header}
                                    </th>
                                  ))}
                                  {fileData.headers.length > 3 && (
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">...</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {fileData.rows.slice(0, 5).map((row, rowIdx) => (
                                  <tr key={rowIdx} className="border-b hover:bg-gray-50 last:border-0">
                                    {fileData.headers.slice(0, 3).map((header, colIdx) => (
                                      <td key={colIdx} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[120px] truncate">
                                        {row[header]}
                                      </td>
                                    ))}
                                    {fileData.headers.length > 3 && (
                                      <td className="px-3 py-2 text-gray-400">...</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-2 bg-gray-50 border-t text-[10px] text-center text-gray-500">
                            Exibindo primeiras 5 linhas
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {fileData && !loading && (
            <div className="bg-white px-5 py-4 flex items-center justify-between gap-4 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0">
              <div className="text-xs text-gray-500">
                {category.columns.filter(c => columnMapping[c.key]).length} / {category.columns.length} mapeados
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!allMapped}
                  size="sm"
                  className={`h-9 px-6 text-sm transition-all ${
                    allMapped 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Importar
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImportModal;
