import React from 'react';
import { History, TrendingUp, TrendingDown, X, RefreshCw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import PriceChart from '@/components/PriceChart';
import { cn } from '@/lib/utils';

const PriceHistoryModal = ({ isOpen, onClose, product }) => {
  const { priceHistory, loading, error } = usePriceHistory(isOpen && product ? product.id : null);

  if (!isOpen) return null;

  const currentPrice = product ? parseFloat(product.preco || product.price || product.valor || product.custo || product.data?.preco || product.data?.price || product.data?.valor || product.data?.custo || 0) : 0;
  const productName = product ? (product.name || product.data?.name || 'Produto') : 'Produto';
  const lastChange = priceHistory.length > 0 ? priceHistory[0] : null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const dateObj = new Date(dateString);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercentage = (val) => {
    if (!val) return '0.0%';
    const num = Number(val);
    const prefix = num > 0 ? '+' : '';
    return `${prefix}${num.toFixed(1)}%`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden gap-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">Histórico de Preços</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {productName}
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

        <div className="p-6 bg-gray-50/50 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-gray-500">Carregando histórico...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-2">Erro ao carregar histórico</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Summary Header */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500 font-medium block mb-1">Preço Atual</span>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-gray-900 tracking-tight">
                      {formatCurrency(currentPrice)}
                    </span>
                  </div>
                </div>
                {lastChange && lastChange.variation !== 0 && (
                  <div className="text-right">
                    <span className="text-sm text-gray-500 font-medium block mb-1">Última Variação</span>
                    <span className={cn(
                      "text-sm font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5",
                      lastChange.variation > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    )}>
                      {lastChange.variation > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {formatPercentage(lastChange.variation)}
                    </span>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Evolução do Preço</h3>
                <PriceChart priceHistory={priceHistory} />
              </div>

              {/* History Table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Data da Mudança</th>
                        <th className="px-6 py-3 font-semibold text-right">Preço Anterior</th>
                        <th className="px-6 py-3 font-semibold text-right">Preço Novo</th>
                        <th className="px-6 py-3 font-semibold text-right">% Mudança</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {priceHistory.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                            Nenhum registro de alteração de preço encontrado.
                          </td>
                        </tr>
                      ) : (
                        priceHistory.map((record) => {
                          const isUp = record.variation > 0;
                          const isDown = record.variation < 0;
                          
                          return (
                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3 font-medium text-gray-700 whitespace-nowrap">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-6 py-3 text-right text-gray-500 line-through">
                                {record.old_price !== null ? formatCurrency(record.old_price) : '-'}
                              </td>
                              <td className="px-6 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(record.price)}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <span className={cn(
                                  "inline-flex items-center justify-end gap-1 font-medium",
                                  isUp ? "text-red-600" : (isDown ? "text-green-600" : "text-gray-400")
                                )}>
                                  {formatPercentage(record.variation)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryModal;