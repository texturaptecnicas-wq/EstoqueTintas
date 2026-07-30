
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useCellColors = (categoryId) => {
  const [cellColors, setCellColors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const { toast } = useToast();

  const fetchCellColors = useCallback(async () => {
    if (!categoryId) {
      setCellColors([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cell_colors')
        .select('id, product_id, column_name, color_legend_id, applied_at, color_legends(color, name), products!inner(category_id)')
        .eq('products.category_id', categoryId);

      if (error) throw error;
      setCellColors(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Erro ao carregar cores das células.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [categoryId, toast]);

  const addCellColor = useCallback(async (productId, columnName, colorLegendId) => {
    const colName = columnName || null;

    try {
      const payload = {
        product_id: productId,
        column_name: colName,
        color_legend_id: colorLegendId,
        applied_at: new Date().toISOString()
      };

      // UPSERT LOGIC: Updates if exists, inserts if not
      const { data, error } = await supabase
        .from('cell_colors')
        .upsert(payload, { onConflict: 'product_id,column_name' })
        .select('id, product_id, column_name, color_legend_id, applied_at, color_legends(color, name)')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Violação de restrição: Uma cor conflitante já existe para esta célula.');
        }
        throw error;
      }

      setCellColors(prev => {
        const filtered = prev.filter(c => !(c.product_id === productId && c.column_name === colName));
        return [...filtered, data];
      });
      setLastAction({ type: 'add', data });
      
    } catch (err) {
      console.error("Error upserting cell color:", err);
      throw err;
    }
  }, []);

  const removeCellColor = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('cell_colors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCellColors(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Cor removida', description: 'A cor foi removida com sucesso.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Erro ao remover cor.', variant: 'destructive' });
    }
  }, [toast]);
  
  const removeCellColorsForProductAndColumn = useCallback(async (productId, columnName) => {
    const colName = columnName || null;
    
    try {
      let query = supabase.from('cell_colors').delete().eq('product_id', productId);
      
      if (colName) {
        query = query.eq('column_name', colName);
      } else {
        query = query.is('column_name', null);
      }

      const { error } = await query;
      if (error) throw error;

      setCellColors(prev => prev.filter(c => !(c.product_id === productId && c.column_name === colName)));
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Erro ao limpar cores.', variant: 'destructive' });
    }
  }, [toast]);

  const undoLastAction = useCallback(async () => {
    if (!lastAction || lastAction.type !== 'add') return;
    await removeCellColor(lastAction.data.id);
    setLastAction(null);
  }, [lastAction, removeCellColor]);

  const getCellColorsForCell = useCallback((productId, columnName) => {
    const specificColors = cellColors.filter(c => c.product_id === productId && c.column_name === columnName);
    const rowColors = cellColors.filter(c => c.product_id === productId && c.column_name === null);
    
    const allColors = [...rowColors, ...specificColors].map(c => c.color_legends?.color).filter(Boolean);
    return [...new Set(allColors)];
  }, [cellColors]);

  useEffect(() => {
    fetchCellColors();
    const channel = supabase
      .channel('cell_colors_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cell_colors' }, () => {
        fetchCellColors();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchCellColors]);

  return {
    cellColors,
    loading,
    fetchCellColors,
    addCellColor,
    removeCellColor,
    removeCellColorsForProductAndColumn,
    getCellColorsForCell,
    undoLastAction,
    canUndo: !!lastAction
  };
};
