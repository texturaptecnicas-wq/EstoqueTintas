
import React, { useRef, useState, useMemo, memo, forwardRef, useEffect } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Pencil, Trash2, Plus, Columns, Minus, Loader2, Settings2, History, Trash, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WhatsAppButton from '@/components/WhatsAppButton';
import AddColumnModal from '@/components/AddColumnModal';
import AddProductModal from '@/components/AddProductModal';
import ColumnEditor from '@/components/ColumnEditor';
import PriceHistoryModal from '@/components/PriceHistoryModal';
import SkeletonLoader from '@/components/SkeletonLoader';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- CONSTANTS ---
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 56;
const DEFAULT_COL_WIDTH = 220; 
const MIN_COL_WIDTH = 150;
const ACTIONS_COL_WIDTH = 140;

const getColumnWidth = (col) => {
  if (col.key === 'name' || col.key === 'product' || col.label?.toLowerCase().includes('produto') || col.label?.toLowerCase().includes('nome')) {
       return Math.max(parseInt(col.width) || 400, 350);
  }
  const width = parseInt(col.width) || DEFAULT_COL_WIDTH;
  return Math.max(width, MIN_COL_WIDTH);
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ProductTable Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Algo deu errado na tabela</h3>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      >
        <Minus className="h-4 w-4" />
      </button>
      
      <div className="flex-1 text-center font-semibold text-gray-800 text-[15px] min-w-[4rem]">
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-600" /> : (
           <span className="whitespace-nowrap">
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
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}, (prev, next) => prev.value === next.value && prev.productId === next.productId);
NumericCellControl.displayName = 'NumericCellControl';

const InlineEditInput = ({ value, column, onSave, onCancel }) => {
  const [localValue, setLocalValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
     if (saving) return;
     
     let finalValue = localValue;
     if (['number', 'currency', 'percentage', 'stock'].includes(column.type)) {
         // Replace comma with dot for parsing
         const valStr = localValue.toString().replace(',', '.');
         if (valStr.trim() === '') {
             finalValue = 0;
         } else {
             const num = parseFloat(valStr);
             if (isNaN(num)) {
                 toast({ 
                     title: "Valor inválido", 
                     description: "Por favor insira um número válido.", 
                     variant: "destructive" 
                 });
                 return;
             }
             finalValue = num;
         }
     } else {
         if (typeof localValue === 'string') {
             finalValue = localValue.trim();
         }
     }

     setSaving(true);
     try {
         await onSave(finalValue);
     } catch(e) {
         setSaving(false);
         // Error handled by parent usually
     }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Click outside to cancel as requested
    if (!saving) onCancel();
  };

  return (
    <div className="w-full px-2">
        <Input 
            ref={inputRef}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={saving}
            className={cn(
                "h-9 w-full shadow-sm border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200",
                saving && "opacity-50"
            )}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-blue-600" />}
    </div>
  );
};


// --- ROW COMPONENT (Virtual) ---
const VirtualRow = memo(({ data, index, style }) => {
  const { products, columns, onEdit, onDelete, onUpdate, totalWidth, headerHeight, error, retry, editingCell, onCellEdit, onCellSave, onCellCancel } = data;
  
  const rowStyle = { 
    ...style, 
    width: totalWidth,
    top: parseFloat(style.top) + headerHeight 
  };

  // --- LOADER / ERROR ROW ---
  if (index >= products.length) {
      return (
        <div style={rowStyle} className="px-6 flex items-center justify-center border-b border-gray-200 bg-gray-50/50">
             {error ? (
                <div className="flex items-center gap-3 text-red-600 py-2">
                   <AlertTriangle className="w-5 h-5" />
                   <span className="font-medium text-sm">Erro ao carregar mais itens.</span>
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={retry} 
                     className="h-8 ml-2 border-red-200 hover:bg-red-50 text-red-700"
                   >
                     <RefreshCw className="w-3.5 h-3.5 mr-2" /> Tentar Novamente
                   </Button>
                </div>
             ) : (
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Carregando itens...</span>
                </div>
             )}
        </div>
      );
  }

  const product = products[index];
  if (!product) return null; // Safety

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
    >
      {columns.map((col, idx) => {
        // We use NumericCellControl for stock/currency ONLY if explicitly numeric AND we want the +/- buttons.
        // For standard inline editing of ALL fields, we might want to skip NumericCellControl or keep it for specific UX.
        // The prompt asks for double-click edit functionality. NumericCellControl doesn't support double click well (it has buttons).
        // Let's keep NumericCellControl for 'stock' and 'currency' as they are highly specialized, 
        // OR we can make them double-clickable too if we click the text part.
        
        // Actually, NumericCellControl has `onClick={e => e.stopPropagation()}` on the wrapper. 
        // This prevents double click bubbling.
        // Let's modify logic: 
        // If it's being edited inline, show input.
        // If not, show display value (or NumericCellControl).
        
        const isEditing = editingCell?.id === product.id && editingCell?.field === col.key;
        const isReadOnly = ['id', 'created_at', 'updated_at'].includes(col.key);
        
        const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(col.type) || col.key === 'stock';
        const width = getColumnWidth(col);
        const alignClass = !col.align 
            ? (isNumeric ? 'justify-center text-center' : 'justify-start text-left')
            : (col.align === 'left' ? 'justify-start text-left' : 
               col.align === 'right' ? 'justify-end text-right' : 
               'justify-center text-center');

        const cellStyle = { width, minWidth: width, padding: isEditing ? '0' : '0 1.5rem' };
        const cellValue = product[col.key];
        const displayValue = col.type === 'date' && cellValue 
            ? new Date(cellValue).toLocaleDateString('pt-BR') 
            : (cellValue || '-');

        return (
          <div key={col.key} style={cellStyle} className={cn("h-full relative flex items-center", alignClass)}>
            {isEditing ? (
                <InlineEditInput 
                    value={cellValue}
                    column={col}
                    onSave={(val) => onCellSave(product.id, col.key, val)}
                    onCancel={onCellCancel}
                />
            ) : isNumeric ? (
               // Wrapper to handle double click for numeric cells (clicking the text area)
               <div 
                 className="w-full h-full" 
                 onDoubleClick={(e) => {
                     if (!isReadOnly) {
                         e.stopPropagation();
                         onCellEdit(product.id, col.key);
                     }
                 }}
               >
                   <NumericCellControl
                     value={cellValue}
                     productId={product.id}
                     columnKey={col.key}
                     type={col.type}
                     onUpdate={onUpdate}
                   />
               </div>
            ) : (
               <div 
                 className={cn("flex items-center gap-3 w-full h-full cursor-text", alignClass)}
                 onDoubleClick={(e) => {
                     if (!isReadOnly) {
                        e.stopPropagation();
                        onCellEdit(product.id, col.key);
                     }
                 }}
               >
                  {idx === 0 && isLowStock && (
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0 shadow-sm" title="Estoque Baixo" />
                  )}
                  <span className={cn("text-[15px] text-gray-700 leading-normal whitespace-nowrap select-none", idx === 0 && "font-semibold text-gray-900")}>
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
        <button onClick={() => onEdit(product, 'history')} className="p-2 hover:bg-yellow-100 text-gray-400 hover:text-yellow-700 rounded-full transition-all active:scale-95">
          <History className="w-4 h-4" />
        </button>
        <button onClick={() => onEdit(product, 'edit')} className="p-2 hover:bg-blue-100 text-gray-400 hover:text-blue-700 rounded-full transition-all active:scale-95">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(product.id)} className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-700 rounded-full transition-all active:scale-95">
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
  retryLoadMore, 
  hasMore,
  onDeleteAll,
  isDeletingAll,
  error 
}) => {
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  
  // Inline Edit State
  const [editingCell, setEditingCell] = useState(null); // { id: string, field: string }
  
  const { toast } = useToast();

  const handleClearCategory = () => {
      if (window.confirm("Tem certeza que deseja limpar esta categoria? Isso não pode ser desfeito.")) {
          onDeleteAll();
      }
  };

  const handleCellEditStart = (id, field) => {
      setEditingCell({ id, field });
  };

  const handleCellEditCancel = () => {
      setEditingCell(null);
  };

  const handleCellEditSave = async (id, field, value) => {
      try {
          await onProductUpdate(id, { [field]: value });
          setEditingCell(null);
      } catch (err) {
          console.error("Save error", err);
          toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      }
  };

  const visibleColumns = useMemo(() => {
    return category ? category.columns.filter(col => col.visible !== false) : [];
  }, [category]);

  const totalWidth = useMemo(() => {
     const colsWidth = visibleColumns.reduce((acc, col) => acc + getColumnWidth(col), 0);
     return colsWidth + ACTIONS_COL_WIDTH; 
  }, [visibleColumns]);

  const InnerElement = useMemo(() => forwardRef(({ style, ...rest }, ref) => {
    const { height } = style;
    const contentHeight = parseFloat(height) + HEADER_HEIGHT;
    return (
        <div ref={ref} style={{ ...style, height: contentHeight, width: totalWidth, minWidth: '100%', position: 'relative' }} {...rest}>
            <div className="flex absolute top-0 left-0 border-b border-gray-200 bg-gray-50/95 z-20" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
                {visibleColumns.map((col) => {
                  const colWidth = getColumnWidth(col);
                  const alignClass = col.align === 'left' ? 'justify-start pl-6' : col.align === 'right' ? 'justify-end pr-6' : 'justify-center';
                  
                  return (
                    <div 
                       key={col.key}
                       className={cn("flex items-center font-bold text-sm text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap border-r border-gray-100/50 h-full", alignClass)}
                       style={{ width: colWidth, minWidth: colWidth }}
                       onClick={() => setEditingColumn(col)}
                    >
                       {col.label} <Settings2 className="w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-100 text-gray-400 transition-all" />
                    </div>
                  );
                })}
                <div style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide px-6 border-l border-gray-200 h-full">Ações</div>
            </div>
            {rest.children}
        </div>
    );
  }), [totalWidth, visibleColumns]);
  InnerElement.displayName = 'InnerElement';

  if (!category) return <div className="p-4 text-center">Selecione uma categoria</div>;

  return (
    <ErrorBoundary>
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Itens em Estoque</h2>
            <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-semibold shadow-sm">{products.length} itens</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
               onClick={handleClearCategory}
               variant="destructive"
               size="sm"
               disabled={isDeletingAll || products.length === 0}
               className="h-10 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
            >
               {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash className="w-4 h-4 mr-2" />}
               Limpar
            </Button>
            <Button onClick={() => setIsColumnModalOpen(true)} variant="outline" size="sm" className="h-10 px-4 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:bg-blue-50">
              <Columns className="w-4 h-4 mr-2" /> Colunas
            </Button>
            <Button onClick={() => setIsProductModalOpen(true)} size="sm" className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="w-4 h-4 mr-2" /> Novo Item
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
           <div className="flex-1 w-full min-h-[400px]">
             <AutoSizer>
               {({ height, width }) => (
                 <List
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
                      headerHeight: HEADER_HEIGHT,
                      error,          
                      retry: retryLoadMore,
                      // Inline Editing Props
                      editingCell,
                      onCellEdit: handleCellEditStart,
                      onCellSave: handleCellEditSave,
                      onCellCancel: handleCellEditCancel
                   }}
                   onItemsRendered={({ visibleStopIndex }) => {
                      if (hasMore && !error && visibleStopIndex >= products.length - 5) {
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
    </ErrorBoundary>
  );
};

export default ProductTable;
