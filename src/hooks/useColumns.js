
import { useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useColumns = (categoryId) => {
  const { toast } = useToast();

  const fetchCurrentColumns = async () => {
    if (!categoryId) return null;
    const { data, error } = await supabase
      .from('categories')
      .select('columns')
      .eq('id', categoryId)
      .single();
    
    if (error) throw error;
    return data.columns || [];
  };

  const addColumn = useCallback(async (newColumn) => {
    if (!categoryId) return;
    try {
      const currentColumns = await fetchCurrentColumns();
      
      // Ensure unique key
      let finalKey = newColumn.key;
      if (currentColumns.some(c => c.key === finalKey)) {
        finalKey = `${finalKey}_${Math.random().toString(36).substr(2, 5)}`;
      }
      
      const updatedColumns = [...currentColumns, { ...newColumn, key: finalKey }];

      const { error } = await supabase
        .from('categories')
        .update({ columns: updatedColumns })
        .eq('id', categoryId);

      if (error) throw error;
      toast({ title: 'Coluna adicionada com sucesso' });
      return updatedColumns;
    } catch (err) {
      console.error('Add column error:', err);
      toast({ title: 'Erro ao adicionar coluna', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [categoryId, toast]);

  const updateColumn = useCallback(async (updatedColumn) => {
    if (!categoryId) return;
    try {
      const currentColumns = await fetchCurrentColumns();
      
      const newColumns = currentColumns.map(col => 
        col.key === updatedColumn.key ? updatedColumn : col
      );

      const { error } = await supabase
        .from('categories')
        .update({ columns: newColumns })
        .eq('id', categoryId);

      if (error) throw error;
      // Success toast handled by component or implicit
      return newColumns;
    } catch (err) {
      console.error('Update column error:', err);
      toast({ title: 'Erro ao atualizar coluna', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [categoryId, toast]);

  const deleteColumn = useCallback(async (columnKey) => {
    if (!categoryId) return;
    try {
      const currentColumns = await fetchCurrentColumns();
      const newColumns = currentColumns.filter(col => col.key !== columnKey);

      const { error } = await supabase
        .from('categories')
        .update({ columns: newColumns })
        .eq('id', categoryId);

      if (error) throw error;
      toast({ title: 'Coluna removida' });
      return newColumns;
    } catch (err) {
      console.error('Delete column error:', err);
      toast({ title: 'Erro ao remover coluna', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [categoryId, toast]);

  return {
    addColumn,
    updateColumn,
    deleteColumn
  };
};
