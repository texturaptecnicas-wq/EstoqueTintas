
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useCategory = () => {
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at');

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data);
        // Only set current category if not already set or invalid
        setCurrentCategory(prev => {
          if (!prev) return data[0];
          const stillExists = data.find(c => c.id === prev.id);
          return stillExists || data[0];
        });
      } else {
        // Initialize with default category if empty
        const defaultCategory = {
          name: 'Geral',
          description: 'Categoria padrão',
          columns: [
            { key: 'name', label: 'Nome', type: 'text', required: true, visible: true },
            { key: 'stock', label: 'Estoque', type: 'number', required: true, visible: true },
            { key: 'price', label: 'Preço', type: 'currency', required: true, visible: true },
            { key: 'minimum_batch', label: 'Mínimo', type: 'number', required: false, visible: true }
          ]
        };
        // We can't call addCategory here directly because it might not be ready, 
        // so we manually insert to DB or handle it gracefully.
        // For now, let's just leave it empty to avoid infinite loops if addCategory fails.
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar categorias.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCategories();

    const channel = supabase
      .channel('categories-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCategories(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
            setCurrentCategory(prev => prev?.id === payload.new.id ? payload.new : prev);
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => prev.filter(c => c.id !== payload.old.id));
            setCurrentCategory(prev => prev?.id === payload.old.id ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCategories]);

  const addCategory = useCallback(async (categoryData) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          ...categoryData,
          columns: categoryData.columns || []
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: 'Categoria criada com sucesso!' });
      return data;
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar categoria.',
        variant: 'destructive'
      });
      throw error; 
    }
  }, [toast]);

  const updateCategory = useCallback(async (id, updates) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Categoria atualizada!' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar categoria.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const deleteCategory = useCallback(async (id) => {
    if (categories.length <= 1) {
      toast({ 
        title: 'Ação bloqueada', 
        description: 'Você precisa ter pelo menos uma categoria.',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Categoria removida!' });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao remover categoria.',
        variant: 'destructive'
      });
    }
  }, [categories.length, toast]);

  return useMemo(() => ({
    categories,
    currentCategory,
    setCurrentCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories,
    loading
  }), [categories, currentCategory, addCategory, updateCategory, deleteCategory, loadCategories, loading]);
};
