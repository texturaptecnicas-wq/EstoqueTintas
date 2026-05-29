
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Plus, Minus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CaixaAbertaCell = ({
  product,
  onUpdateCaixaAberta,
  onUpdateMeiaCaixaStatus
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!product) return null;
  const isOpen = product.caixa_aberta === true;
  const status = product.meia_caixa_status || null;

  const handleToggleCaixa = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (typeof onUpdateCaixaAberta === 'function') {
        await onUpdateCaixaAberta(product.id, !isOpen);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMais = async (e) => {
    e.stopPropagation();
    if (!isOpen || isLoading) return;
    
    setIsLoading(true);
    try {
      if (typeof onUpdateMeiaCaixaStatus === 'function') {
        await onUpdateMeiaCaixaStatus(product.id, status === 'mais' ? 'aberta' : 'mais');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMenos = async (e) => {
    e.stopPropagation();
    if (!isOpen || isLoading) return;
    
    setIsLoading(true);
    try {
      if (typeof onUpdateMeiaCaixaStatus === 'function') {
        await onUpdateMeiaCaixaStatus(product.id, status === 'menos' ? 'aberta' : 'menos');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleToggleCaixa} 
          disabled={isLoading}
          className={cn("h-7 px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors rounded-md", 
            isOpen ? "bg-orange-300 hover:bg-orange-400" : "bg-gray-400 hover:bg-gray-500",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : isOpen ? (
            <Unlock className="w-3 h-3 mr-1.5" />
          ) : (
            <Lock className="w-3 h-3 mr-1.5" />
          )}
          {isOpen ? "Caixa Aberta" : "Caixa Fechada"}
        </Button>
      </div>

      {isOpen && (
        <div className="flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Button 
            size="sm" 
            onClick={handleToggleMenos} 
            disabled={isLoading}
            className={cn("h-7 px-3 py-1 text-xs font-medium text-white transition-all duration-300 rounded shadow-sm", 
              status === 'menos' ? "bg-red-500 hover:bg-red-600 scale-105" : "bg-gray-300 hover:bg-gray-400 scale-100",
              isLoading && "opacity-70"
            )} 
            title="- Meia Caixa"
          >
            <Minus className="w-3 h-3 mr-1" strokeWidth={3} />
            Meia Caixa
          </Button>

          <Button 
            size="sm" 
            onClick={handleToggleMais} 
            disabled={isLoading}
            className={cn("h-7 px-3 py-1 text-xs font-medium text-white transition-all duration-300 rounded shadow-sm", 
              status === 'mais' ? "bg-green-500 hover:bg-green-600 scale-105" : "bg-gray-300 hover:bg-gray-400 scale-100",
              isLoading && "opacity-70"
            )} 
            title="+ Meia Caixa"
          >
            <Plus className="w-3 h-3 mr-1" strokeWidth={3} />
            Meia caixa
          </Button>
        </div>
      )}
    </div>
  );
};

export default CaixaAbertaCell;
