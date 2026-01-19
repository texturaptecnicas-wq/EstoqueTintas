

import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, RotateCcw, ArrowRight, Ban, Layout, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useImport } from '@/hooks/useImport';
import { useToast } from '@/components/ui/use-toast.js';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const LogViewer = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isExpanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  if (logs.length === 0) return null;

  return (
    <div className="mt-4 border border-gray-700 rounded-md bg-black/50 overflow-hidden text-left flex flex-col max-h-[200px]">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 text-xs text-gray-400 hover:text-white transition-colors shrink-0"
      >
        <span className="flex items-center gap-2">
          <Terminal className="w-3 h-3" />
          Logs de Importação ({logs.length})
        </span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {isExpanded && (
        <div className="p-3 overflow-y-auto font-mono text-[10px] space-y-1 flex-1">
           {logs.map((log) => (
             <div key={log.id} className="flex gap-2">
               <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
               <span className={cn(
                 log.type === 'error' ? 'text-red-400 font-bold' : 
                 log.type === 'warning' ? 'text-yellow-400' : 'text-green-400'
               )}>
                 {log.message}
               </span>
               {log.details && (
                 <span className="text-gray-600 truncate max-w-[300px] block">
                   {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                 </span>
               )}
             </div>
           ))}
           <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

const ImportModal = ({ isOpen, onClose, onImport, category, categories, onCategoryChange }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [importStatus, setImportStatus] = useState('idle');
  const fileInputRef = useRef(null);
  const { 
    fileData, 
    columnMapping, 
    handleFileUpload, 
    mapColumns, 
    importData, 
    cancelImport, 
    resetImport, 
    loading, 
    progress,
    logs
  } = useImport();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setValidationError(null);
    } else {
        // Only reset if completely closed/finished, handled by handleClose mainly
    }
  }, [isOpen]);

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
    if (!category) return;

    try {
      const result = await importData(category.id);
      onImport(result); 
    } catch (error) {
      // Error is already logged in useImport hook
    }
  };

  const handleClose = () => {
    if (importStatus === 'uploading' || importStatus === 'validating') return; 
    resetImport();
    setSelectedFile(null);
    setImportStatus('idle');
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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col text-white"
        >
          {/* Header */}
          <div className="bg-gray-800 text-white px-5 py-3 flex items-center justify-between shrink-0 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold leading-tight">Importar: {category.name}</h2>
              </div>
            </div>
            {importStatus !== 'uploading' && importStatus !== 'validating' && (
              <button onClick={handleClose} className="hover:bg-gray-700 p-1.5 rounded transition-colors text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-900/50">
            {/* Status Steps */}
            {importStatus !== 'idle' && (
               <div className="flex justify-between mb-6 px-8 border-b border-gray-800 pb-4">
                  {['Parsing', 'Validating', 'Uploading', 'Complete'].map((step, idx) => {
                     const stepMap = { 'parsing': 0, 'validating': 1, 'uploading': 2, 'complete': 3, 'error': -1 };
                     const currentIdx = stepMap[importStatus] === -1 ? 0 : stepMap[importStatus];
                     const stepLower = step.toLowerCase();
                     const isActive = currentIdx >= idx;
                     const isCurrent = currentIdx === idx && importStatus !== 'complete';
                     
                     return (
                       <div key={step} className={cn("flex flex-col items-center gap-1 text-xs", isActive ? "text-blue-400 font-bold" : "text-gray-600")}>
                           <div className={cn("w-3 h-3 rounded-full border-2 transition-all", 
                             isActive ? "bg-blue-400 border-blue-400" : "bg-transparent border-gray-600", 
                             isCurrent && "animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                           )} />
                           {step}
                       </div>
                     );
                  })}
               </div>
            )}

            {/* Category Selector */}
            {categories && categories.length > 1 && !fileData && (
                <div className="mb-6 bg-gray-800 p-4 rounded shadow-sm border border-gray-700">
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <Layout className="w-4 h-4 text-blue-400"/>
                        Selecionar Categoria de Destino
                    </label>
                    <select 
                        value={category.id} 
                        onChange={(e) => {
                            const newCat = categories.find(c => c.id === e.target.value);
                            if(newCat) onCategoryChange(newCat);
                        }}
                        className="w-full border border-gray-600 p-2 rounded text-sm bg-gray-700 text-white focus:border-blue-500 outline-none"
                    >
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Loading / Progress State */}
            {loading || importStatus === 'complete' || importStatus === 'error' || importStatus === 'uploading' || importStatus === 'validating' ? (
              <div className="flex flex-col h-full min-h-[300px] gap-4">
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                   {importStatus === 'complete' ? (
                       <div className="text-center">
                           <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                               <Check className="w-8 h-8" />
                           </div>
                           <h3 className="text-xl font-bold text-green-400 mb-2">Importação Concluída</h3>
                           <p className="text-gray-400 mb-6">{progress.success} produtos importados com sucesso.</p>
                           <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700 w-full max-w-xs">
                               Fechar Janela
                           </Button>
                       </div>
                   ) : importStatus === 'error' ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-red-400 mb-2">Erro na Importação</h3>
                            <p className="text-gray-400 mb-6">Verifique os logs abaixo para detalhes.</p>
                            <Button onClick={() => setImportStatus('idle')} variant="outline" className="border-gray-600 hover:bg-gray-800">
                                <RotateCcw className="w-4 h-4 mr-2"/> Tentar Novamente
                            </Button>
                        </div>
                   ) : (
                       <div className="w-full max-w-md space-y-4">
                           <div className="flex justify-between text-sm text-gray-300 font-medium">
                             <span className="capitalize flex items-center gap-2">
                                {importStatus === 'parsing' && <FileSpreadsheet className="w-4 h-4 animate-bounce" />}
                                {importStatus === 'uploading' && <Upload className="w-4 h-4 animate-bounce" />}
                                Processando...
                             </span>
                             <span>{progress.percentage}%</span>
                           </div>
                           <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                             <motion.div 
                               className="h-full bg-blue-500"
                               initial={{ width: 0 }}
                               animate={{ width: `${progress.percentage}%` }}
                               transition={{ duration: 0.2 }}
                             />
                           </div>
                           <div className="bg-gray-800 p-4 rounded border border-gray-700 text-center">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Items Processados</p>
                                <p className="text-2xl font-bold text-white tracking-tight">{progress.success} <span className="text-gray-500 text-lg">/ {progress.total}</span></p>
                           </div>
                           {importStatus !== 'complete' && importStatus !== 'error' && (
                                <div className="flex justify-center pt-2">
                                    <Button onClick={cancelImport} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                        Cancelar Operação
                                    </Button>
                                </div>
                           )}
                       </div>
                   )}
                </div>
                
                <LogViewer logs={logs} />
              </div>
            ) : (
              <>
                {/* File Upload State */}
                {!fileData && (
                  <div className="flex flex-col items-center justify-center min-h-[250px]">
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-10 text-center hover:border-blue-500 transition-all bg-gray-800/50 shadow-sm w-full max-w-xl group">
                      <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-700 transition-colors">
                        <Upload className="w-8 h-8 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-1">Selecione seu arquivo</h3>
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
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 h-auto rounded-full shadow hover:shadow-md transition-all text-sm border-0"
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
                    <div className="bg-gray-800 p-3 rounded-md border border-gray-700 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-green-900/30 p-1.5 rounded">
                          <FileSpreadsheet className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-200">{selectedFile?.name}</p>
                          <p className="text-xs text-gray-400">{fileData.rows.length} linhas detectadas</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { resetImport(); setSelectedFile(null); }}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 text-xs h-8 px-2"
                      >
                        <RotateCcw className="w-3 h-3 mr-1.5" />
                        Reiniciar
                      </Button>
                    </div>

                    {validationError && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-900/20 border-l-4 border-red-500 p-3 rounded-r flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-red-400 font-medium text-sm">{validationError}</p>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Mapping Interface */}
                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
                          <Check className="w-4 h-4 text-blue-500" />
                          Mapeamento ({category.columns.length} colunas)
                        </h3>
                        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden max-h-[400px] overflow-y-auto">
                          {category.columns.map((appCol) => {
                            const isMapped = !!columnMapping[appCol.key];
                            return (
                              <div 
                                key={appCol.key} 
                                className={`px-3 py-2 border-b border-gray-700 last:border-0 transition-colors ${isMapped ? 'bg-blue-900/20' : 'bg-gray-800'}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="w-1/3">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-300">
                                      {appCol.label}
                                      {appCol.required && <span className="text-red-400 text-[10px] bg-red-900/30 px-1.5 rounded-full">Req</span>}
                                    </label>
                                    <p className="text-[10px] text-gray-500 truncate capitalize">{appCol.type}</p>
                                  </div>
                                  
                                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />

                                  <div className="flex-1 relative">
                                    <select
                                      value={columnMapping[appCol.key] || ''}
                                      onChange={(e) => handleMappingChange(appCol.key, e.target.value)}
                                      className={`w-full pl-2 pr-6 py-1.5 text-xs border rounded appearance-none focus:ring-1 focus:ring-blue-500 outline-none transition-all
                                        ${isMapped ? 'border-blue-500 bg-gray-700 text-blue-300 font-medium' : 'border-gray-600 bg-gray-700 text-gray-400'}
                                      `}
                                    >
                                      <option value="">Selecione...</option>
                                      {fileData.headers.map((header, idx) => (
                                        <option key={idx} value={header}>{header}</option>
                                      ))}
                                    </select>
                                    {isMapped && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Check className="w-3 h-3 text-blue-400" />
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
                        <h3 className="text-base font-bold text-gray-200">Prévia de Dados</h3>
                        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-700">
                                <tr>
                                  {fileData.headers.slice(0, 3).map((header, idx) => (
                                    <th key={idx} className="px-3 py-2 text-left font-semibold text-gray-300 border-b border-gray-600 whitespace-nowrap">
                                      {header}
                                    </th>
                                  ))}
                                  {fileData.headers.length > 3 && (
                                    <th className="px-3 py-2 text-left font-semibold text-gray-300 border-b border-gray-600">...</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {fileData.rows.slice(0, 5).map((row, rowIdx) => (
                                  <tr key={rowIdx} className="border-b border-gray-700 hover:bg-gray-700/50 last:border-0">
                                    {fileData.headers.slice(0, 3).map((header, colIdx) => (
                                      <td key={colIdx} className="px-3 py-2 text-gray-400 whitespace-nowrap max-w-[120px] truncate">
                                        {row[header]}
                                      </td>
                                    ))}
                                    {fileData.headers.length > 3 && (
                                      <td className="px-3 py-2 text-gray-600">...</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-2 bg-gray-800 border-t border-gray-700 text-[10px] text-center text-gray-500">
                            Exibindo primeiras 5 linhas
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <LogViewer logs={logs} />
              </>
            )}
          </div>

          {/* Footer */}
          {fileData && !loading && importStatus !== 'complete' && importStatus !== 'uploading' && importStatus !== 'validating' && importStatus !== 'error' && (
            <div className="bg-gray-800 px-5 py-4 flex items-center justify-between gap-4 border-t border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] shrink-0">
              <div className="text-xs text-gray-400">
                {category.columns.filter(c => columnMapping[c.key]).length} / {category.columns.length} mapeados
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-sm bg-transparent border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!allMapped}
                  size="sm"
                  className={`h-9 px-6 text-sm transition-all border-0 ${
                    allMapped 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md' 
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
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
