
import React from 'react';
import { History, TrendingUp, TrendingDown, Minus, X, Calendar, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PriceHistoryModal = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  const history = [...(product.priceHistory || [])].reverse();
  const currentPrice = parseFloat(product.price) || 0;
  // If we have history, the last entry might be the current price update. 
  // If not, we use current.
  
  // Calculate stats
  const hasHistory = history.length > 0;
  const lastChange = hasHistory ? history[0] : null;
  const previousPrice = hasHistory && history.length > 1 ? history[1].price : (hasHistory ? history[0].oldPrice : currentPrice);
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white gap-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Histórico de Preços</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {product.name}
              </DialogDescription>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Preço Atual</span>
              {lastChange && (
                <span className={cn(
                  "text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1",
                  lastChange.variation > 0 ? "bg-red-50 text-red-600" : (lastChange.variation < 0 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600")
                )}>
                  {lastChange.variation > 0 ? <TrendingUp className="w-3 h-3" /> : (lastChange.variation < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />)}
                  {Math.abs(lastChange.variation).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(currentPrice)}
              </span>
              <span className="text-sm text-gray-400 mb-1.5 pb-0.5 border-b border-transparent">
                / unidade
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Linha do Tempo
            </h4>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                Nenhum registro de alteração de preço encontrado.
              </div>
            ) : (
              <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                {history.map((record, index) => {
                  const isUp = record.variation > 0;
                  const isDown = record.variation < 0;
                  
                  return (
                    <div key={index} className="relative group">
                      {/* Timeline Dot */}
                      <div className={cn(
                        "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ring-1 transition-colors",
                        index === 0 ? "bg-blue-500 ring-blue-200" : "bg-gray-300 ring-gray-100"
                      )} />
                      
                      <div className="flex items-start justify-between group-hover:bg-gray-50 p-2 rounded-lg -ml-2 -mt-2 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(record.price)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(record.date)}
                          </p>
                        </div>
                        
                        {record.oldPrice !== undefined && (
                          <div className="text-right">
                            <div className={cn(
                              "text-xs font-medium flex items-center justify-end gap-1",
                              isUp ? "text-red-600" : (isDown ? "text-green-600" : "text-gray-500")
                            )}>
                              {isUp ? "+" : ""}{record.variation.toFixed(1)}%
                              {isUp ? <TrendingUp className="w-3 h-3" /> : (isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />)}
                            </div>
                            <p className="text-[10px] text-gray-400 line-through mt-0.5">
                              {formatCurrency(record.oldPrice)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryModal;
