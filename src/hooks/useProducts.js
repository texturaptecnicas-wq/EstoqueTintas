
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';

const ITEMS_PER_PAGE = 50;

// Helper for consistent alphabetical sorting
const sortProductsByName = (items) => {
  return [...items].sort((a, b) => {
    const nameA = (a.name || '').toString().toLowerCase();
    const nameB = (b.name || '').toString().toLowerCase();
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });
};

export const useProducts = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const { toast } = useToast();
  
  // Refs for caching and state access without re-renders
  const productsRef = useRef([]);
  const requestCache = useRef(new Map());
  const abortControllerRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Reset when category changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    requestCache.current.clear();
  }, [categoryId]);

  const getProducts = useCallback(async (pageNum = 0) => {
    if (!categoryId) return;
    
    // Request Deduplication
    const cacheKey = `${categoryId}-${pageNum}`;
    if (requestCache.current.has(cacheKey)) {
       if (requestCache.current.get(cacheKey) === 'loading') return;
    }

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      requestCache.current.set(cacheKey, 'loading');
      
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Select with sorting by generated name column
      const { data, error, count } = await supabase
        .from('products')
        .select(`id, category_id, data, created_at, updated_at`, { count: 'exact' })
        .eq('category_id', categoryId)
        .order('name', { ascending: true }) 
        .range(from, to)
        .abortSignal(abortControllerRef.current.signal);

      if (error) {
        if (error.code !== '20') throw error; // Ignore abort errors
      }

      if (data) {
        const formattedProducts = data.map(p => ({
          ...p.data,
          id: p.id,
          category_id: p.category_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
          order_index: p.data?.order_index ?? 0
        }));

        setProducts(prev => {
          let combined;
          if (pageNum === 0) {
            combined = formattedProducts;
          } else {
            // Deduplicate IDs
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = formattedProducts.filter(p => !existingIds.has(p.id));
            combined = [...prev, ...newItems];
          }
          // Ensure consistent client-side sort
          return sortProductsByName(combined);
        });

        setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);
        requestCache.current.set(cacheKey, 'cached');
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading products:', err);
        requestCache.current.delete(cacheKey);
        toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível buscar os produtos.',
            variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId, toast]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      getProducts(nextPage);
    }
  }, [loading, hasMore, page, getProducts]);

  // Realtime Handler
  const handleRealtimeUpdate = useCallback((payload) => {
    // If event is regarding another category, ignore
    if (
        (payload.new && payload.new.category_id !== categoryId) && 
        (payload.old && payload.old_category_id !== categoryId)
    ) {
       // However, strictly speaking, DELETE payload.old might not have category_id if not selected replica identity FULL
       // But assuming we filter. If we can't determine, we might ignore or refresh.
       // For now, Supabase realtime usually sends the row.
       if (payload.eventType !== 'DELETE') return; 
    }

    if (payload.eventType === 'INSERT') {
       if (payload.new.category_id !== categoryId) return;

       setProducts(prev => {
         if (prev.some(p => p.id === payload.new.id)) return prev;
         const newProduct = {
           ...payload.new.data,
           id: payload.new.id,
           category_id: payload.new.category_id,
           created_at: payload.new.created_at,
           updated_at: payload.new.updated_at
         };
         // Insert and sort
         return sortProductsByName([...prev, newProduct]);
       });
    } else if (payload.eventType === 'UPDATE') {
       if (payload.new.category_id !== categoryId) return;
       
       setProducts(prev => {
         const updated = prev.map(p => {
           if (p.id === payload.new.id) {
             return { ...p, ...payload.new.data, updated_at: payload.new.updated_at };
           }
           return p;
         });
         return sortProductsByName(updated);
       });
    } else if (payload.eventType === 'DELETE') {
       setProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }
  }, [categoryId]);

  useRealtimeSync(handleRealtimeUpdate);

  // Initial load
  useEffect(() => {
    if (categoryId) {
        getProducts(0);
    }
  }, [categoryId, getProducts]);

  const addProduct = useCallback(async (productData) => {
    try {
        const { priceHistory, ...cleanData } = productData;
        
        // 1. Save to Supabase
        const { data, error } = await supabase
          .from('products')
          .insert([{
            category_id: categoryId,
            data: cleanData
          }])
          .select()
          .single();

        if (error) throw error;

        toast({ title: 'Produto adicionado com sucesso!' });
        
        // 2. Optimistic Update (optional, realtime will catch it, but this feels faster)
        const newProduct = {
            ...cleanData,
            id: data.id,
            category_id: categoryId,
            created_at: data.created_at,
            updated_at: data.updated_at
        };
        setProducts(prev => sortProductsByName([...prev, newProduct]));

        // 3. Reset pagination cache to ensure consistency
        requestCache.current.clear();
        
        return data;

    } catch (err) {
        console.error('Error adding product:', err);
        toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' });
        throw err;
    }
  }, [categoryId, toast]);

  const updateProduct = useCallback(async (id, updates) => {
    // 1. Optimistic Update
    const prevProducts = productsRef.current;
    setProducts(prev => sortProductsByName(
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
    ));

    try {
      // 2. Fetch current data to ensure we don't overwrite concurrent changes blindly (simple merge strategy)
      const { data: current } = await supabase.from('products').select('data').eq('id', id).single();
      if (!current) throw new Error("Product not found or deleted");

      const mergedData = { ...current.data, ...updates };
      const { error } = await supabase
        .from('products')
        .update({ data: mergedData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Produto atualizado' });
      
      // Handle Side Effect: Price History
      if (updates.price) {
          supabase.from('price_history').insert({
             product_id: id,
             price: parseFloat(updates.price),
             date: new Date().toISOString(),
             column_key: 'price'
          }).then(({ error }) => {
              if (error) console.error('Failed to save price history', error);
          });
      }

    } catch (err) {
      console.error('Error updating product:', err);
      setProducts(prevProducts); // Revert optimistic update
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [toast]);

  const deleteProduct = useCallback(async (id) => {
    // 1. Optimistic Update
    const prevProducts = productsRef.current;
    setProducts(prev => prev.filter(p => p.id !== id));

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido' });
    } catch (err) {
      console.error('Error deleting product:', err);
      setProducts(prevProducts); // Revert
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  const importBulkProducts = useCallback(async (newProductsList) => {
      try {
        const BATCH_SIZE = 100;
        for (let i = 0; i < newProductsList.length; i += BATCH_SIZE) {
           const batch = newProductsList.slice(i, i + BATCH_SIZE);
           const payload = batch.map(p => ({
               category_id: categoryId,
               data: p
           }));
           const { error } = await supabase.from('products').insert(payload);
           if (error) throw error;
        }
        toast({ title: 'Importação concluída', description: 'Todos os produtos foram importados.' });
        
        // Re-fetch to sort and display
        requestCache.current.clear();
        setPage(0);
        getProducts(0);
      } catch (err) {
        console.error('Import error:', err);
        toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
      }
  }, [categoryId, toast, getProducts]);

  const deleteAllProducts = useCallback(async () => {
     if (!window.confirm('Tem certeza? Isso apagará todos os produtos desta categoria.')) return;
     try {
         const { error } = await supabase.from('products').delete().eq('category_id', categoryId);
         if (error) throw error;
         setProducts([]);
         toast({ title: 'Todos os produtos foram removidos' });
     } catch (err) {
         console.error('Delete all error:', err);
         toast({ title: 'Erro ao limpar produtos', description: err.message, variant: 'destructive' });
     }
  }, [categoryId, toast]);

  return {
    products,
    loading,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    importBulkProducts,
    loadMore,
    hasMore
  };
};
