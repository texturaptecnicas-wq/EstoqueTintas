
import React, { useState, useEffect } from 'react';
import { validateStockData } from '@/utils/validateStockData';
import WhatsAppButton from '@/components/WhatsAppButton';
import { validateProductData } from '@/utils/validateProductData';

const StockAlert = ({ product, phoneNumber: propPhoneNumber }) => {
  const [alertData, setAlertData] = useState({ estoque: 0, lote_minimo: 0, shouldShowAlert: false });
  const { validated } = validateProductData(product);

  useEffect(() => {
    // Extract raw values properly
    const estoqueRaw = product?.data?.estoque !== undefined ? product.data.estoque : validated.estoque;
    const loteMinimoRaw = product?.lote_minimo !== undefined ? product.lote_minimo : (product?.data?.lote_minimo !== undefined ? product.data.lote_minimo : validated.lote_minimo);
    
    const result = validateStockData(estoqueRaw, loteMinimoRaw, product?.caixa_aberta, product?.meia_caixa);
    setAlertData(result);
    console.log('StockAlert recalculated:', result);
  }, [product?.data?.estoque, product?.lote_minimo, product?.data?.lote_minimo, validated.estoque, validated.lote_minimo, product?.caixa_aberta, product?.meia_caixa]);

  let days = 0;
  if (product?.caixa_aberta && product?.data_caixa_aberta) {
    const diffTime = Math.abs(new Date() - new Date(product.data_caixa_aberta));
    days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  if (!alertData.shouldShowAlert && !product?.caixa_aberta) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 shrink-0 mr-1 group relative">
      {alertData.shouldShowAlert && (
        <>
          <div 
            className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-blink shadow-sm" 
            title={product?.caixa_aberta ? "Atenção: Menos de meia caixa!" : `Estoque Baixo (${alertData.estoque} <= ${alertData.lote_minimo})`} 
          />
          
          <WhatsAppButton 
             product={product} 
             className="px-2.5"
          />
        </>
      )}

      {product?.caixa_aberta && !alertData.shouldShowAlert && (
        <span 
          className="text-[10px] font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-orange-200"
          title={`Data de abertura: ${product?.data_caixa_aberta ? new Date(product.data_caixa_aberta).toLocaleDateString() : 'Desconhecida'}`}
        >
          Aberta há {days} {days === 1 ? 'dia' : 'dias'}
        </span>
      )}
      
      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-black/80 text-white text-[9px] p-1.5 rounded z-50 whitespace-nowrap pointer-events-none">
        <div>Tinta: {String(product?.TINTA || product?.tinta || product?.data?.TINTA || product?.data?.tinta || validated.name).trim()}</div>
        <div>Cor: {String(validated.cor).trim()}</div>
        <div>Cod: {String(validated.codigo).trim()}</div>
      </div>
    </div>
  );
};

export default StockAlert;
