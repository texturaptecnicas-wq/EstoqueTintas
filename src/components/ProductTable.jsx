
import React, { useRef, useState, useMemo, memo, forwardRef } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Pencil, Trash2, Plus, Columns, Minus, Loader2, Settings2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WhatsAppButton from '@/components/WhatsAppButton';
import AddColumnModal from '@/components/AddColumnModal';
import AddProductModal from '@/components/AddProductModal';
import ColumnEditor from '@/components/ColumnEditor';
import PriceHistoryModal from '@/components/PriceHistoryModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// --- CONSTANTS ---
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 56;
const DEFAULT_COL_WIDTH = 220; 
const MIN_COL_WIDTH = 150;
const ACTIONS_COL_WIDTH = 140;

// Helper to safely get column width
const getColumnWidth = (col) => {
  if (col.key === 'name' || col.key === 'product' || col.label?.toLowerCase().includes('produto') || col.label?.toLowerCase().includes('nome')) {
       return Math.max(parseInt(col.width) || 400, 350);
  }
  const width = parseInt(col.width) || DEFAULT_COL_WIDTH;
  return Math.max(width, MIN_COL_WIDTH);
};

// --- CELL COMPONENTS ---

const NumericCellControl = memo(({ value, productId, columnKey, type, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const rawValue = parseFloat(value);
  const currentValue = isNaN(rawValue) ? 0 : rawValue;

  const handleUpdate = async (newValue) => {
    if (newValue < 0 || isUpdating) return;
    setIsUpdating(true);
    try {
      await onUpdate(productId, { [columnKey]: newValue });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 w-full h-full py-2" onClick={e => e.stopPropagation()}>
      <button
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-50 transition-all shadow-sm active:scale-95 shrink-0"
        disabled={isUpdating || currentValue <= 0}
        onClick={() => handleUpdate(Math.max(0, currentValue - 1))}
        title="Diminuir"
      >
        <Minus className="h-4 w-4" />
      </button>
      
      <div className="flex-1 text-center font-semibold text-gray-800 text-[15px] min-w-[4rem]">
        {isUpdating ? (
           <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-600" />
        ) : (
           <span title={currentValue.toString()} className="whitespace-nowrap">
             {type === 'currency' && 'R$ '}
             {currentValue.toLocaleString('pt-BR', { 
               minimumFractionDigits: type === 'currency' ? 2 : (Number.isInteger(currentValue) ? 0 : 2),
               maximumFractionDigits: 2 
             })}
             {type === 'percentage' && '%'}
           </span>
        )}
      </div>

      <button
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-green-50 text-gray-500 hover:text-green-600 disabled:opacity-50 transition-all shadow-sm active:scale-95 shrink-0"
        disabled={isUpdating}
        onClick={() => handleUpdate(currentValue + 1)}
        title="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}, (prev, next) => prev.value === next.value && prev.productId === next.productId);
NumericCellControl.displayName = 'NumericCellControl';

// --- ROW COMPONENT (Virtual) ---

const VirtualRow = memo(({ data, index, style }) => {
  const { products, columns, onEdit, onDelete, onUpdate, totalWidth, headerHeight } = data;
  
  // Offset row position by header height
  const rowStyle = { 
    ...style, 
    width: totalWidth,
    top: parseFloat(style.top) + headerHeight 
  };

  if (!products[index]) {
      return (
        <div style={rowStyle} className="px-6 flex items-center gap-4 border-b border-gray-200 bg-white">
             <SkeletonLoader height="40px" />
        </div>
      );
  }

  const product = products[index];
  const isEven = index % 2 === 0;

  const isLowStock = (() => {
      const stock = parseFloat(product.stock);
      const min = parseFloat(product.minimum_batch);
      return (!isNaN(stock) && !isNaN(min) && stock <= min);
  })();

  return (
    <div 
      style={rowStyle} 
      className={cn(
        "flex items-center border-b border-gray-200 transition-colors hover:bg-blue-50/20 group",
        isEven ? "bg-white" : "bg-gray-50",
        isLowStock && "bg-red-50/40 hover:bg-red-100/40"
      )}
      role="row"
    >
      {columns.map((col, idx) => {
        const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(col.type) || col.key === 'stock';
        const width = getColumnWidth(col);
        
        const alignClass = !col.align 
            ? (isNumeric ? 'justify-center text-center' : 'justify-start text-left')
            : (col.align === 'left' ? 'justify-start text-left' : 
               col.align === 'right' ? 'justify-end text-right' : 
               'justify-center text-center');

        const cellStyle = { 
            width: width, 
            minWidth: width,
            padding: '0 1.5rem', // px-6
        };
        
        const cellValue = product[col.key];
        const displayValue = col.type === 'date' && cellValue 
            ? new Date(cellValue).toLocaleDateString('pt-BR') 
            : (cellValue || '-');

        return (
          <div 
            key={col.key} 
            style={cellStyle} 
            role="cell" 
            className={cn("h-full relative flex items-center", alignClass)}
          >
            {isNumeric ? (
               <NumericCellControl
                 value={cellValue}
                 productId={product.id}
                 columnKey={col.key}
                 type={col.type}
                 onUpdate={onUpdate}
               />
            ) : (
               <div className={cn("flex items-center gap-3 w-full", alignClass)}>
                  {idx === 0 && isLowStock && (
                     <div 
                        className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0 shadow-sm" 
                        title="Estoque Baixo"
                     />
                  )}
                  <span 
                    className={cn(
                        "text-[15px] text-gray-700 leading-normal whitespace-nowrap", 
                        idx === 0 && "font-semibold text-gray-900"
                    )}
                    title={typeof displayValue === 'string' ? displayValue : ''}
                  >
                    {displayValue}
                  </span>
                  {idx === 0 && isLowStock && (
                    <div className="ml-auto opacity-80 hover:opacity-100 transition-opacity pl-2">
                        <WhatsAppButton product={product} className="w-8 h-8" />
                    </div>
                  )}
               </div>
            )}
          </div>
        );
      })}

      <div 
        style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH, padding: '0 1rem' }} 
        className={cn(
            "flex items-center justify-center gap-2 h-full ml-auto border-l border-gray-200 backdrop-blur-sm",
            isEven ? "bg-white/50" : "bg-gray-50/50"
        )}
      >
        <button 
            onClick={() => onEdit(product, 'history')} 
            className="p-2 hover:bg-yellow-100 text-gray-400 hover:text-yellow-700 rounded-full transition-all active:scale-95"
            title="Histórico de Preços"
        >
          <History className="w-4 h-4" />
        </button>
        <button 
            onClick={() => onEdit(product, 'edit')} 
            className="p-2 hover:bg-blue-100 text-gray-400 hover:text-blue-700 rounded-full transition-all active:scale-95"
            title="Editar Produto"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button 
            onClick={() => onDelete(product.id)} 
            className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-700 rounded-full transition-all active:scale-95"
            title="Excluir Produto"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}, areEqual);

VirtualRow.displayName = 'VirtualRow';

// --- MAIN TABLE COMPONENT ---

const ProductTable = ({ 
  products, 
  category, 
  onEdit, 
  onDelete, 
  onAddColumn,
  onUpdateColumn,
  onAddProduct,
  onProductUpdate,
  loadMore,
  hasMore
}) => {
  const listRef = useRef(null);
  const outerRef = useRef(null);
  
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const { toast } = useToast();

  const visibleColumns = useMemo(() => {
    return category ? category.columns.filter(col => col.visible !== false) : [];
  }, [category]);

  const totalWidth = useMemo(() => {
     const colsWidth = visibleColumns.reduce((acc, col) => acc + getColumnWidth(col), 0);
     return colsWidth + ACTIONS_COL_WIDTH; 
  }, [visibleColumns]);

  // Inner Element including Header
  const InnerElement = useMemo(() => forwardRef(({ style, ...rest }, ref) => {
    const { height } = style;
    const contentHeight = parseFloat(height) + HEADER_HEIGHT;
    
    return (
        <div
            ref={ref}
            style={{
                ...style,
                height: contentHeight,
                width: totalWidth,
                minWidth: '100%',
                position: 'relative'
            }}
            {...rest}
        >
            {/* Header Row */}
            <div 
               className="flex absolute top-0 left-0 border-b border-gray-200 bg-gray-50/95 z-20" 
               style={{ width: totalWidth, height: HEADER_HEIGHT }}
            >
                {visibleColumns.map((col) => {
                  const colWidth = getColumnWidth(col);
                  const alignClass = !col.align 
                      ? 'justify-center text-center' 
                      : (col.align === 'left' ? 'justify-start text-left' : 
                         col.align === 'right' ? 'justify-end text-right' : 
                         'justify-center text-center');

                  return (
                    <div 
                       key={col.key}
                       className={cn(
                           "flex items-center font-bold text-sm text-gray-600 uppercase tracking-wide px-6 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap border-r border-gray-100/50 h-full",
                           alignClass
                       )}
                       style={{ width: colWidth, minWidth: colWidth }}
                       onClick={() => setEditingColumn(col)}
                       title={col.label}
                    >
                       <span className="whitespace-nowrap">{col.label}</span>
                       <Settings2 className="w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-100 text-gray-400 transition-all" />
                    </div>
                  );
                })}
                <div 
                  style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} 
                  className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide px-6 border-l border-gray-200 h-full"
                >
                   Ações
                </div>
            </div>
            
            {rest.children}
        </div>
    );
  }), [totalWidth, visibleColumns]);

  InnerElement.displayName = 'InnerElement';

  if (!category) return <div className="p-4 text-center">Selecione uma categoria</div>;

  return (
    <div className="space-y-4 h-full flex flex-col">
       {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">Itens em Estoque</h2>
          <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-semibold shadow-sm">
            {products.length} itens
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsColumnModalOpen(true)}
            variant="outline" 
            size="sm" 
            className="h-10 px-4 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:bg-blue-50 font-medium"
          >
            <Columns className="w-4 h-4 mr-2" />
            Configurar Colunas
          </Button>
          <Button 
            onClick={() => setIsProductModalOpen(true)}
            size="sm" 
            className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
         <div className="flex-1 w-full min-h-[400px]">
           <AutoSizer>
             {({ height, width }) => (
               <List
                 ref={listRef}
                 outerRef={outerRef}
                 className="overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
                 height={height}
                 width={width}
                 itemCount={products.length + (hasMore ? 1 : 0)}
                 itemSize={ROW_HEIGHT}
                 innerElementType={InnerElement}
                 itemData={{
                    products,
                    columns: visibleColumns,
                    onEdit: (p, action) => action === 'history' ? setHistoryProduct(p) : onEdit(p),
                    onDelete,
                    onUpdate: onProductUpdate,
                    totalWidth,
                    headerHeight: HEADER_HEIGHT
                 }}
                 onItemsRendered={({ visibleStopIndex }) => {
                    if (hasMore && visibleStopIndex >= products.length - 5) {
                        loadMore();
                    }
                 }}
               >
                 {VirtualRow}
               </List>
             )}
           </AutoSizer>
         </div>
      </div>

      <AddColumnModal 
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onSave={(newColumn) => { if(onAddColumn) onAddColumn(newColumn); toast({ title: "Coluna adicionada" }); }}
      />
      
      <ColumnEditor
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
        column={editingColumn}
        onSave={(updatedColumn) => { if(onUpdateColumn) onUpdateColumn(updatedColumn); toast({ title: "Coluna atualizada" }); }}
      />
      
      <PriceHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      <AddProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={(data) => onAddProduct(data)}
        category={category}
      />
    </div>
  );
};

export default ProductTable;
