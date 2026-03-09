import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const WhatsAppButton = ({ product, variant = 'default', className = '' }) => {
  const { toast } = useToast();

  const formatPrice = (price) => {
    // Check if price is a valid number string or number
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice)) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numPrice);
    }
    return price; // Return as-is if it's text
  };

  const generateWhatsAppMessage = () => {
    // Message template: product name, code, supplier, price, current stock, minimum batch
    const message = `*SOLICITAÇÃO DE REPOSIÇÃO*\n\n` +
      `📦 *Produto:* ${product.color || 'N/A'}\n` +
      `🔖 *Código:* ${product.code || 'N/A'}\n` +
      `🏢 *Fornecedor:* ${product.supplier || 'N/A'}\n` +
      `💲 *Último Preço:* ${formatPrice(product.price)}\n` +
      `📉 *Estoque Atual:* ${product.stock}\n` +
      `⚠️ *Lote Mínimo:* ${product.minimum_batch}`;
      
    return message;
  };

  const handleWhatsAppClick = (e) => {
    e.stopPropagation(); // Prevent row click events if any
    const message = generateWhatsAppMessage();
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
    <Button
      onClick={handleWhatsAppClick}
      variant={variant}
      size="sm"
      className={`bg-green-600 hover:bg-green-700 text-white h-6 text-[10px] px-2 shadow-sm rounded-full ${className}`}
      title="Solicitar Reposição via WhatsApp"
    >
      <MessageCircle className="w-3 h-3 mr-1" />
      Pedir
    </Button>
  );
};

export default WhatsAppButton;