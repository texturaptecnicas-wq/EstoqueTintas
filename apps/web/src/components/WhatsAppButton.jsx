import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const WhatsAppButton = ({ product, variant = 'default', className = '' }) => {
  const { toast } = useToast();

  const formatPrice = (price) => {
    if (price === '' || price === undefined || price === null) return '';
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice)) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numPrice);
    }
    return String(price);
  };

  const generateWhatsAppMessage = () => {
    // Debug logs for extraction verification
    console.log('FULL PRODUCT OBJECT:', product);
    console.log('PRODUCT DATA FIELD:', product?.data);
    
    // Robust case-insensitive extraction logic
    const getExactValue = (...targetKeys) => {
      if (!product) return '';
      
      for (const targetKey of targetKeys) {
        const targetLower = targetKey.toLowerCase();
        
        // Check root product object first
        for (const key in product) {
          if (key.toLowerCase() === targetLower && product[key] !== undefined && product[key] !== null && key !== 'data') {
            return String(product[key]);
          }
        }
        
        // Check product.data (Supabase JSONB field)
        if (product.data && typeof product.data === 'object') {
          for (const key in product.data) {
            if (key.toLowerCase() === targetLower && product.data[key] !== undefined && product.data[key] !== null) {
              return String(product.data[key]);
            }
          }
        }
      }
      return '';
    };

    // Extract exact values
    const tinta = getExactValue('TINTA', 'name', 'produto', 'nome'); 
    const codigo = getExactValue('CODIGO', 'code');
    const fornecedor = getExactValue('FORNECEDOR', 'supplier');
    const preco = getExactValue('PRECO', 'price');
    const currentDateTime = new Date().toLocaleString('pt-BR');

    // Task 1: Update format - remove COR and add "◆" prefix
    const message = `◆ *AVISO DE COMPRA - TINTA*\n` +
      `◆ *TINTA:* ${tinta}\n` +
      `◆ *Código:* ${codigo}\n` +
      `◆ *Fornecedor:* ${fornecedor}\n` +
      `◆ *Preço:* ${formatPrice(preco)}\n` +
      `◆ *Data:* ${currentDateTime}`;
      
    console.log('Built WhatsApp message:\n', message);

    return message;
  };

  const handleWhatsAppClick = (e) => {
    e.stopPropagation();
    
    if (!product) {
       console.error('WhatsAppButton: Product is missing');
       return;
    }

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