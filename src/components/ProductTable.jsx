
import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Columns, Minus, Loader2, Settings2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WhatsAppButton from '@/components/WhatsAppButton';
import AddColumnModal from '@/components/AddColumnModal';
import AddProductModal from '@/components/AddProductModal';
import ColumnEditor from '@/components/ColumnEditor';
import PriceHistoryModal from '@/components/PriceHistoryModal';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Helper component for Numeric Controls (Stock, Price, etc)
const NumericCellControl = ({ product, columnKey, type, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const rawValue = parseFloat(product[columnKey]);
  const currentValue = isNaN(rawValue) ? 0 : rawValue;

  const handleUpdate = async (newValue) => {
    if (newValue < 0) return;
    setIsLoading(true);
    
    try {
      if (onUpdate) {
        // We await the update here to ensure loading state persists until server acknowledges
        await onUpdate(product.id, { [columnKey]: newValue });
      }
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const step = type === 'currency' || type === 'percentage' ? 1 : 1; 

  return (
    <div className="flex items-center justify-center gap-1.5 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded-md border-gray-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 touch-manipulation shrink-0"
        disabled={isLoading || currentValue <= 0}
        onClick={() => handleUpdate(Math.max(0, currentValue - step))}
      >
        <Minus className="h-3 w-3" />
      </Button>
      
      <div className="flex-1 text-center font-semibold text-gray-700 relative min-w-[3rem] text-sm">
        {isLoading ? (
           <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-600" />
        ) : (
           <span>
             {type === 'currency' && 'R$ '}
             {currentValue.toLocaleString('pt-BR', { 
               minimumFractionDigits: type === 'currency' ? 2 : (Number.isInteger(currentValue) ? 0 : 2),
               maximumFractionDigits: 2 
             })}
             {type === 'percentage' && '%'}
           </span>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded-md border-gray-300 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 touch-manipulation shrink-0"
        disabled={isLoading}
        onClick={() => handleUpdate(currentValue + step)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

const ProductTable = ({ 
  products, 
  category, 
  onEdit, 
  onDelete, 
  onAddColumn,
  onUpdateColumn,
  onAddProduct,
  onProductUpdate
}) => {
  const tableContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null); // For PriceHistoryModal
  const { toast } = useToast();
  
  // Update history modal data if the underlying product changes in real-time
  useEffect(() => {
     if (historyProduct) {
        const updatedProduct = products.find(p => p.id === historyProduct.id);
        if (updatedProduct) {
           setHistoryProduct(updatedProduct);
        }
     }
  }, [products]);

  // Refs for drag state
  const dragRef = useRef({
    isDown: false,
    startX: 0,
    initialX: 0, 
    scrollLeft: 0
  });

  const isLowStock = (product) => {
    const stock = parseFloat(product.stock);
    const min = parseFloat(product.minimum_batch);
    if (isNaN(stock) || isNaN(min)) return false;
    return stock <= min;
  };

  // Mouse/Touch Event Handlers for horizontal scrolling
  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    dragRef.current.isDown = true;
    dragRef.current.startX = e.pageX;
    dragRef.current.initialX = e.pageX;
    dragRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
  };

  const onMouseMove = (e) => {
    if (!dragRef.current.isDown) return;
    const currentX = e.pageX;
    const distanceMoved = Math.abs(currentX - dragRef.current.initialX);
    if (distanceMoved > 5) {
      if (!isDragging) setIsDragging(true);
      const dragDistance = dragRef.current.startX - currentX;
      tableContainerRef.current.scrollLeft += dragDistance;
      dragRef.current.startX = currentX;
    }
  };

  const onMouseUp = () => {
    dragRef.current.isDown = false;
    setTimeout(() => setIsDragging(false), 50);
  };

  const onMouseLeave = () => {
    dragRef.current.isDown = false;
    setIsDragging(false);
  };

  const onTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    dragRef.current.isDown = true;
    dragRef.current.startX = e.touches[0].clientX;
    dragRef.current.initialX = e.touches[0].clientX;
    dragRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
  };

  const onTouchMove = (e) => {
    if (!dragRef.current.isDown) return;
    const currentX = e.touches[0].clientX;
    const distanceMoved = Math.abs(currentX - dragRef.current.initialX);
    if (distanceMoved > 5) {
      if (!isDragging) setIsDragging(true);
      const dragDistance = dragRef.current.startX - currentX;
      tableContainerRef.current.scrollLeft += dragDistance;
      dragRef.current.startX = currentX;
    }
  };

  const onTouchEnd = () => {
    dragRef.current.isDown = false;
    setIsDragging(false);
  };

  // Handlers
  const handleSaveColumn = (newColumn) => {
    if (onAddColumn) {
      onAddColumn(newColumn);
      toast({
        title: "Coluna adicionada",
        description: `A coluna "${newColumn.label}" foi adicionada com sucesso.`
      });
    }
  };

  const handleUpdateColumnConfig = (updatedColumn) => {
    if (onUpdateColumn) {
      onUpdateColumn(updatedColumn);
      toast({
        title: "Coluna atualizada",
        description: "As configurações da coluna foram salvas."
      });
    }
  };

  const handleSaveProduct = (productData) => {
    if (onAddProduct) {
      onAddProduct(productData);
    }
  };

  // Helper to format non-numeric cell values
  const formatCellValue = (value, type) => {
    if (!value) return '-';
    if (type === 'date') {
      try {
        return new Date(value).toLocaleDateString('pt-BR');
      } catch (e) {
        return value;
      }
    }
    return value;
  };

  if (!category) return null;

  // Filter visible columns
  const visibleColumns = category.columns.filter(col => col.visible !== false);

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Itens em Estoque</h2>
          <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs font-medium">
            {products.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsColumnModalOpen(true)}
            variant="outline" 
            size="sm" 
            className="h-9 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-300"
          >
            <Columns className="w-4 h-4 mr-2" />
            Adicionar Coluna
          </Button>
          <Button 
            onClick={() => setIsProductModalOpen(true)}
            size="sm" 
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-lg border border-gray-200 border-dashed">
          <p className="text-lg text-gray-500 font-medium">Nenhum item nesta categoria</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Comece adicionando produtos à sua tabela</p>
          <Button onClick={() => setIsProductModalOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeiro Item
          </Button>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden relative">
            <div
              ref={tableContainerRef}
              className={cn(
                "overflow-x-auto w-full touch-pan-y",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseLeave}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <table className="w-full min-w-[1000px] lg:min-w-full border-collapse text-sm select-none">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    {visibleColumns.map((col) => (
                      <th 
                        key={col.key} 
                        className={cn(
                          "px-4 py-3 font-bold text-gray-700 whitespace-nowrap select-none relative group/head cursor-pointer hover:bg-gray-200 transition-colors",
                          col.align ? `text-${col.align}` : "text-center"
                        )}
                        style={{ width: col.width || 'auto' }}
                        onClick={() => setEditingColumn(col)}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {col.label}
                          <Settings2 className="w-3 h-3 opacity-0 group-hover/head:opacity-50 transition-opacity" />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-bold text-gray-700 min-w-[100px] select-none bg-gray-100">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => {
                    const lowStock = isLowStock(product);
                    const isEven = index % 2 === 0;
                    
                    return (
                      <tr
                        key={product.id}
                        className={cn(
                          "border-b border-gray-300 last:border-0 transition-colors group",
                          isEven ? "bg-white" : "bg-[#f3f4f6]",
                          lowStock ? "bg-red-50" : "hover:bg-blue-50/50"
                        )}
                      >
                        {visibleColumns.map((col, idx) => {
                          const isFirstCol = idx === 0;
                          const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(col.type) || col.key === 'stock';
                          
                          // Numeric Controller Cell
                          if (isNumeric) {
                            return (
                              <td key={col.key} className="px-4 py-3 text-center align-middle">
                                <NumericCellControl 
                                  product={product} 
                                  columnKey={col.key}
                                  type={col.type}
                                  onUpdate={onProductUpdate} 
                                />
                              </td>
                            );
                          }

                          // Standard Text/Date Cell
                          return (
                            <td 
                              key={col.key} 
                              className={cn(
                                "px-4 py-3 text-gray-800 whitespace-nowrap align-middle", 
                                col.align ? `text-${col.align}` : "text-center"
                              )}
                            >
                              <div className={cn(
                                "flex items-center gap-2",
                                col.align === 'left' ? "justify-start" : 
                                col.align === 'right' ? "justify-end" : "justify-center"
                              )}>
                                 {isFirstCol && lowStock && (
                                    <div className="relative flex items-center justify-center w-4 h-4 mr-1 shrink-0" title="Estoque Baixo">
                                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-pulse-red"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF0000] animate-vibrate"></span>
                                    </div>
                                 )}
                                 
                                 <span className={cn("truncate text-sm", isFirstCol && "font-medium text-gray-900")}>
                                   {formatCellValue(product[col.key], col.type)}
                                 </span>

                                 {isFirstCol && lowStock && (
                                   <div className="pl-1 shrink-0">
                                     <WhatsAppButton product={product} className="h-7 w-7 p-0 flex items-center justify-center" />
                                   </div>
                                 )}
                              </div>
                            </td>
                          );
                        })}
                        
                        <td className="px-4 py-2 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => setHistoryProduct(product)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-yellow-100 hover:text-yellow-700 rounded-full cursor-pointer"
                              title="Histórico de Preços"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => onEdit(product)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700 rounded-full cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => onDelete(product.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700 rounded-full cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AddColumnModal 
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onSave={handleSaveColumn}
      />
      
      <ColumnEditor
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
        column={editingColumn}
        onSave={handleUpdateColumnConfig}
      />
      
      <PriceHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        category={category}
      />
    </div>
  );
};

export default ProductTable;
