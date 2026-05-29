
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useColorLegends = () => {
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchLegends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('color_legends')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLegends(data || []);
    } catch (err) {
      console.error("[useColorLegends] Erro ao buscar:", err);
      setError(err);
      toast({ title: 'Erro', description: 'Erro ao carregar legendas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createLegend = useCallback(async (name, color, description) => {
    if (!name || !name.trim()) {
      return { success: false, error: 'O nome da legenda é obrigatório.' };
    }
    
    if (!color) {
      return { success: false, error: 'A cor da legenda é obrigatória.' };
    }

    const payload = { 
      name: name.trim(), 
      color, 
      description: description?.trim() || null,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error: insertError } = await supabase
        .from('color_legends')
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;
      
      setLegends(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error("[useColorLegends] Exceção ao inserir no Supabase:", err);
      return { success: false, error: err.message || 'Erro ao criar legenda.' };
    }
  }, []);

  const updateLegend = useCallback(async (id, name, color, description) => {
    try {
      const { data, error: updateError } = await supabase
        .from('color_legends')
        .update({ name, color, description })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      setLegends(prev => prev.map(l => l.id === id ? data : l));
      toast({ title: 'Sucesso', description: 'Legenda atualizada.' });
      return { success: true, data };
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao atualizar legenda.', variant: 'destructive' });
      return { success: false, error: err.message };
    }
  }, [toast]);

  const deleteLegend = useCallback(async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('color_legends')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setLegends(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Sucesso', description: 'Legenda removida.' });
      return true;
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao remover legenda.', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchLegends();
  }, [fetchLegends]);

  return {
    legends,
    loading,
    error,
    fetchLegends,
    refetch: fetchLegends,
    createLegend,
    updateLegend,
    deleteLegend
  };
};
