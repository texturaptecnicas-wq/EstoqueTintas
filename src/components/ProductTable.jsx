
import React, { useRef, useState, useMemo, memo, forwardRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Pencil, Trash2, Plus, Columns, Minus, Loader2, Settings2, History, Trash, AlertTriangle, RefreshCw, Box, Bug, MoveHorizontal, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StockAlert from '@/components/StockAlert';
import AddColumnModal from '@/components/AddColumnModal';
import AddProductModal from '@/components/AddProductModal';
import ColumnEditor from '@/components/ColumnEditor';
import PriceHistoryModal from '@/components/PriceHistoryModal';
import ColumnWidthModal from '@/components/ColumnWidthModal';
import ColorizeModal from '@/components/ColorizeModal';
import ColorLegend from '@/components/ColorLegend';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { formatValue } from '@/utils/formatValue';
import { supabase } from '@/lib/customSupabaseClient';
import { validateStockData } from '@/utils/validateStockData';
import { verifyPriceHistory } from '@/utils/priceHistoryDebug';
import { validateProductData } from '@/utils/validateProductData';
import { parseBRNumber } from '@/utils/numberParser.js';

// --- CONSTANTS ---
const ROW_HEIGHT = 72;
const HEADER_HEIGHT = 56;
const DEFAULT_COL_WIDTH = 220; 
const MIN_COL_WIDTH = 150;
const ACTIONS_COL_WIDTH = 210; // Increased to fit Paint button
const CAIXA_COL_WIDTH = 160;

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

const HeaderCell = memo(({ col, colWidth, alignClass, onColumnWidthChange, onEditColumn, onOpenWidthModal }) => {
    const [isResizing, setIsResizing] = useState(false);
    const [tempWidth, setTempWidth] = useState(colWidth);

    useEffect(() => {
        if (!isResizing) {
            setTempWidth(colWidth);
        }
    }, [colWidth, isResizing]);

    const handleResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        
        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startWidth = colWidth;

        const handleMove = (moveEvent) => {
            const clientX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = clientX - startX;
            const newWidth = Math.max(startWidth + deltaX, MIN_COL_WIDTH);
            setTempWidth(newWidth);
            onColumnWidthChange(col.key, newWidth);
        };

        const handleEnd = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    return (
        <div 
            className={cn("flex items-center font-bold text-sm text-gray-600 uppercase tracking-wide group select-none whitespace-nowrap border-r border-gray-100/50 h-full relative px-6 bg-gray-50/95 transition-colors hover:bg-gray-100/80", alignClass)}
            style={{ width: colWidth, minWidth: colWidth }}
        >
            <div className={cn("flex items-center w-full h-full gap-2 cursor-pointer transition-colors", alignClass)} onClick={() => onEditColumn(col)}>
                <span className="truncate">{col.label}</span>
                <Settings2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all shrink-0" />
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onOpenWidthModal(col); }}
                className="absolute right-5 p-1.5 opacity-40 md:opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all z-10"
                title="Ajustar Largura (Menu)"
            >
                <MoveHorizontal className="w-4 h-4" />
            </button>
            
            <div 
                className="absolute right-[-18px] top-0 bottom-0 w-[36px] cursor-col-resize flex justify-center items-center z-30 touch-none group/resizer"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
            >
                <div className={cn(
                    "w-1.5 h-1/2 rounded-full transition-all duration-200", 
                    isResizing ? "bg-blue-500 scale-y-125" : "bg-gray-300 opacity-0 group-hover:opacity-100 group-hover/resizer:bg-blue-400 group-hover/resizer:scale-y-110"
                )} />
                
                {isResizing && (
                    <div className="absolute top-[-35px] left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium px-2.5 py-1 rounded shadow-md whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in duration-150">
                        {Math.round(tempWidth)} px
                    </div>
                )}
            </div>
        </div>
    );
});
HeaderCell.displayName = 'HeaderCell';


const CaixaToggleCell = ({ product, onUpdateProduct }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleCaixa = async (e) => {
        e.stopPropagation();
        if (isLoading) return;
        
        setIsLoading(true);
        try {
            await onUpdateProduct(product.id, { caixa_aberta: !product.caixa_aberta });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleMeia = async (e, value) => {
        e.stopPropagation();
        if (isLoading || product.meia_caixa === value) return;

        setIsLoading(true);
        try {
            await onUpdateProduct(product.id, { meia_caixa: value });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 justify-center w-full h-full px-2" onClick={e => e.stopPropagation()}>
            <button
                onClick={handleToggleCaixa}
                disabled={isLoading}
                className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 border-2 shrink-0",
                    product.caixa_aberta 
                        ? "bg-orange-100 border-orange-400 text-orange-600 shadow-sm" 
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-100",
                    isLoading && "opacity-50 cursor-not-allowed"
                )}
                title={product.caixa_aberta ? "Caixa Aberta" : "Caixa Fechada"}
            >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Box className={cn("w-5 h-5", product.caixa_aberta && "fill-orange-200")} />
                )}
            </button>

            {product.caixa_aberta && (
                <div className="flex flex-col gap-1 w-[88px] shrink-0">
                    <button
                        onClick={(e) => handleToggleMeia(e, false)}
                        disabled={isLoading}
                        className={cn("text-[9px] py-1 px-1.5 rounded font-bold border leading-tight transition-colors flex items-center justify-center shadow-sm", !product.meia_caixa ? "bg-green-600 text-white border-green-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}
                    >
                        + Meia
                    </button>
                    <button
                        onClick={(e) => handleToggleMeia(e, true)}
                        disabled={isLoading}
                        className={cn("text-[9px] py-1 px-1.5 rounded font-bold border leading-tight transition-colors flex items-center justify-center shadow-sm", product.meia_caixa ? "bg-red-500 text-white border-red-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}
                    >
                        - Meia
                    </button>
                </div>
            )}
        </div>
    );
};

const NumericCellControl = memo(({ value, productId, columnKey, type, format, onUpdate, alignClass }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const rawValue = parseFloat(value);
  const currentValue = isNaN(rawValue) ? 0 : rawValue;
  
  const effectiveFormat = format || type;

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
    <div className={cn("flex items-center gap-3 w-full h-full py-2", alignClass)} onClick={e => e.stopPropagation()}>
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
             {formatValue(currentValue, effectiveFormat)}
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
}, (prev, next) => prev.value === next.value && prev.productId === next.productId && prev.format === next.format && prev.alignClass === next.alignClass);
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
     
     const effectiveFormat = column.format || column.type;
     let finalValue = localValue;
     
     if (['number', 'currency', 'percentage', 'stock'].includes(effectiveFormat) || column.key === 'estoque' || column.key === 'lote_minimo') {
         finalValue = Number(parseBRNumber(localValue));
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
    if (!saving) {
        onCancel();
    }
  };

  return (
    <div className="w-full">
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
  const { products, columns, getActualColumnWidth, onEdit, onDelete, onUpdate, onPaint, totalWidth, headerHeight, error, retry, editingCell, onCellEdit, onCellSave, onCellCancel } = data;
  
  const rowStyle = { 
    ...style, 
    width: totalWidth,
    top: parseFloat(style.top) + headerHeight 
  };

  if (index >= products.length) {
      return (
        <div style={rowStyle} className="px-6 flex items-center justify-center border-b border-gray-200 bg-gray-50/50">
             {error ? (
                <div className="flex items-center gap-3 text-red-600 py-2">
                   <AlertTriangle className="w-5 h-5" />
                   <span className="font-medium text-sm">Erro ao carregar mais itens.</span>
                   <Button variant="outline" size="sm" onClick={retry} className="h-8 ml-2 border-red-200 hover:bg-red-50 text-red-700">
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
  if (!product) return null;

  const validatedProductWrapper = validateProductData(product);

  const isEven = index % 2 === 0;

  const { shouldShowAlert: isLowStock } = validateStockData(validatedProductWrapper.validated.estoque, validatedProductWrapper.validated.lote_minimo, product.caixa_aberta, product.meia_caixa);
  const isCaixaAberta = product.caixa_aberta;

  // Determine row background color based on color_data
  const hasRowColor = product.color_data && !product.color_data.column;
  const rowColorStyle = hasRowColor ? { backgroundColor: `${product.color_data.color}33` } : {};

  let bgClass = isEven ? "bg-white" : "bg-gray-50";
  if (hasRowColor) {
    bgClass = ""; // Remove default background if custom color is applied
  } else if (isCaixaAberta) {
    bgClass = "bg-[#FFE4CC] hover:bg-[#FFE4CC]/90";
  } else if (isLowStock) {
    bgClass = "bg-red-50/40 hover:bg-red-100/40";
  }

  return (
    <div style={{...rowStyle, ...rowColorStyle}} className={cn("flex items-center border-b border-gray-200 transition-colors group", bgClass, !isCaixaAberta && !isLowStock && !hasRowColor && "hover:bg-blue-50/20")}>
      {columns.map((col, idx) => {
        const isEditing = editingCell?.id === product.id && editingCell?.field === col.key;
        const isReadOnly = ['id', 'created_at', 'updated_at'].includes(col.key);
        
        const effectiveFormat = col.format || col.type || 'text';
        
        const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(effectiveFormat) || col.key === 'stock';
        const width = getActualColumnWidth(col);
        
        const alignClass = !col.align 
            ? (isNumeric ? 'justify-center text-center' : 'justify-start text-left')
            : (col.align === 'left' ? 'justify-start text-left' : 
               col.align === 'right' ? 'justify-end text-right' : 
               'justify-center text-center');

        const cellStyle = { width, minWidth: width };
        const cellValue = product[col.key] ?? product.data?.[col.key];

        // Check if this specific cell has a color
        const hasCellColor = product.color_data && product.color_data.column === col.key;
        const cellColorStyle = hasCellColor ? { backgroundColor: `${product.color_data.color}33` } : {};

        return (
          <div key={col.key} style={{...cellStyle, ...cellColorStyle}} className={cn("h-full relative flex items-center", alignClass, isEditing ? "px-2" : "px-6")}>
            {isEditing ? (
                <InlineEditInput 
                    value={cellValue}
                    column={col}
                    onSave={(val) => onCellSave(product.id, col.key, val)}
                    onCancel={onCellCancel}
                />
            ) : isNumeric ? (
               <div className="w-full h-full" onDoubleClick={(e) => { if (!isReadOnly) { e.stopPropagation(); onCellEdit(product.id, col.key); }}}>
                   <NumericCellControl
                     value={cellValue}
                     productId={product.id}
                     columnKey={col.key}
                     type={col.type} 
                     format={effectiveFormat}
                     onUpdate={onUpdate}
                     alignClass={alignClass}
                   />
               </div>
            ) : (
               <div className={cn("flex items-center gap-1.5 w-full h-full cursor-text overflow-hidden", alignClass)} onDoubleClick={(e) => { if (!isReadOnly) { e.stopPropagation(); onCellEdit(product.id, col.key); }}}>
                  {idx === 0 && <StockAlert product={product} />}
                  <span className={cn("text-[15px] leading-normal truncate select-none", isCaixaAberta ? "text-orange-900" : "text-gray-700", idx === 0 && (isCaixaAberta ? "font-bold text-orange-950" : "font-semibold text-gray-900"))}>
                    {formatValue(cellValue, effectiveFormat)}
                  </span>
               </div>
            )}
          </div>
        );
      })}

      <div style={{ width: CAIXA_COL_WIDTH, minWidth: CAIXA_COL_WIDTH }} className="flex items-center justify-center h-full border-l border-gray-200/50">
          <CaixaToggleCell product={product} onUpdateProduct={onUpdate} />
      </div>

      <div style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} className={cn("flex items-center justify-center gap-1 h-full ml-auto border-l border-gray-200/50 backdrop-blur-sm px-2", isCaixaAberta ? "bg-[#FFE4CC]/50" : (isEven ? "bg-white/50" : "bg-gray-50/50"))}>
        <button onClick={() => onPaint(product)} className="p-2 hover:bg-purple-100 text-gray-400 hover:text-purple-700 rounded-full transition-all active:scale-95" title="Colorir">
          <Paintbrush className="w-4 h-4" />
        </button>
        <button onClick={() => { verifyPriceHistory(product.id, product.name || 'Desconhecido'); }} className="p-2 hover:bg-indigo-100 text-gray-400 hover:text-indigo-700 rounded-full transition-all active:scale-95" title="Debug Histórico no Console">
          <Bug className="w-4 h-4" />
        </button>
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
  products, category, onEdit, onDelete, onAddColumn, onUpdateColumn, onAddProduct, onProductUpdate, onUpdateProductColor, loadMore, retryLoadMore, hasMore, onDeleteAll, isDeletingAll, error 
}) => {
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [widthModalCol, setWidthModalCol] = useState(null);
  const [colorizeProduct, setColorizeProduct] = useState(null);
  const [columnWidths, setColumnWidths] = useState(() => { try { return JSON.parse(localStorage.getItem('columnWidths')) || {}; } catch { return {}; } });
  
  const { toast } = useToast();

  useEffect(() => { localStorage.setItem('columnWidths', JSON.stringify(columnWidths)); }, [columnWidths]);

  const handleClearCategory = () => { if (window.confirm("Tem certeza que deseja limpar esta categoria? Isso não pode ser desfeito.")) { onDeleteAll(); } };

  const handleCellEditStart = (id, field) => { setEditingCell({ id, field }); };
  const handleCellEditCancel = () => { setEditingCell(null); };

  const handleCellEditSave = async (id, field, value) => {
      try {
          let finalValue = value;
          if (field === 'cor' && typeof value === 'string') {
              finalValue = value.replace(/[\p{Emoji}]/gu, '').replace(/\u200D/g, '').trim();
          }

          if (field === 'estoque' || field === 'lote_minimo') {
              finalValue = Number(parseBRNumber(value));
              console.log('ProductTable saving:', { [field]: finalValue });
          }

          await onProductUpdate(id, { [field]: finalValue });
          setEditingCell(null);
      } catch (err) {
          console.error("[ProductTable] Failed to save inline cell edit:", err);
          toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      }
  };

  const handleApplyColor = async (productId, colorData) => {
    try {
      await onUpdateProductColor(productId, colorData);
      setColorizeProduct(null);
    } catch (error) {
      console.error('Failed to apply color:', error);
    }
  };

  const handleColumnWidthChange = useCallback((colKey, newWidth) => { setColumnWidths(prev => ({ ...prev, [colKey]: newWidth })); }, []);

  const visibleColumns = useMemo(() => { return category ? category.columns.filter(col => col.visible !== false) : []; }, [category]);

  const getActualColumnWidth = useCallback((col) => {
    if (columnWidths[col.key]) return Math.max(columnWidths[col.key], MIN_COL_WIDTH);
    return getColumnWidth(col);
  }, [columnWidths]);

  const totalWidth = useMemo(() => {
     const colsWidth = visibleColumns.reduce((acc, col) => acc + getActualColumnWidth(col), 0);
     return colsWidth + ACTIONS_COL_WIDTH + CAIXA_COL_WIDTH; 
  }, [visibleColumns, getActualColumnWidth]);

  const InnerElement = useMemo(() => forwardRef(({ style, ...rest }, ref) => {
    const { height } = style;
    const contentHeight = parseFloat(height) + HEADER_HEIGHT;
    
    return (
        <div ref={ref} style={{ ...style, height: contentHeight, width: totalWidth, minWidth: '100%', position: 'relative' }} {...rest}>
            <div className="flex absolute top-0 left-0 border-b border-gray-200 bg-gray-50/95 z-20" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
                {visibleColumns.map((col) => {
                  const effectiveFormat = col.format || col.type || 'text';
                  const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(effectiveFormat) || col.key === 'stock';
                  const colWidth = getActualColumnWidth(col);
                  
                  const alignClass = !col.align 
                      ? (isNumeric ? 'justify-center text-center' : 'justify-start text-left')
                      : (col.align === 'left' ? 'justify-start text-left' : 
                         col.align === 'right' ? 'justify-end text-right' : 
                         'justify-center text-center');
                  
                  return (
                      <HeaderCell 
                          key={col.key}
                          col={col}
                          colWidth={colWidth}
                          alignClass={alignClass}
                          onColumnWidthChange={handleColumnWidthChange}
                          onEditColumn={setEditingColumn}
                          onOpenWidthModal={setWidthModalCol}
                      />
                  );
                })}
                <div style={{ width: CAIXA_COL_WIDTH, minWidth: CAIXA_COL_WIDTH }} className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide border-l border-gray-200 h-full px-2 text-center">Caixa Aberta</div>
                <div style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide px-6 border-l border-gray-200 h-full text-center">Ações</div>
            </div>
            {rest.children}
        </div>
    );
  }), [totalWidth, visibleColumns, getActualColumnWidth, handleColumnWidthChange]);
  InnerElement.displayName = 'InnerElement';

  if (!category) return <div className="p-4 text-center">Selecione uma categoria</div>;

  return (
    <ErrorBoundary>
      <div className="space-y-4 h-full flex flex-col">
        <ColorLegend />

        <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Itens em Estoque</h2>
            <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-semibold shadow-sm">{products.length} itens</span>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleClearCategory} variant="destructive" size="sm" disabled={isDeletingAll || products.length === 0} className="h-10 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium">
               {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash className="w-4 h-4 mr-2" />} Limpar
            </Button>
            <Button onClick={() => setIsColumnModalOpen(true)} variant="outline" size="sm" className="h-10 px-4 border-dashed border-gray-300 text-gray-600 hover:text-blue-600 hover:bg-blue-50">
              <Columns className="w-4 h-4 mr-2" /> Colunas
            </Button>
            <Button onClick={() => setIsProductModalOpen(true)} size="sm" className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium">
              <Plus className="w-4 h-4 mr-2" /> Novo Item
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative touch-pan-x touch-pan-y">
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
                      products, columns: visibleColumns, getActualColumnWidth,
                      onEdit: (p, action) => action === 'history' ? setHistoryProduct(p) : onEdit(p),
                      onDelete, onUpdate: onProductUpdate, onPaint: setColorizeProduct, totalWidth, headerHeight: HEADER_HEIGHT, error, retry: retryLoadMore, editingCell,
                      onCellEdit: handleCellEditStart, onCellSave: handleCellEditSave, onCellCancel: handleCellEditCancel
                   }}
                   onItemsRendered={({ visibleStopIndex }) => { if (hasMore && !error && visibleStopIndex >= products.length - 5) { loadMore(); } }}
                 >
                   {VirtualRow}
                 </List>
               )}
             </AutoSizer>
           </div>
        </div>

        <AddColumnModal isOpen={isColumnModalOpen} onClose={() => setIsColumnModalOpen(false)} onSave={(newColumn) => { if(onAddColumn) onAddColumn(newColumn); toast({ title: "Coluna adicionada" }); }} />
        <ColumnEditor isOpen={!!editingColumn} onClose={() => setEditingColumn(null)} column={editingColumn} onSave={(updatedColumn) => { if(onUpdateColumn) onUpdateColumn(updatedColumn); toast({ title: "Coluna atualizada" }); }} />
        <PriceHistoryModal isOpen={!!historyProduct} onClose={() => setHistoryProduct(null)} product={historyProduct} />
        <AddProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={(data) => onAddProduct(data)} category={category} />
        <ColumnWidthModal isOpen={!!widthModalCol} onClose={() => setWidthModalCol(null)} column={widthModalCol} currentWidth={widthModalCol ? getActualColumnWidth(widthModalCol) : 0} onSave={handleColumnWidthChange} />
        <ColorizeModal 
          isOpen={!!colorizeProduct} 
          onClose={() => setColorizeProduct(null)} 
          product={colorizeProduct} 
          columns={visibleColumns}
          onApply={handleApplyColor}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ProductTable;
