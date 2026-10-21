import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useCellColors = (categoryId, products = []) => {
  const [cellColors, setCellColors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const { toast } = useToast();

  // Create a stable string of product IDs to avoid infinite loops if products array reference changes
  const productIdsStr = useMemo(() => {
    return products.map(p => p.id).sort().join(',');
  }, [products]);

  const fetchCellColors = useCallback(async () => {
    console.log(`[useCellColors] fetchCellColors started. CategoryId: ${categoryId}, Products Count: ${products.length}`);
    
    if (!categoryId || !products || products.length === 0) {
      console.log(`[useCellColors] fetchCellColors aborted - missing categoryId or products.`);
      setCellColors([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use products from props instead of fetching from DB to avoid race conditions
      const pIds = products.map(p => p.id);
      
      const BATCH_SIZE = 500;
      let allColors = [];

      for (let i = 0; i < pIds.length; i += BATCH_SIZE) {
        const batch = pIds.slice(i, i + BATCH_SIZE);
        const { data, error: fetchErr } = await supabase
          .from('cell_colors')
          .select('id, product_id, column_name, color_legend_id, applied_at, color_legends(color, name)')
          .in('product_id', batch);

        if (fetchErr) throw fetchErr;
        if (data) allColors = [...allColors, ...data];
      }

      console.log(`[useCellColors] fetchCellColors success. Fetched ${allColors.length} colors.`);
      setCellColors(allColors);
    } catch (err) {
      console.error("[useCellColors] fetchCellColors Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId, productIdsStr]); // Depend on productIdsStr instead of products array reference

  const getCellColors = useCallback(async (productIds) => {
    if (!productIds || productIds.length === 0) return [];
    try {
      const { data, error: fetchErr } = await supabase
        .from('cell_colors')
        .select('id, product_id, column_name, color_legend_id, applied_at, color_legends(color, name)')
        .in('product_id', productIds);
        
      if (fetchErr) throw fetchErr;
      return data || [];
    } catch (err) {
      console.error("Error fetching specific cell colors:", err);
      return [];
    }
  }, []);

  const updateCellColor = useCallback(async (productId, columnName, colorLegendId, legendData = null) => {
    const colName = columnName || null;
    
    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticColor = {
      id: tempId,
      product_id: productId,
      column_name: colName,
      color_legend_id: colorLegendId,
      applied_at: new Date().toISOString(),
      color_legends: legendData || { color: '#cbd5e1', name: 'Loading...' }
    };

    setCellColors(prev => {
      const filtered = prev.filter(c => !(c.product_id === productId && c.column_name === colName));
      return [...filtered, optimisticColor];
    });

    try {
      let delQuery = supabase.from('cell_colors').delete().eq('product_id', productId);
      if (colName) delQuery = delQuery.eq('column_name', colName);
      else delQuery = delQuery.is('column_name', null);
      await delQuery;

      const payload = {
        product_id: productId,
        column_name: colName,
        color_legend_id: colorLegendId,
        applied_at: new Date().toISOString()
      };

      const { data, error: insertErr } = await supabase
        .from('cell_colors')
        .insert(payload)
        .select('id, product_id, column_name, color_legend_id, applied_at, color_legends(color, name)')
        .single();

      if (insertErr) throw insertErr;

      setCellColors(prev => prev.map(c => c.id === tempId ? data : c));
      setLastAction({ type: 'add', data });
      return data;
      
    } catch (err) {
      console.error("Error updating cell color:", err);
      fetchCellColors();
      toast({ title: 'Erro', description: 'Falha ao pintar célula. Verifique a conexão.', variant: 'destructive' });
      throw err;
    }
  }, [fetchCellColors, toast]);

  const removeCellColor = useCallback(async (productId, columnName) => {
    const colName = columnName || null;
    
    const removedItems = cellColors.filter(c => c.product_id === productId && c.column_name === colName);
    setCellColors(prev => prev.filter(c => !(c.product_id === productId && c.column_name === colName)));

    try {
      let query = supabase.from('cell_colors').delete().eq('product_id', productId);
      if (colName) query = query.eq('column_name', colName);
      else query = query.is('column_name', null);

      const { error: delErr } = await query;
      if (delErr) throw delErr;

    } catch (err) {
      console.error(err);
      setCellColors(prev => [...prev, ...removedItems]);
      toast({ title: 'Erro', description: 'Erro ao remover cor da célula.', variant: 'destructive' });
      throw err;
    }
  }, [cellColors, toast]);

  const removeCellColorById = useCallback(async (id) => {
    try {
      const { error: delErr } = await supabase.from('cell_colors').delete().eq('id', id);
      if (delErr) throw delErr;
      setCellColors(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Erro ao remover cor.', variant: 'destructive' });
    }
  }, [toast]);

  const undoLastAction = useCallback(async () => {
    if (!lastAction || lastAction.type !== 'add') return;
    await removeCellColorById(lastAction.data.id);
    setLastAction(null);
  }, [lastAction, removeCellColorById]);

  const getCellColorsForCell = useCallback((productId, columnName) => {
    const colName = columnName || null;
    const specificColors = cellColors.filter(c => c.product_id === productId && c.column_name === colName);
    const rowColors = cellColors.filter(c => c.product_id === productId && c.column_name === null);
    
    const allColors = [...rowColors, ...specificColors].map(c => c.color_legends?.color).filter(Boolean);
    return [...new Set(allColors)];
  }, [cellColors]);

  useEffect(() => {
    console.log("[useCellColors] Setup useEffect triggered");
    fetchCellColors();
    
    let timeoutId;
    const channel = supabase
      .channel('cell_colors_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cell_colors' }, () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchCellColors(); 
        }, 1000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutId);
    };
  }, [fetchCellColors]);

  return {
    cellColors,
    loading,
    error,
    fetchCellColors,
    getCellColors,
    updateCellColor,
    removeCellColor,
    getCellColorsForCell,
    undoLastAction,
    canUndo: !!lastAction
  };
};