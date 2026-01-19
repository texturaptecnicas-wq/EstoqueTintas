
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

export const useImport = () => {
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importStatus, setImportStatus] = useState('idle'); // idle, parsing, validating, uploading, complete, error
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({ 
    current: 0, 
    total: 0, 
    success: 0, 
    error: 0,
    percentage: 0 
  });
  
  const abortRef = useRef(false);
  const { toast } = useToast();

  const addLog = useCallback((message, type = 'info', details = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { id: Date.now() + Math.random(), timestamp, message, type, details };
    setLogs(prev => [...prev, logEntry]);
    
    if (type === 'error') {
      console.error(`[Import Error] ${message}`, details || '');
    } else {
      console.log(`[Import] ${message}`, details || '');
    }
  }, []);

  const parseCSVFile = (file) => {
    addLog(`Starting CSV parse for file: ${file.name}`);
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          addLog(`CSV Parse complete. Found ${results.data.length} rows.`);
          addLog(`Headers detected: ${results.meta.fields?.join(', ')}`);
          resolve({
            headers: results.meta.fields || [],
            rows: results.data
          });
        },
        error: (error) => {
          addLog('CSV Parse error', 'error', error);
          reject(error);
        }
      });
    });
  };

  const parseExcelFile = (file) => {
    addLog(`Starting Excel parse for file: ${file.name}`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (workbook.SheetNames.length === 0) {
            throw new Error('O arquivo Excel não possui planilhas.');
          }

          const firstSheetName = workbook.SheetNames[0];
          addLog(`Reading sheet: ${firstSheetName}`);
          const firstSheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            header: 1,
            defval: '',
            blankrows: false
          });
          
          if (jsonData.length === 0) {
             addLog('Excel sheet is empty', 'error');
             resolve({ headers: [], rows: [] });
             return;
          }

          const headers = jsonData[0].map(h => String(h).trim());
          addLog(`Headers found: ${headers.join(', ')}`);
          
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : ''; 
            });
            return obj;
          });

          addLog(`Excel Parse complete. Found ${rows.length} rows.`);
          resolve({ headers, rows });
        } catch (error) {
          addLog("Excel parse error", 'error', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        addLog('File reading error', 'error');
        reject(new Error('Erro ao ler arquivo'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = useCallback(async (file) => {
    try {
      setLoading(true);
      setImportStatus('parsing');
      setLogs([]); // Clear previous logs
      addLog(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      // 1. Validate File Size (Max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Limite máximo é 10MB.');
      }

      // 2. Validate File Type
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls).');
      }

      let parsedData;
      if (fileExtension === 'csv') {
        parsedData = await parseCSVFile(file);
      } else {
        parsedData = await parseExcelFile(file);
      }

      // 3. Validate Data Not Empty
      if (!parsedData.rows || parsedData.rows.length === 0) {
        throw new Error('O arquivo não contém dados ou está vazio.');
      }

      setFileData(parsedData);
      setImportStatus('idle');
      toast({
        title: 'Arquivo carregado',
        description: `${parsedData.rows.length} linhas encontradas`,
      });

      return parsedData;
    } catch (error) {
      setImportStatus('error');
      addLog("File upload/parse error", 'error', error.message);
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast, addLog]);

  const mapColumns = useCallback((mapping) => {
    setColumnMapping(mapping);
    addLog('Column mapping updated', 'info', mapping);
  }, [addLog]);

  const cancelImport = useCallback(() => {
    abortRef.current = true;
    addLog('Import cancelled by user', 'warning');
    setImportStatus('idle');
  }, [addLog]);

  const importData = useCallback(async (categoryId) => {
    try {
      if (!fileData || !fileData.rows) throw new Error('Nenhum dado para importar');
      if (!categoryId) throw new Error('Categoria não definida');

      setLoading(true);
      setImportStatus('validating');
      abortRef.current = false;
      addLog('Starting import process...', 'info');
      
      const totalRows = fileData.rows.length;
      const validPayloads = [];
      const errors = [];

      // --- PHASE 1: VALIDATION & TRANSFORMATION ---
      addLog(`Validating ${totalRows} rows against schema...`);
      
      const mappedKeys = Object.keys(columnMapping);
      if (mappedKeys.length === 0) {
        throw new Error("Nenhuma coluna mapeada. Mapeie as colunas antes de importar.");
      }

      fileData.rows.forEach((row, index) => {
         try {
            const productData = { }; 
            
            mappedKeys.forEach(appKey => {
               const fileHeader = columnMapping[appKey];
               if (fileHeader) {
                   const val = row[fileHeader];
                   // Basic sanitization
                   const cleanVal = val !== undefined && val !== null ? String(val).trim() : '';
                   
                   productData[appKey] = cleanVal;
               }
            });

            // Basic validation: Must have at least some data
            if (Object.keys(productData).length === 0) {
                // Skip empty rows silently or with a log
                return;
            }
            
            // NOTE: Removed 'name' property from the payload as per request.
            // Supabase is expected to auto-generate or handle the 'name' column via default values/triggers.
            validPayloads.push({
                category_id: categoryId,
                data: productData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
         } catch (err) {
             errors.push(`Line ${index}: ${err.message}`);
         }
      });

      if (validPayloads.length === 0) {
          throw new Error("Nenhuma linha válida encontrada para importar.");
      }

      addLog(`Validation complete. ${validPayloads.length} valid rows prepared. ${errors.length} skipped.`);
      if (errors.length > 0) {
          addLog("Skipped row errors:", 'warning', errors.slice(0, 5)); // log first 5 errors
      }

      // --- PHASE 2: UPLOAD TO SUPABASE ---
      setImportStatus('uploading');
      const CHUNK_SIZE = 50; // Smaller batch size for better reliability
      let successCount = 0;
      
      addLog(`Starting batch upload to Supabase. Total batches: ${Math.ceil(validPayloads.length / CHUNK_SIZE)}`);

      for (let i = 0; i < validPayloads.length; i += CHUNK_SIZE) {
        if (abortRef.current) break;

        const chunk = validPayloads.slice(i, i + CHUNK_SIZE);
        addLog(`Uploading batch ${(i/CHUNK_SIZE) + 1}... (${chunk.length} items)`);

        const { data, error } = await supabase.from('products').insert(chunk).select();

        if (error) {
            addLog(`Error uploading batch ${(i/CHUNK_SIZE) + 1}`, 'error', error);
            // We can choose to throw or continue. For now, let's throw to stop bad imports.
            throw new Error(`Erro no Supabase: ${error.message}`);
        }

        successCount += chunk.length;
        addLog(`Batch ${(i/CHUNK_SIZE) + 1} success. Inserted ${chunk.length} items.`);
        
        // Update progress
        setProgress({
          current: Math.min(i + CHUNK_SIZE, validPayloads.length),
          total: totalRows,
          success: successCount,
          error: errors.length,
          percentage: Math.round((Math.min(i + CHUNK_SIZE, validPayloads.length) / validPayloads.length) * 100)
        });

        // Yield to event loop
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (abortRef.current) {
        throw new Error('Importação cancelada pelo usuário');
      }

      addLog(`Upload complete. Successfully imported ${successCount} products.`);
      setImportStatus('complete');

      return {
        validCount: successCount,
        skippedCount: errors.length,
        total: totalRows
      };

    } catch (error) {
      setImportStatus('error');
      addLog("Critical Import Error", 'error', error);
      toast({
        title: 'Falha na importação',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fileData, columnMapping, toast, addLog]);

  const resetImport = useCallback(() => {
    setFileData(null);
    setColumnMapping({});
    setImportStatus('idle');
    setLogs([]);
    setProgress({ current: 0, total: 0, success: 0, error: 0, percentage: 0 });
    addLog('Import state reset', 'info');
  }, [addLog]);

  return {
    loading,
    fileData,
    columnMapping,
    progress,
    importStatus,
    logs,
    handleFileUpload,
    mapColumns,
    importData,
    cancelImport,
    resetImport
  };
};
