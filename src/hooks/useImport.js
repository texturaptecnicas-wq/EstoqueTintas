import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { parseBRNumber } from '@/utils/numberParser.js';

export const useImport = () => {
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [importStatus, setImportStatus] = useState('idle');
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
          resolve({ headers: results.meta.fields || [], rows: results.data });
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
          const firstSheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', blankrows: false });
          
          if (jsonData.length === 0) {
             resolve({ headers: [], rows: [] });
             return;
          }

          const headers = jsonData[0].map(h => String(h).trim());
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => { obj[header] = row[index] !== undefined ? row[index] : ''; });
            return obj;
          });

          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = useCallback(async (file) => {
    try {
      setLoading(true);
      setImportStatus('parsing');
      setLogs([]);

      if (file.size > 10 * 1024 * 1024) throw new Error('Arquivo muito grande. Limite máximo é 10MB.');

      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) throw new Error('Formato de arquivo não suportado.');

      let parsedData = fileExtension === 'csv' ? await parseCSVFile(file) : await parseExcelFile(file);

      if (!parsedData.rows || parsedData.rows.length === 0) throw new Error('O arquivo não contém dados ou está vazio.');

      setFileData(parsedData);
      setImportStatus('idle');
      return parsedData;
    } catch (error) {
      setImportStatus('error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast, addLog]);

  const mapColumns = useCallback((mapping) => {
    setColumnMapping(mapping);
  }, []);

  const cancelImport = useCallback(() => {
    abortRef.current = true;
    setImportStatus('idle');
  }, []);

  const importData = useCallback(async (categoryId) => {
    try {
      if (!fileData || !fileData.rows) throw new Error('Nenhum dado para importar');
      if (!categoryId) throw new Error('Categoria não definida');

      setLoading(true);
      setImportStatus('validating');
      abortRef.current = false;
      
      const totalRows = fileData.rows.length;
      const validPayloads = [];
      const mappedKeys = Object.keys(columnMapping);

      fileData.rows.forEach((row, index) => {
         try {
            const productData = {}; 
            
            mappedKeys.forEach(appKey => {
               const fileHeader = columnMapping[appKey];
               if (fileHeader) {
                   const val = row[fileHeader];
                   let cleanVal = val !== undefined && val !== null ? String(val).trim() : '';
                   
                   if (appKey === 'estoque' || appKey === 'lote_minimo' || appKey === 'stock') {
                       cleanVal = Number(parseBRNumber(cleanVal));
                       if (appKey === 'estoque' || appKey === 'lote_minimo') {
                         console.log('useImport processing row:', { estoque: appKey === 'estoque' ? cleanVal : undefined, lote_minimo: appKey === 'lote_minimo' ? cleanVal : undefined });
                       }
                   }
                   productData[appKey] = cleanVal;
               }
            });

            if (Object.keys(productData).length > 0) {
              validPayloads.push({
                  category_id: categoryId,
                  data: productData,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
              });
            }
         } catch (err) {
            // skip
         }
      });

      if (validPayloads.length === 0) throw new Error("Nenhuma linha válida encontrada para importar.");

      setImportStatus('uploading');
      const CHUNK_SIZE = 50;
      let successCount = 0;

      for (let i = 0; i < validPayloads.length; i += CHUNK_SIZE) {
        if (abortRef.current) break;
        const chunk = validPayloads.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('products').insert(chunk).select();

        if (error) throw new Error(`Erro no Supabase: ${error.message}`);

        successCount += chunk.length;
        setProgress({
          current: Math.min(i + CHUNK_SIZE, validPayloads.length),
          total: totalRows,
          success: successCount,
          error: 0,
          percentage: Math.round((Math.min(i + CHUNK_SIZE, validPayloads.length) / validPayloads.length) * 100)
        });
      }

      setImportStatus('complete');
      return { validCount: successCount, skippedCount: 0, total: totalRows };

    } catch (error) {
      setImportStatus('error');
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
  }, []);

  return { loading, fileData, columnMapping, progress, importStatus, logs, handleFileUpload, mapColumns, importData, cancelImport, resetImport };
};