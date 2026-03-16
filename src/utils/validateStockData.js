
import { parseBRNumber } from '@/utils/numberParser.js';

export const validateStockData = (stockRaw, loteMinimoRaw, caixaAberta = false, meiaCaixa = false) => {
  const estoque = parseBRNumber(stockRaw);
  const lote_minimo = parseBRNumber(loteMinimoRaw);
  
  let shouldShowAlert = false;
  
  if (caixaAberta) {
    shouldShowAlert = !!meiaCaixa; // true means "Menos de meia caixa", which triggers the alert
  } else {
    if (lote_minimo === 0) {
      shouldShowAlert = estoque === 0;
    } else if (lote_minimo > 0) {
      shouldShowAlert = estoque <= lote_minimo;
    }
  }

  console.log('validateStockData:', { estoque, lote_minimo, caixaAberta, meiaCaixa, shouldShowAlert });
  return { estoque, lote_minimo, caixaAberta, meiaCaixa, shouldShowAlert };
};
