
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatValue } from '@/utils/formatValue';
import { validateStockData } from '@/utils/validateStockData';

const StockAlert = ({ product }) => {
  const { toast } = useToast();

  // Task 3: Integrate caixa_aberta status
  if (product.caixa_aberta) {
    let days = 0;
    if (product.data_caixa_aberta) {
      const diffTime = Math.abs(new Date() - new Date(product.data_caixa_aberta));
      days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return (
      <div className="flex items-center gap-2 shrink-0 mr-1">
        <span 
          className="text-[10px] font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-orange-200"
          title={`Data de abertura: ${product.data_caixa_aberta ? new Date(product.data_caixa_aberta).toLocaleDateString() : 'Desconhecida'}`}
        >
          Aberta há {days} {days === 1 ? 'dia' : 'dias'}
        </span>
      </div>
    );
  }

  // Use utility to sanitize, parse, and evaluate
  const { estoque: stock, lote_minimo: loteMinimo, shouldShowAlert } = validateStockData(product.stock, product.lote_minimo);

  // If condition is false, do not render alert
  if (!shouldShowAlert) {
    return null;
  }

  const handleWhatsAppClick = (e) => {
    e.stopPropagation(); // Prevent row click events
    
    // Calculate quantity to purchase based on the difference, minimum 1 if stock is low
    const diff = loteMinimo - stock;
    const qtyToPurchase = diff > 0 ? diff : 1;
    
    const message = `*ALERTA DE ESTOQUE BAIXO*\n\n` +
      `📦 *Produto:* ${product.name || product.product || product.color || 'N/A'}\n` +
      `🔖 *Código:* ${product.code || 'N/A'}\n` +
      `🏢 *Fornecedor:* ${product.supplier || product.fornecedor || 'N/A'}\n` +
      `💲 *Preço:* ${formatValue(product.price, 'currency') || 'N/A'}\n` +
      `🛒 *Quantidade Sugerida:* ${qtyToPurchase}`;
      
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'WhatsApp aberto',
      description: 'Mensagem de reposição gerada.',
      duration: 2000
    });
  };

  return (
    <div className="flex items-center gap-2 shrink-0 mr-1">
      <div 
        className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-blink shadow-sm" 
        title={`Estoque Baixo (${stock} <= ${loteMinimo})`} 
      />
      <Button
        onClick={handleWhatsAppClick}
        variant="default"
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white h-6 text-[10px] px-2.5 shadow-sm rounded-full"
        title="Solicitar Reposição"
      >
        <MessageCircle className="w-3 h-3 mr-1" />
        Comprar
      </Button>
    </div>
  );
};

export default StockAlert;
