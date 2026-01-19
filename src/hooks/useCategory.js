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
        setCategories([]);
        setCurrentCategory(null);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar categorias. Verifique a conexão.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Realtime Sync for Categories
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
            // If it's the first category, select it automatically
            setCurrentCategory(prev => prev ? prev : payload.new);
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
            setCurrentCategory(prev => prev?.id === payload.new.id ? payload.new : prev);
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => {
                const filtered = prev.filter(c => c.id !== payload.old.id);
                // If current was deleted, switch to another if available
                setCurrentCategory(curr => {
                    if (curr?.id === payload.old.id) {
                        return filtered.length > 0 ? filtered[0] : null;
                    }
                    return curr;
                });
                return filtered;
            });
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
      console.error('Add category error:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar categoria. ' + error.message,
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
      console.error('Update category error:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar categoria. ' + error.message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

  const deleteCategory = useCallback(async (id) => {
    try {
      // First check if products exist (optional safety, though cascade might handle it)
      // For safety, let's warn if we can't rely on DB cascade constraints or want to be explicit
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Categoria removida!' });
    } catch (error) {
      console.error('Delete category error:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover categoria. ' + error.message,
        variant: 'destructive'
      });
      throw error;
    }
  }, [toast]);

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