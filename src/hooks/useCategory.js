
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useCategory = () => {
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at');

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(data);
        if (!currentCategory) {
          setCurrentCategory(data[0]);
        }
      } else {
        // Initialize with default category if empty
        const defaultCategory = {
          name: 'Tintas',
          description: 'Gestão de estoque de tintas',
          columns: [
            { key: 'color', label: 'Cor / Nome', type: 'text', required: true },
            { key: 'finish', label: 'Acabamento', type: 'text', required: true },
            { key: 'code', label: 'Código', type: 'text', required: true },
            { key: 'supplier', label: 'Fornecedor', type: 'text', required: true },
            { key: 'price', label: 'Preço', type: 'currency', required: true },
            { key: 'last_purchase_month', label: 'Última Compra', type: 'date', required: false },
            { key: 'stock', label: 'Estoque', type: 'number', required: true },
            { key: 'minimum_batch', label: 'Lote Mínimo', type: 'number', required: true }
          ]
        };
        await addCategory(defaultCategory);
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
  };

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
            // Update current category if it was modified
            setCurrentCategory(prev => prev?.id === payload.new.id ? payload.new : prev);
          } else if (payload.eventType === 'DELETE') {
            setCategories(prev => prev.filter(c => c.id !== payload.old.id));
            // Reset current category if deleted
            setCurrentCategory(prev => prev?.id === payload.old.id ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addCategory = async (categoryData) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          ...categoryData,
          columns: categoryData.columns || [] // Ensure columns is array
        }])
        .select()
        .single();

      if (error) throw error;
      
      // State update handled by realtime subscription
      toast({ title: 'Categoria criada com sucesso!' });
      return data;
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar categoria.',
        variant: 'destructive'
      });
    }
  };

  const updateCategory = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Categoria atualizada!' });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar categoria.',
        variant: 'destructive'
      });
    }
  };

  const deleteCategory = async (id) => {
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
      // If we deleted the current category, switch to the first available one
      if (currentCategory?.id === id) {
         const nextCat = categories.find(c => c.id !== id);
         setCurrentCategory(nextCat || null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover categoria.',
        variant: 'destructive'
      });
    }
  };

  return {
    categories,
    currentCategory,
    setCurrentCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories,
    loading
  };
};
