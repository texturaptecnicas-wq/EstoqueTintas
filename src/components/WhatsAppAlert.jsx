
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import WhatsAppButton from '@/components/WhatsAppButton';

const WhatsAppAlert = ({ product, onDismiss }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      className="bg-white rounded-lg shadow-xl border-l-4 border-red-500 p-3 max-w-xs"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-base text-gray-900">Estoque Baixo!</h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-1 mb-3 text-sm">
        <p className="text-gray-800">
          <span className="font-semibold">Cor:</span> {product.color}
        </p>
        <p className="text-gray-800">
          <span className="font-semibold">Cod:</span> {product.code}
        </p>
        <p className="text-red-600 font-semibold text-xs mt-1">
          Estoque: {product.stock} / Mín: {product.minimum_batch}
        </p>
      </div>

      <WhatsAppButton product={product} variant="default" className="w-full" />
    </motion.div>
  );
};

export default WhatsAppAlert;
