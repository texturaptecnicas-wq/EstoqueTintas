
import React from 'react';
import { validateStockData } from '@/utils/validateStockData';
import WhatsAppButton from '@/components/WhatsAppButton';
import { validateProductData } from '@/utils/validateProductData';

const StockAlert = ({ product, phoneNumber: propPhoneNumber }) => {
  // Task 2: Verify it receives complete product object including TINTA
  console.log('StockAlert received complete product:', product);

  // Validate to ensure we have structural integrity
  const { validated } = validateProductData(product);

  // Use utility to evaluate if alert should show based on exact data
  const { estoque: stock, lote_minimo: loteMinimo, shouldShowAlert } = validateStockData(validated.estoque, validated.lote_minimo);

  if (!shouldShowAlert) {
    return null;
  }

  // Task 2: Pass complete product object to WhatsAppButton with all fields intact, including TINTA.
  return (
    <div className="flex items-center gap-2 shrink-0 mr-1 group relative">
      <div 
        className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-blink shadow-sm" 
        title={`Estoque Baixo (${stock} <= ${loteMinimo})`} 
      />
      
      <WhatsAppButton 
         product={product} 
         className="px-2.5"
      />
      
      {/* Debug UI (visible on hover over the button area) */}
      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-[9px] p-1.5 rounded z-50 whitespace-nowrap pointer-events-none">
        <div>Tinta: {String(product.TINTA || product.tinta || product.data?.TINTA || product.data?.tinta || validated.name).trim()}</div>
        <div>Cor: {String(validated.cor).trim()}</div>
        <div>Cod: {String(validated.codigo).trim()}</div>
      </div>
    </div>
  );
};

export default StockAlert;
