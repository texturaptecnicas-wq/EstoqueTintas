
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';

const ITEMS_PER_PAGE = 50;

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
       // If request is in flight, ignore (or return promise if we wanted to await)
       if (requestCache.current.get(cacheKey) === 'loading') return;
    }

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      setLoading(true);
      requestCache.current.set(cacheKey, 'loading');
      
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Optimization: Select only necessary fields
      // data contains dynamic columns. id, category_id are needed for keys/logic.
      // created_at needed for sorting fallback.
      const { data, error, count } = await supabase
        .from('products')
        .select(`id, category_id, data, created_at, updated_at`, { count: 'exact' })
        .eq('category_id', categoryId)
        .order('created_at', { ascending: true }) 
        .range(from, to)
        .abortSignal(abortControllerRef.current.signal);

      if (error) {
        if (error.code !== '20') throw error; // Ignore abort errors
      }

      if (data) {
        // Transform data - minimal processing
        const formattedProducts = data.map(p => ({
          ...p.data,
          id: p.id,
          category_id: p.category_id,
          created_at: p.created_at,
          // Fallback for order_index
          order_index: p.data?.order_index ?? Number.MAX_SAFE_INTEGER
        }));

        setProducts(prev => {
          if (pageNum === 0) return formattedProducts;
          // Deduplicate IDs
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = formattedProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });

        setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);
        requestCache.current.set(cacheKey, 'cached');
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error loading products:', err);
        requestCache.current.delete(cacheKey);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      getProducts(nextPage);
    }
  }, [loading, hasMore, page, getProducts]);

  // Realtime Handler - Batched from useRealtimeSync
  const handleRealtimeUpdate = useCallback((payload) => {
    // Only care about this category's products
    if (
        (payload.new && payload.new.category_id !== categoryId) && 
        (payload.old && payload.old_category_id !== categoryId) // note: Supabase payload.old often only has ID
    ) {
       // Check if payload.old is just ID, we might need to check local state
       if (payload.eventType === 'DELETE') {
          // pass through to check local state
       } else {
          return; 
       }
    }

    if (payload.eventType === 'INSERT') {
       // Filter out if not this category
       if (payload.new.category_id !== categoryId) return;

       setProducts(prev => {
         if (prev.some(p => p.id === payload.new.id)) return prev;
         const newProduct = {
           ...payload.new.data,
           id: payload.new.id,
           category_id: payload.new.category_id,
           created_at: payload.new.created_at,
         };
         return [newProduct, ...prev]; // Add to top for visibility
       });
    } else if (payload.eventType === 'UPDATE') {
       if (payload.new.category_id !== categoryId) return;
       
       setProducts(prev => prev.map(p => {
         if (p.id === payload.new.id) {
           return { ...p, ...payload.new.data };
         }
         return p;
       }));
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
    const { priceHistory, ...cleanData } = productData;
    // Calculate new order index
    const currentMaxIndex = productsRef.current.reduce((max, p) => Math.max(max, p.order_index || 0), 0);
    const newOrderIndex = currentMaxIndex + 1;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        category_id: categoryId,
        data: { ...cleanData, order_index: newOrderIndex }
      }])
      .select()
      .single();

    if (error) {
       toast({ title: 'Erro ao adicionar', variant: 'destructive' });
       throw error;
    }

    // Optimistic UI update handled by Realtime, but manual update is faster UX
    setProducts(prev => [{
        ...cleanData,
        id: data.id,
        category_id: categoryId,
        order_index: newOrderIndex,
        created_at: new Date().toISOString()
    }, ...prev]);

    return data;
  }, [categoryId, toast]);

  const updateProduct = useCallback(async (id, updates) => {
    // Optimistic Update
    const prevProducts = productsRef.current;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

    try {
      const { data: current } = await supabase.from('products').select('data').eq('id', id).single();
      if (!current) throw new Error("Product not found");

      const mergedData = { ...current.data, ...updates };
      const { error } = await supabase
        .from('products')
        .update({ data: mergedData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      // Price History Logic (Simplified for performance - fire and forget)
      if (updates.price) {
          supabase.from('price_history').insert({
             product_id: id,
             price: parseFloat(updates.price),
             date: new Date().toISOString(),
             column_key: 'price'
          }).then(() => {});
      }

    } catch (err) {
      console.error(err);
      setProducts(prevProducts); // Revert
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  }, [toast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      // Optimistic delete handled by realtime or below
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Produto removido' });
    } catch (err) {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  }, [toast]);

  // Bulk Import
  const importBulkProducts = useCallback(async (newProductsList) => {
      // Logic handled in background mostly, just trigger it
      // For large imports, just insert.
      const BATCH_SIZE = 100;
      for (let i = 0; i < newProductsList.length; i += BATCH_SIZE) {
         const batch = newProductsList.slice(i, i + BATCH_SIZE);
         const payload = batch.map(p => ({
             category_id: categoryId,
             data: { ...p, order_index: (p.order_index || 0) }
         }));
         await supabase.from('products').insert(payload);
      }
      toast({ title: 'Importação iniciada', description: 'Os produtos aparecerão em breve.' });
      getProducts(0); // Refresh list
  }, [categoryId, toast, getProducts]);

  const deleteAllProducts = useCallback(async () => {
     await supabase.from('products').delete().eq('category_id', categoryId);
     setProducts([]);
  }, [categoryId]);

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
