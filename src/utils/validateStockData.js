
export const validateStockData = (stockRaw, loteMinimoRaw) => {
  // 1 & 2: Takes raw inputs, removes whitespace/special chars, converts to float
  const cleanAndParse = (val) => {
    if (typeof val === 'number') return val;
    if (val === null || val === undefined || val === '') return 0;
    
    // Convert to string, remove whitespace
    let stringVal = String(val).replace(/\s/g, '');
    // Replace comma with dot for standard JS parsing, remove chars that aren't digits, dot, or minus
    stringVal = stringVal.replace(',', '.').replace(/[^\d.-]/g, '');
    
    // 3: Convert to parseFloat
    const parsed = parseFloat(stringVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const estoque = cleanAndParse(stockRaw);
  const lote_minimo = cleanAndParse(loteMinimoRaw);
  
  // 4: Return object with comparison result
  const shouldShowAlert = estoque <= lote_minimo;

  return { estoque, lote_minimo, shouldShowAlert };
};
