
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useToast } from '@/components/ui/use-toast';

export const useImport = () => {
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [progress, setProgress] = useState({ 
    current: 0, 
    total: 0, 
    success: 0, 
    error: 0,
    percentage: 0 
  });
  
  const abortRef = useRef(false);
  const { toast } = useToast();

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          resolve({
            headers: results.meta.fields || [],
            rows: results.data
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
            header: 1,
            defval: '',
            blankrows: false
          });
          
          if (jsonData.length === 0) {
             resolve({ headers: [], rows: [] });
             return;
          }

          const headers = jsonData[0].map(h => String(h).trim());
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          resolve({
            headers,
            rows
          });
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
      let parsedData;

      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (fileExtension === 'csv') {
        parsedData = await parseCSVFile(file);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        parsedData = await parseExcelFile(file);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel.');
      }

      setFileData(parsedData);
      toast({
        title: 'Arquivo carregado',
        description: `${parsedData.rows.length} linhas encontradas`,
      });

      return parsedData;
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const mapColumns = useCallback((mapping) => {
    setColumnMapping(mapping);
  }, []);

  const cancelImport = useCallback(() => {
    abortRef.current = true;
  }, []);

  const importData = useCallback(async () => {
    try {
      if (!fileData || !fileData.rows) {
        throw new Error('Nenhum dado para importar');
      }

      setLoading(true);
      abortRef.current = false;
      
      const totalRows = fileData.rows.length;
      const validRows = [];
      let successCount = 0;

      const CHUNK_SIZE = 500; 
      
      for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        if (abortRef.current) break;

        const chunk = fileData.rows.slice(i, i + CHUNK_SIZE);
        
        await new Promise(resolve => setTimeout(resolve, 0));

        chunk.forEach((row, index) => {
            const absoluteIndex = i + index;
            
            const getRawValue = (key) => {
              const val = row[columnMapping[key]];
              return val !== undefined && val !== null ? String(val) : undefined;
            };

            const productData = {
              color: getRawValue('color') || '',
              finish: getRawValue('finish') || '',
              code: getRawValue('code') || '',
              supplier: getRawValue('supplier') || '',
              price: getRawValue('price') || '0', 
              last_purchase_month: getRawValue('last_purchase_month') || '',
              minimum_batch: getRawValue('minimum_batch') || '0', 
              stock: getRawValue('stock') || '0',
              order_index: absoluteIndex // Preserve original index
            };

            validRows.push(productData);
            successCount++;
        });

        setProgress({
          current: Math.min(i + CHUNK_SIZE, totalRows),
          total: totalRows,
          success: successCount,
          error: 0,
          percentage: Math.round((Math.min(i + CHUNK_SIZE, totalRows) / totalRows) * 100)
        });
      }

      if (abortRef.current) {
        throw new Error('Importação cancelada pelo usuário');
      }

      return {
        validRows,
        totalRows,
        validCount: validRows.length,
        skippedCount: 0,
        errors: []
      };

    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, success: 0, error: 0, percentage: 0 });
    }
  }, [fileData, columnMapping, toast]);

  const resetImport = useCallback(() => {
    setFileData(null);
    setColumnMapping({});
    setProgress({ current: 0, total: 0, success: 0, error: 0, percentage: 0 });
  }, []);

  return {
    loading,
    fileData,
    columnMapping,
    progress,
    handleFileUpload,
    mapColumns,
    importData,
    cancelImport,
    resetImport
  };
};
