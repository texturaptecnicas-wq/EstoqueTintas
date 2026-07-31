
import React, { useRef, useState, useMemo, memo, forwardRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, Plus, Columns, Minus, Loader2, Settings2, History, Trash, AlertTriangle, RefreshCw, Bug, MoveHorizontal, GripVertical, TrendingUp, Palette, Paintbrush, Undo, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StockAlert from '@/components/StockAlert.jsx';
import AddColumnModal from '@/components/AddColumnModal.jsx';
import AddProductModal from '@/components/AddProductModal.jsx';
import ColumnEditor from '@/components/ColumnEditor.jsx';
import PriceHistoryModal from '@/components/PriceHistoryModal.jsx';
import ColumnWidthModal from '@/components/ColumnWidthModal.jsx';
import CaixaAbertaCell from '@/components/CaixaAbertaCell.jsx';
import ColorCell from '@/components/ColorCell.jsx';
import ContextMenu from '@/components/ContextMenu.jsx';
import ColorLegendPanel from '@/components/ColorLegendPanel.jsx';
import ReorderAlertCell from '@/components/ReorderAlertCell.jsx';
import ReorderAlertEditor from '@/components/ReorderAlertEditor.jsx';
import { cn } from '@/lib/utils.js';
import { useToast } from '@/components/ui/use-toast.js';
import { formatValue } from '@/utils/formatValue.js';
import { validateStockData } from '@/utils/validateStockData.js';
import { verifyPriceHistory } from '@/utils/priceHistoryDebug.js';
import { validateProductData } from '@/utils/validateProductData.js';
import { parseBRNumber } from '@/utils/numberParser.js';
import { useDragDrop } from '@/contexts/DragDropManager.jsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useColorLegends } from '@/hooks/useColorLegends.js';
import { useCellColors } from '@/hooks/useCellColors.js';
import { usePaintingMode } from '@/contexts/PaintingModeContext.jsx';
import { useReorderAlert } from '@/hooks/useReorderAlert.js';
import { getCellStyle, getContrastTextColor } from '@/utils/ColorRenderer.js';

const ROW_HEIGHT = 80;
const HEADER_HEIGHT = 56;
const DEFAULT_COL_WIDTH = 220; 
const MIN_COL_WIDTH = 150;
const ACTIONS_COL_WIDTH = 210; 
const CAIXA_ABERTA_COL_WIDTH = 190;

const getColumnWidth = (col) => {
  if (col.key === 'name' || col.key === 'product' || col.label?.toLowerCase().includes('produto') || col.label?.toLowerCase().includes('nome')) {
       return Math.max(parseInt(col.width) || 400, 350);
  }
  if (col.type === 'alert_config' || col.key === 'prazo_recompra') return 180;
  if (col.type === 'date' || col.key === 'last_purchase_date') return 150;
  const width = parseInt(col.width) || DEFAULT_COL_WIDTH;
  return Math.max(width, MIN_COL_WIDTH);
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("ProductTable Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-red-50 rounded-xl border border-red-100">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Algo deu errado na tabela</h3>
          <Button variant="outline" onClick={() => window.location.reload()}>Recarregar Página</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SortableHeaderCell = memo(({ col, colWidth, alignClass, onColumnWidthChange, onEditColumn, onOpenWidthModal, onHeaderClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key });
    const [isResizing, setIsResizing] = useState(false);
    const [tempWidth, setTempWidth] = useState(colWidth);
    const { isPaintingMode, isDeleteMode } = usePaintingMode();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: colWidth,
        minWidth: colWidth
    };

    useEffect(() => { if (!isResizing) setTempWidth(colWidth); }, [colWidth, isResizing]);

    const handleResizeStart = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsResizing(true);
        const startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const startWidth = colWidth;
        const handleMove = (moveEvent) => {
            const clientX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const newWidth = Math.max(startWidth + (clientX - startX), MIN_COL_WIDTH);
            setTempWidth(newWidth); onColumnWidthChange(col.key, newWidth);
        };
        const handleEnd = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove); document.removeEventListener('touchend', handleEnd);
        };
        document.addEventListener('mousemove', handleMove); document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false }); document.addEventListener('touchend', handleEnd);
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            onClick={() => onHeaderClick(col.key)}
            className={cn("flex items-center font-bold text-sm text-gray-600 uppercase tracking-wide group select-none whitespace-nowrap border-r border-gray-100/50 h-full relative px-6 transition-colors", 
              alignClass, 
              isPaintingMode ? "hover:bg-blue-100 cursor-pointer bg-blue-50/50" : "",
              isDeleteMode ? "hover:bg-red-100 cursor-pointer bg-red-50/50" : "",
              (!isPaintingMode && !isDeleteMode) ? "bg-gray-50/95 hover:bg-gray-100/80" : ""
            )}
        >
            <button 
                {...attributes} 
                {...listeners}
                onClick={e => e.stopPropagation()}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing mr-2 shrink-0"
            >
                <GripVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            <div className={cn("flex items-center w-full h-full gap-2 cursor-pointer transition-colors", alignClass)} onClick={(e) => { if(!isPaintingMode && !isDeleteMode && col.key !== 'last_purchase_date' && col.key !== 'prazo_recompra') { e.stopPropagation(); onEditColumn(col); } }}>
                <span className="truncate">{col.label}</span>
                {!isPaintingMode && !isDeleteMode && col.key !== 'last_purchase_date' && col.key !== 'prazo_recompra' && <Settings2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all shrink-0" />}
            </div>
            
            {!isPaintingMode && !isDeleteMode && col.key !== 'last_purchase_date' && col.key !== 'prazo_recompra' && (
              <button 
                  onClick={(e) => { e.stopPropagation(); onOpenWidthModal(col); }}
                  className="absolute right-5 p-1.5 opacity-40 md:opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all z-10"
              >
                  <MoveHorizontal className="w-4 h-4" />
              </button>
            )}
            
            <div 
                className="absolute right-[-18px] top-0 bottom-0 w-[36px] cursor-col-resize flex justify-center items-center z-30 touch-none group/resizer"
                onMouseDown={handleResizeStart} onTouchStart={handleResizeStart}
                onClick={e => e.stopPropagation()}
            >
                <div className={cn("w-1.5 h-1/2 rounded-full transition-all duration-200", isResizing ? "bg-blue-500 scale-y-125" : "bg-gray-300 opacity-0 group-hover:opacity-100 group-hover/resizer:bg-blue-400 group-hover/resizer:scale-y-110")} />
            </div>
        </div>
    );
});
SortableHeaderCell.displayName = 'SortableHeaderCell';

const NumericCellControl = memo(({ value, productId, columnKey, type, format, onUpdate, alignClass }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const rawValue = parseFloat(value);
  const currentValue = isNaN(rawValue) ? 0 : rawValue;
  const effectiveFormat = format || type;

  const handleUpdate = async (newValue) => {
    if (newValue < 0 || isUpdating) return;
    setIsUpdating(true);
    try { await onUpdate(productId, { [columnKey]: newValue }); } catch (error) { console.error(error); } finally { setIsUpdating(false); }
  };

  return (
    <div className={cn("flex items-center gap-3 w-full h-full py-2", alignClass)} onClick={e => e.stopPropagation()}>
      <button
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 disabled:opacity-50 transition-all shadow-sm active:scale-95 shrink-0 relative z-20"
        disabled={isUpdating || currentValue <= 0} onClick={() => handleUpdate(Math.max(0, currentValue - 1))}
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex-1 text-center font-semibold text-gray-900 text-[15px] min-w-[4rem] relative z-20">
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-600" /> : <span className="whitespace-nowrap">{formatValue(currentValue, effectiveFormat)}</span>}
      </div>
      <button
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-green-50 text-gray-500 hover:text-green-600 disabled:opacity-50 transition-all shadow-sm active:scale-95 shrink-0 relative z-20"
        disabled={isUpdating} onClick={() => handleUpdate(currentValue + 1)}
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

  useEffect(() => { inputRef.current?.focus(); if(column.type !== 'date') inputRef.current?.select(); }, [column.type]);

  const handleSave = async () => {
     if (saving) return;
     const effectiveFormat = column.format || column.type;
     let finalValue = localValue;
     
     if (column.key === 'last_purchase_date' || column.type === 'date') {
       if (!localValue) {
           finalValue = null;
       } else {
           finalValue = new Date(localValue).toISOString();
       }
     } else if (['number', 'currency', 'percentage', 'stock'].includes(effectiveFormat) || column.key === 'estoque' || column.key === 'lote_minimo') {
         finalValue = Number(parseBRNumber(localValue));
     } else {
         if (typeof localValue === 'string') finalValue = localValue.trim();
     }
     
     setSaving(true);
     try { await onSave(finalValue); } catch(e) { setSaving(false); toast({ title: "Erro ao salvar", description: e.message || "Erro desconhecido", variant: "destructive" }); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSave(); else if (e.key === 'Escape') onCancel(); };
  const handleBlur = () => { if (!saving) onCancel(); };

  let inputType = 'text';
  if (column.type === 'date' || column.key === 'last_purchase_date') inputType = 'date';
  
  let displayValue = localValue;
  if (inputType === 'date' && localValue && localValue.includes('T')) {
      displayValue = localValue.split('T')[0];
  }

  return (
    <div className="w-full relative z-20">
        <Input 
            type={inputType}
            ref={inputRef} value={displayValue} onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown} onBlur={handleBlur} disabled={saving}
            className={cn("h-9 w-full shadow-sm border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 bg-white text-gray-900", saving && "opacity-50")}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-blue-600" />}
    </div>
  );
};

const customRowAreEqual = (prevProps, nextProps) => {
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.style.top !== nextProps.style.top) return false;

  const prevData = prevProps.data;
  const nextData = nextProps.data;
  
  if (prevData.totalWidth !== nextData.totalWidth) return false;
  if (prevData.isPaintingMode !== nextData.isPaintingMode) return false;
  if (prevData.isDeleteMode !== nextData.isDeleteMode) return false;
  
  const prevProduct = prevData.products[prevProps.index];
  const nextProduct = nextData.products[nextProps.index];
  
  if (prevProduct !== nextProduct) return false;
  
  const prevEditingId = prevData.editingCell?.id;
  const nextEditingId = nextData.editingCell?.id;
  if (prevEditingId === prevProduct?.id || nextEditingId === nextProduct?.id) {
    if (prevData.editingCell?.field !== nextData.editingCell?.field) return false;
    if (prevEditingId !== nextEditingId) return false;
  }

  return true;
};

const VirtualRow = memo(({ data, index, style }) => {
  const { 
    products, columns, getActualColumnWidth, onEdit, onDelete, onUpdate, onUpdateCaixaAberta, onUpdateMeiaCaixaStatus, totalWidth, headerHeight, error, retry, 
    editingCell, onCellEdit, onCellSave, onCellCancel, onOpenHistory, getCellColorsForCell, onContextMenu, isPaintingMode, isDeleteMode, onCellClick, onRowNumberClick
  } = data;
  
  const product = products[index];
  
  // Unconditional hook call at the top level
  const { needsReorder } = useReorderAlert(product);

  const rowStyle = { ...style, width: totalWidth, top: parseFloat(style.top) + headerHeight };

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

  if (!product) return null;

  const validatedProductWrapper = validateProductData(product);
  const isEven = index % 2 !== 0; 
  const { shouldShowAlert: isLowStock } = validateStockData(validatedProductWrapper.validated.estoque, validatedProductWrapper.validated.lote_minimo);

  let bgClass = isEven ? "bg-gray-100 hover:bg-gray-200/50" : "bg-white hover:bg-blue-50/20";
  if (product.caixa_aberta) bgClass = "bg-orange-100 hover:bg-orange-200/80";
  else if (isLowStock) bgClass = isEven ? "bg-red-100/40 hover:bg-red-200/40" : "bg-red-50/40 hover:bg-red-100/40";

  if (needsReorder) {
    bgClass = "alert-row-reorder";
  }

  const hasActiveMeiaCaixaStatus = product.meia_caixa_status === 'mais' || product.meia_caixa_status === 'menos' || product.meia_caixa_status === 'aberta';
  
  const rowColors = getCellColorsForCell(product.id, null);
  const rowStyleOverride = getCellStyle(rowColors);

  const blockClicksForSpecialModes = isPaintingMode || isDeleteMode;

  return (
    <div 
      key={product.id}
      style={{...rowStyle, ...rowStyleOverride}} 
      className={cn("flex items-center border-b border-gray-200 transition-all group", !rowColors.length && bgClass)}
      onContextMenu={(e) => { if(!blockClicksForSpecialModes){ e.preventDefault(); onContextMenu(e, product.id, null); } }}
    >
      {columns.map((col, idx) => {
        const isEditing = editingCell?.id === product.id && editingCell?.field === col.key;
        const isReadOnly = ['id', 'created_at', 'updated_at'].includes(col.key);
        const effectiveFormat = col.format || col.type || 'text';
        const isNumeric = ['number', 'currency', 'percentage', 'stock'].includes(effectiveFormat) || col.key === 'stock';
        const isPriceCol = ['preco', 'price', 'valor', 'custo'].includes(col.key) || effectiveFormat === 'currency';
        
        const width = getActualColumnWidth(col);
        const alignClass = !col.align 
            ? (isNumeric ? 'justify-center text-center' : 'justify-start text-left')
            : (col.align === 'left' ? 'justify-start text-left' : col.align === 'right' ? 'justify-end text-right' : 'justify-center text-center');

        const cellValue = product[col.key] ?? product.data?.[col.key];
        const cellColors = getCellColorsForCell(product.id, col.key);
        const cellStyleOverride = getCellStyle(cellColors);
        const textColor = getContrastTextColor(cellColors.length > 0 ? cellColors : rowColors);

        return (
          <ColorCell
            key={col.key}
            className={cn(alignClass)}
            isEditing={isEditing}
            onContextMenu={(e) => { if(!blockClicksForSpecialModes){ e.preventDefault(); e.stopPropagation(); onContextMenu(e, product.id, col.key); } }}
            onClick={(e) => { if(blockClicksForSpecialModes) { onCellClick(product.id, col.key); } }}
            style={{ width, minWidth: width, ...cellStyleOverride, color: cellColors.length || rowColors.length || needsReorder ? textColor : undefined }}
          >
            <span 
              onClick={(e) => { if(blockClicksForSpecialModes) { e.stopPropagation(); onRowNumberClick(product.id); } }}
              className={cn("absolute top-1 left-1 text-[10px] font-medium opacity-80 select-none z-10 drop-shadow-sm p-1", 
                blockClicksForSpecialModes ? "cursor-pointer hover:bg-gray-800 hover:text-white rounded" : "pointer-events-none text-gray-700"
              )}
            >
              {index + 1}
            </span>

            {isEditing && !blockClicksForSpecialModes ? (
                col.key === 'prazo_recompra' ? (
                   <ReorderAlertEditor 
                     productId={product.id}
                     valor={product.prazo_recompra_valor}
                     unidade={product.prazo_recompra_unidade}
                     onSave={onCellCancel}
                     onCancel={onCellCancel}
                   />
                ) : (
                   <InlineEditInput value={cellValue} column={col} onSave={(val) => onCellSave(product.id, col.key, val)} onCancel={onCellCancel} />
                )
            ) : isNumeric && !isPriceCol && !blockClicksForSpecialModes ? (
               <div className="w-full h-full" onDoubleClick={(e) => { if (!isReadOnly) { e.stopPropagation(); onCellEdit(product.id, col.key); }}}>
                   <NumericCellControl value={cellValue} productId={product.id} columnKey={col.key} type={col.type} format={effectiveFormat} onUpdate={onUpdate} alignClass={alignClass} />
               </div>
            ) : (
               <div className={cn("flex items-center gap-1.5 w-full h-full overflow-hidden relative z-10", alignClass, blockClicksForSpecialModes ? "pointer-events-none" : "cursor-text")} onDoubleClick={(e) => { if (!isReadOnly && !blockClicksForSpecialModes) { e.stopPropagation(); onCellEdit(product.id, col.key); }}}>
                  {idx === 0 && <StockAlert product={product} />}
                  
                  {col.key === 'prazo_recompra' ? (
                     <span className={cn("text-[14px] leading-normal truncate select-none text-center bg-gray-100/50 px-2 py-1 rounded-md", needsReorder ? "text-white bg-white/20" : "text-gray-700")}>
                        {product.prazo_recompra_valor ? `${product.prazo_recompra_valor} ${product.prazo_recompra_unidade}` : '-'}
                     </span>
                  ) : col.key === 'last_purchase_date' ? (
                     <span className={cn("text-[14px] leading-normal truncate select-none text-center font-medium", needsReorder ? "text-white" : "text-gray-700")}>
                        {cellValue ? format(new Date(cellValue), 'dd/MM/yyyy') : '-'}
                     </span>
                  ) : (
                     <span className={cn("text-[15px] leading-normal truncate select-none flex items-center", idx === 0 && "font-semibold", !cellColors.length && !rowColors.length && !needsReorder && (hasActiveMeiaCaixaStatus ? "text-gray-900" : "text-gray-800"))}>
                       {formatValue(cellValue, effectiveFormat)}
                       {idx === 0 && needsReorder && <ReorderAlertCell product={product} />}
                     </span>
                  )}
               </div>
            )}
          </ColorCell>
        );
      })}

      <div style={{ width: CAIXA_ABERTA_COL_WIDTH, minWidth: CAIXA_ABERTA_COL_WIDTH }} className="flex items-center justify-center h-full border-l border-gray-200/50 px-2 py-1 relative">
         <div className="relative z-10 pointer-events-auto">
           <CaixaAbertaCell product={product} onUpdateCaixaAberta={onUpdateCaixaAberta} onUpdateMeiaCaixaStatus={onUpdateMeiaCaixaStatus} />
         </div>
      </div>

      <div style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} className={cn("flex items-center justify-center gap-1 h-full ml-auto border-l border-gray-200/50 backdrop-blur-sm px-4 relative", isEven && !product.caixa_aberta && !rowColors.length && !needsReorder ? "bg-gray-100/50" : "bg-transparent")}>
        <button onClick={() => onOpenHistory(product)} className="p-2 hover:bg-green-100 text-gray-500 hover:text-green-700 rounded-full transition-all active:scale-95 relative z-10" title="Ver histórico de preços"><TrendingUp className="w-4 h-4" /></button>
        <button onClick={() => { verifyPriceHistory(product.id, product.name || 'Desconhecido'); }} className="p-2 hover:bg-indigo-100 text-gray-500 hover:text-indigo-700 rounded-full transition-all active:scale-95 relative z-10" title="Debug Histórico"><Bug className="w-4 h-4" /></button>
        <button onClick={() => onEdit(product, 'edit')} className="p-2 hover:bg-blue-100 text-gray-500 hover:text-blue-700 rounded-full transition-all active:scale-95 relative z-10" title="Editar Produto"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(product.id)} className="p-2 hover:bg-red-100 text-gray-500 hover:text-red-700 rounded-full transition-all active:scale-95 relative z-10" title="Deletar Produto"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}, customRowAreEqual);
VirtualRow.displayName = 'VirtualRow';

const ProductTable = ({ 
  products, category, onEdit, onDelete, onAddColumn, onUpdateColumn, onAddProduct, onProductUpdate, onUpdateCaixaAberta, onUpdateMeiaCaixaStatus, loadMore, retryLoadMore, hasMore, onDeleteAll, isDeletingAll, error, categoryId
}) => {
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [widthModalCol, setWidthModalCol] = useState(null);
  const [columnWidths, setColumnWidths] = useState(() => { try { return JSON.parse(localStorage.getItem(`columnWidths-${categoryId}`)) || {}; } catch { return {}; } });
  const [activeColumnId, setActiveColumnId] = useState(null);
  
  const [contextMenu, setContextMenu] = useState(null);
  
  const { legends } = useColorLegends(categoryId);
  // Pass products down to hook to prevent race condition on F5
  const { updateCellColor, removeCellColor, getCellColorsForCell, undoLastAction, canUndo } = useCellColors(categoryId, products);
  const { isPaintingMode, isDeleteMode, activeLegendId, activeLegend, clearPaintingMode, registerCategory } = usePaintingMode();
  
  const { toast } = useToast();
  const { getSortedColumns, reorderColumns } = useDragDrop();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    registerCategory(categoryId);
  }, [categoryId, registerCategory]);

  useEffect(() => { 
    localStorage.setItem(`columnWidths-${categoryId}`, JSON.stringify(columnWidths)); 
  }, [columnWidths, categoryId]);

  const handleClearCategory = useCallback(() => { 
    if (window.confirm("Tem certeza que deseja limpar esta categoria? Isso não pode ser desfeito.")) onDeleteAll(); 
  }, [onDeleteAll]);

  const handleCellEditStart = useCallback((id, field) => { setEditingCell({ id, field }); }, []);
  const handleCellEditCancel = useCallback(() => { setEditingCell(null); }, []);
  const handleCellEditSave = useCallback(async (id, field, value) => {
      try {
          let finalValue = value;
          if (field === 'estoque' || field === 'lote_minimo') finalValue = Number(parseBRNumber(value));
          await onProductUpdate(id, { [field]: finalValue });
          setEditingCell(null);
      } catch (err) {
          toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      }
  }, [onProductUpdate, toast]);

  const handleColumnWidthChange = useCallback((colKey, newWidth) => { setColumnWidths(prev => ({ ...prev, [colKey]: newWidth })); }, []);
  const handleOpenHistory = useCallback((product) => setSelectedProduct(product), []);
  const handleCloseHistory = useCallback(() => setSelectedProduct(null), []);

  const handleContextMenu = useCallback((e, productId, columnName) => {
    setContextMenu({ x: e.clientX, y: e.clientY, productId, columnName });
  }, []);
  
  const handleApplyColorContext = useCallback((legendId, entireRow = false) => {
    if (contextMenu) {
      // Find legend data from local list to pass for optimistic UI
      const legendData = legends.find(l => l.id === legendId);
      updateCellColor(contextMenu.productId, entireRow ? null : contextMenu.columnName, legendId, legendData);
    }
  }, [contextMenu, updateCellColor, legends]);
  
  const handleRemoveColorContext = useCallback((entireRow = false) => {
    if (contextMenu) removeCellColor(contextMenu.productId, entireRow ? null : contextMenu.columnName);
  }, [contextMenu, removeCellColor]);

  const handleCellClick = useCallback(async (productId, columnName) => {
    if (!productId) {
      console.warn("handleCellClick validation failed: product_id is null or undefined");
      toast({ title: "Erro de Validação", description: "ID do produto inválido.", variant: "destructive" });
      return;
    }

    if (isPaintingMode && activeLegendId) {
      try {
        await updateCellColor(productId, columnName, activeLegendId, activeLegend);
        toast({ title: "Célula pintada", duration: 1500 });
      } catch (err) {
        toast({ title: "Erro", description: err.message || "Falha ao aplicar cor.", variant: "destructive" });
      }
    } else if (isDeleteMode) {
      try {
        await removeCellColor(productId, columnName);
        toast({ title: "Cor removida", duration: 1500 });
      } catch (err) {
        toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
      }
    }
  }, [isPaintingMode, isDeleteMode, activeLegendId, activeLegend, updateCellColor, removeCellColor, toast]);

  const handleRowNumberClick = useCallback(async (productId) => {
    if (!productId) {
      console.warn("handleRowNumberClick validation failed: product_id is null");
      toast({ title: "Erro de Validação", description: "ID do produto inválido.", variant: "destructive" });
      return;
    }

    if (isPaintingMode && activeLegendId) {
      try {
        await updateCellColor(productId, null, activeLegendId, activeLegend);
        toast({ title: "Linha pintada", duration: 1500 });
      } catch (err) {
        toast({ title: "Erro", description: err.message || "Falha ao pintar linha.", variant: "destructive" });
      }
    } else if (isDeleteMode) {
      try {
        await removeCellColor(productId, null);
        toast({ title: "Cor da linha removida", duration: 1500 });
      } catch (err) {
        toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
      }
    }
  }, [isPaintingMode, isDeleteMode, activeLegendId, activeLegend, updateCellColor, removeCellColor, toast]);

  const handleHeaderClick = useCallback(async (columnName) => {
    if (!columnName) {
      console.warn("handleHeaderClick validation failed: column_name is null");
      toast({ title: "Erro de Validação", description: "Coluna inválida.", variant: "destructive" });
      return;
    }

    if (isPaintingMode && activeLegendId) {
       try {
          let successCount = 0;
          let errorCount = 0;
          
          await Promise.all(products.map(async p => {
             if (!p.id) return;
             try {
               await updateCellColor(p.id, columnName, activeLegendId, activeLegend);
               successCount++;
             } catch (e) {
               errorCount++;
             }
          }));
          
          if (errorCount > 0) {
             toast({ title: "Aviso", description: `Algumas células não puderam ser atualizadas (${errorCount} erros).`, variant: "destructive" });
          } else {
             toast({ title: "Coluna Pintada", description: `A cor foi aplicada a toda a coluna (${successCount} itens).` });
          }
       } catch (err) {
          toast({ title: "Erro", description: "Falha ao aplicar cores em massa.", variant: "destructive" });
       }
    } else if (isDeleteMode) {
      try {
        let errorCount = 0;
        await Promise.all(products.map(async p => {
          try {
            await removeCellColor(p.id, columnName);
          } catch(e) {
            errorCount++;
          }
        }));
        
        if (errorCount > 0) {
          toast({ title: "Aviso", description: "Houve erros ao remover algumas cores.", variant: "destructive" });
        } else {
          toast({ title: "Cores da coluna removidas", description: "A pintura da coluna inteira foi removida." });
        }
      } catch (err) {
        toast({ title: "Erro ao remover", description: "Falha na remoção em massa.", variant: "destructive" });
      }
    }
  }, [isPaintingMode, isDeleteMode, activeLegendId, activeLegend, updateCellColor, removeCellColor, products, toast]);

  const sortedColumns = useMemo(() => {
    let cols = getSortedColumns();
    const isInsumos = category?.name?.toLowerCase().includes('insumo');
    
    if (isInsumos) {
        const hasDate = cols.some(c => c.key === 'last_purchase_date');
        const hasConfig = cols.some(c => c.key === 'prazo_recompra');
        
        if (!hasDate) {
            cols.push({ key: 'last_purchase_date', label: 'Data Compra', type: 'date', width: 140, align: 'center' });
        }
        if (!hasConfig) {
            cols.push({ key: 'prazo_recompra', label: 'Prazo Recompra', type: 'alert_config', width: 180, align: 'center' });
        }
    }
    return cols;
  }, [getSortedColumns, category]);

  const getActualColumnWidth = useCallback((col) => {
    if (columnWidths[col.key]) return Math.max(columnWidths[col.key], MIN_COL_WIDTH);
    return getColumnWidth(col);
  }, [columnWidths]);

  const totalWidth = useMemo(() => {
     return sortedColumns.reduce((acc, col) => acc + getActualColumnWidth(col), 0) + CAIXA_ABERTA_COL_WIDTH + ACTIONS_COL_WIDTH; 
  }, [sortedColumns, getActualColumnWidth]);

  const handleColumnDragEnd = (event) => {
    const { active, over } = event;
    setActiveColumnId(null);
    if (active.id !== over?.id) {
      const oldIndex = sortedColumns.findIndex(col => col.key === active.id);
      const newIndex = sortedColumns.findIndex(col => col.key === over.id);
      reorderColumns(oldIndex, newIndex);
    }
  };

  const InnerElement = useMemo(() => forwardRef(({ style, ...rest }, ref) => {
    const contentHeight = parseFloat(style.height) + HEADER_HEIGHT;
    
    return (
        <div ref={ref} style={{ ...style, height: contentHeight, width: totalWidth, minWidth: '100%', position: 'relative' }} {...rest}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveColumnId(e.active.id)} onDragEnd={handleColumnDragEnd}>
                <div className="flex absolute top-0 left-0 border-b border-gray-200 bg-gray-50/95 z-20" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
                    <SortableContext items={sortedColumns.map(c => c.key)} strategy={horizontalListSortingStrategy}>
                        {sortedColumns.map((col) => (
                            <SortableHeaderCell 
                                key={col.key} col={col} colWidth={getActualColumnWidth(col)}
                                alignClass={!col.align ? (['number', 'currency', 'percentage', 'stock'].includes(col.format || col.type || 'text') ? 'justify-center text-center' : 'justify-start text-left') : (col.align === 'left' ? 'justify-start text-left' : col.align === 'right' ? 'justify-end text-right' : 'justify-center text-center')}
                                onColumnWidthChange={handleColumnWidthChange} onEditColumn={setEditingColumn} onOpenWidthModal={setWidthModalCol}
                                onHeaderClick={handleHeaderClick}
                            />
                        ))}
                    </SortableContext>
                    <div style={{ width: CAIXA_ABERTA_COL_WIDTH, minWidth: CAIXA_ABERTA_COL_WIDTH }} className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide px-2 border-l border-gray-200 h-full text-center">Caixa Aberta</div>
                    <div style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} className="flex items-center justify-center font-bold text-sm text-gray-600 uppercase tracking-wide px-6 border-l border-gray-200 h-full text-center">Ações</div>
                </div>
                <DragOverlay>{activeColumnId ? <div className="bg-blue-100 border-2 border-blue-500 rounded-lg px-4 py-2 font-bold text-sm shadow-lg">{sortedColumns.find(c => c.key === activeColumnId)?.label}</div> : null}</DragOverlay>
            </DndContext>
            {rest.children}
        </div>
    );
  }), [totalWidth, sortedColumns, getActualColumnWidth, handleColumnWidthChange, sensors, activeColumnId, handleHeaderClick]);
  InnerElement.displayName = 'InnerElement';

  const handleItemsRendered = useCallback(({ visibleStopIndex }) => { 
    if (hasMore && !error && visibleStopIndex >= products.length - 5) loadMore(); 
  }, [hasMore, error, products.length, loadMore]);

  // Combine products with cell colors to satisfy persistence requirements in the view layer seamlessly
  const listItemData = useMemo(() => ({
      products, columns: sortedColumns, getActualColumnWidth, onEdit, onDelete, onUpdate: onProductUpdate, onUpdateCaixaAberta, onUpdateMeiaCaixaStatus,
      totalWidth, headerHeight: HEADER_HEIGHT, error, retry: retryLoadMore, editingCell, onCellEdit: handleCellEditStart, onCellSave: handleCellEditSave, onCellCancel: handleCellEditCancel,
      onOpenHistory: handleOpenHistory, getCellColorsForCell, onContextMenu: handleContextMenu, isPaintingMode, isDeleteMode, onCellClick: handleCellClick, onRowNumberClick: handleRowNumberClick
  }), [products, sortedColumns, getActualColumnWidth, onEdit, onDelete, onProductUpdate, onUpdateCaixaAberta, onUpdateMeiaCaixaStatus, totalWidth, error, retryLoadMore, editingCell, handleCellEditStart, handleCellEditSave, handleCellEditCancel, handleOpenHistory, getCellColorsForCell, handleContextMenu, isPaintingMode, isDeleteMode, handleCellClick, handleRowNumberClick]);

  if (!category) return <div className="p-4 text-center">Selecione uma categoria</div>;

  return (
    <ErrorBoundary>
      <div className={cn("space-y-4 h-full flex flex-col relative", (isPaintingMode || isDeleteMode) && `ring-4 ${isDeleteMode ? 'ring-red-400/50' : 'ring-blue-400/50'} rounded-xl transition-all`)}>
        
        <div className="sticky top-0 z-40 bg-gray-50 pt-2 pb-4 border-b border-gray-200/50 shadow-sm backdrop-blur-md">
          <ColorLegendPanel categoryId={categoryId} />
        </div>

        {(isPaintingMode || isDeleteMode) && activeLegend && (
          <div className={cn("fixed bottom-8 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 fade-in", isDeleteMode ? "bg-red-900" : "bg-gray-900")}>
            <div className="flex items-center gap-2">
              {isDeleteMode ? <Eraser className="w-4 h-4 text-red-300" /> : <Paintbrush className="w-4 h-4 text-blue-300" />}
              <span className="font-semibold text-sm">Modo de {isDeleteMode ? "Apagar" : "Pintura"}:</span>
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border", isDeleteMode ? "bg-red-800 border-red-700" : "bg-gray-800 border-gray-700")}>
                <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: activeLegend.color }} />
                <span className="text-xs font-medium">{activeLegend.name}</span>
              </div>
            </div>
            <div className={cn("w-px h-4", isDeleteMode ? "bg-red-700" : "bg-gray-700")} />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs hover:bg-black/20 hover:text-white" disabled={!canUndo} onClick={undoLastAction}>
                <Undo className="w-3.5 h-3.5 mr-1" /> Desfazer
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs px-3 bg-red-600 hover:bg-red-700" onClick={clearPaintingMode}>
                Sair (Esc)
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-1 shrink-0 mt-2">
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
                   height={height} width={width} itemCount={products.length + (hasMore ? 1 : 0)} itemSize={ROW_HEIGHT}
                   innerElementType={InnerElement} itemData={listItemData} onItemsRendered={handleItemsRendered}
                 >
                   {VirtualRow}
                 </List>
               )}
             </AutoSizer>
           </div>
        </div>

        <AddColumnModal isOpen={isColumnModalOpen} onClose={() => setIsColumnModalOpen(false)} onSave={(newColumn) => { if(onAddColumn) onAddColumn(newColumn); toast({ title: "Coluna adicionada" }); }} />
        <ColumnEditor isOpen={!!editingColumn} onClose={() => setEditingColumn(null)} column={editingColumn} onSave={(updatedColumn) => { if(onUpdateColumn) onUpdateColumn(updatedColumn); toast({ title: "Coluna atualizada" }); }} />
        <PriceHistoryModal isOpen={!!selectedProduct} onClose={handleCloseHistory} product={selectedProduct} />
        <AddProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSave={(data) => onAddProduct(data)} category={category} />
        <ColumnWidthModal isOpen={!!widthModalCol} onClose={() => setWidthModalCol(null)} column={widthModalCol} currentWidth={widthModalCol ? getActualColumnWidth(widthModalCol) : 0} onSave={handleColumnWidthChange} />
        
        {contextMenu && !isPaintingMode && !isDeleteMode && (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y} cellName={contextMenu.columnName || null} legends={legends}
            onClose={() => setContextMenu(null)} onApplyColor={handleApplyColorContext} onRemoveColor={handleRemoveColorContext}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ProductTable;
