
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';

const ITEMS_PER_PAGE = 50;

export const useProducts = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Performance Optimization: Keep products in ref to avoid re-creating update functions
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const { toast } = useToast();
  
  // Cache to prevent immediate re-fetches
  const cache = useRef({});

  // Reset pagination when category changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    cache.current = {};
  }, [categoryId]);

  const getProducts = useCallback(async (pageNum = 0) => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Fetch products
      // FIX: Ordering by created_at ASC allows Excel import order (if inserted sequentially)
      // to be preserved naturally.
      const { data, error: fetchError, count } = await supabase
        .from('products')
        .select(`
          *,
          price_history (
            id,
            price,
            old_price,
            variation,
            date,
            column_key
          )
        `, { count: 'exact' })
        .eq('category_id', categoryId)
        .order('created_at', { ascending: true }) 
        .range(from, to);

      if (fetchError) throw fetchError;

      // Transform data
      const formattedProducts = data.map(p => ({
        ...p.data,
        id: p.id,
        category_id: p.category_id,
        updated_at: p.updated_at,
        created_at: p.created_at, // Keep created_at for debug/sort
        priceHistory: p.price_history || [],
        order_index: p.data?.order_index ?? Number.MAX_SAFE_INTEGER
      }));

      // Local sort is still useful for the current page chunk
      formattedProducts.sort((a, b) => {
         // Priority 1: Order Index
         const idxA = a.order_index ?? Number.MAX_SAFE_INTEGER;
         const idxB = b.order_index ?? Number.MAX_SAFE_INTEGER;
         if (idxA !== idxB) return idxA - idxB;
         // Priority 2: Creation Date
         return new Date(a.created_at) - new Date(b.created_at);
      });

      setProducts(prev => {
        if (pageNum === 0) return formattedProducts;
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = formattedProducts.filter(p => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });

      setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Error loading products:', err);
      setError('Erro ao carregar produtos');
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

  // Handle Realtime Price History Updates
  const handleHistoryUpdate = useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      setProducts(currentProducts => 
        currentProducts.map(p => {
          if (p.id === payload.new.product_id) {
            const exists = p.priceHistory?.some(h => h.id === payload.new.id);
            if (exists) return p;
            return {
              ...p,
              priceHistory: [...(p.priceHistory || []), payload.new]
            };
          }
          return p;
        })
      );
    }
  }, []);

  useRealtimeSync(handleHistoryUpdate);

  // Subscribe to Products Table changes
  useEffect(() => {
    if (!categoryId) return;

    getProducts(0);

    const channel = supabase
      .channel(`products-sync-${categoryId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `category_id=eq.${categoryId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
             const newProduct = {
                ...payload.new.data,
                id: payload.new.id,
                category_id: payload.new.category_id,
                updated_at: payload.new.updated_at,
                created_at: payload.new.created_at,
                priceHistory: []
             };
             
             setProducts(prev => {
                if (prev.some(p => p.id === newProduct.id)) return prev;
                // Add to end if following Excel logic (newest/bottom), or top if desired. 
                // Given standard list behavior, usually add to top, but for Excel mirror, maybe bottom?
                // Let's add to top for visibility newly created items.
                return [newProduct, ...prev];
             });

          } else if (payload.eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => {
              if (p.id === payload.new.id) {
                return {
                  ...p,
                  ...payload.new.data,
                  updated_at: payload.new.updated_at,
                  priceHistory: p.priceHistory
                };
              }
              return p;
            }));

          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, getProducts]);

  const addProduct = useCallback(async (productData) => {
    try {
      const { priceHistory, ...cleanData } = productData;
      
      // Calculate new order index (last + 1)
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

      if (error) throw error;
      if (!data || !data.id) throw new Error("Failed to create product");

      if (cleanData.price) {
        await supabase.from('price_history').insert({
          product_id: data.id,
          price: parseFloat(cleanData.price),
          old_price: 0,
          variation: 0,
          date: new Date().toISOString(),
          column_key: 'price'
        });
      }

      toast({
        title: 'Produto adicionado',
        description: 'Produto adicionado com sucesso!',
      });
      return data;
    } catch (err) {
      toast({
        title: 'Erro ao adicionar',
        description: err.message,
        variant: 'destructive'
      });
      throw err;
    }
  }, [categoryId, toast]);

  // OPTIMIZED: Uses productsRef to avoid re-renders
  const updateProduct = useCallback(async (id, updates) => {
    if (!id) return;

    // Access current state via ref without dependency
    const currentProducts = productsRef.current;
    const productIndex = currentProducts.findIndex(p => p.id === id);
    if (productIndex === -1) return;

    const currentProduct = currentProducts[productIndex];
    const updatedProduct = { ...currentProduct, ...updates };

    // Optimistic Update
    setProducts(prev => {
       const newP = [...prev];
       const idx = newP.findIndex(p => p.id === id);
       if (idx !== -1) newP[idx] = updatedProduct;
       return newP;
    });

    try {
      const { id: _id, category_id: _cid, priceHistory: _ph, updated_at: _ua, created_at: _ca, order_index: _oi, ...existingData } = currentProduct;
      const { id: __id, category_id: __cid, priceHistory: __ph, updated_at: __ua, created_at: __ca, ...cleanUpdates } = updates;
      
      const mergedData = { ...existingData, ...cleanUpdates };

      const { data: updatedRow, error } = await supabase
        .from('products')
        .update({
          data: mergedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Price History Logic
      const priceKeys = ['price', 'valor', 'custo', 'cost', 'sale_price'];
      const historyPromises = [];

      Object.keys(updates).forEach(key => {
        const isPriceField = priceKeys.includes(key) || 
                             key.toLowerCase().includes('price') || 
                             key.toLowerCase().includes('valor');
        
        if (isPriceField) {
           const oldVal = parseFloat(currentProduct[key]);
           const newVal = parseFloat(updates[key]);
           
           if (!isNaN(oldVal) && !isNaN(newVal) && oldVal !== newVal) {
              const variation = oldVal === 0 ? 100 : ((newVal - oldVal) / oldVal) * 100;
              historyPromises.push(
                supabase.from('price_history').insert({
                  product_id: id,
                  price: newVal,
                  old_price: oldVal,
                  variation: variation,
                  date: new Date().toISOString(),
                  column_key: key
                })
              );
           }
        }
      });

      if (historyPromises.length > 0) {
          await Promise.all(historyPromises);
      }

    } catch (err) {
      console.error(err);
      // Rollback via ref state (might be slightly stale but safer than full revert)
      setProducts(currentProducts);
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [toast]); // Removed 'products' dependency!

  const deleteProduct = useCallback(async (id) => {
    if (!id) return;
    try {
      await supabase.from('price_history').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido' });
    } catch (err) {
      toast({
        title: 'Erro ao remover',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const deleteAllProducts = useCallback(async () => {
    try {
      const { data: productsToDelete } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', categoryId);
        
      if (productsToDelete?.length > 0) {
          const ids = productsToDelete.map(p => p.id);
          await supabase.from('price_history').delete().in('product_id', ids);
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('category_id', categoryId);

      if (error) throw error;
      toast({ title: 'Todos os produtos removidos' });
    } catch (err) {
      toast({
        title: 'Erro ao limpar',
        description: err.message,
        variant: 'destructive'
      });
    }
  }, [categoryId, toast]);
  
  // OPTIMIZED IMPORT: Uses bulk insert for atomicity and speed
  const importBulkProducts = useCallback(async (newProductsList) => {
    try {
      // 1. Chunking still needed for API limits, but we use bulk insert
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < newProductsList.length; i += BATCH_SIZE) {
         const batch = newProductsList.slice(i, i + BATCH_SIZE);
         
         const productsPayload = batch.map(p => {
             const { price, order_index, ...rest } = p;
             return {
                 category_id: categoryId,
                 data: { ...rest, price, order_index }
             };
         });

         // Bulk Insert Products
         const { data: insertedProducts, error } = await supabase
            .from('products')
            .insert(productsPayload)
            .select();
            
         if (error) throw error;

         // Prepare Price History
         const historyPayload = [];
         insertedProducts.forEach(prod => {
             const price = parseFloat(prod.data.price);
             if (!isNaN(price) && price > 0) {
                 historyPayload.push({
                    product_id: prod.id,
                    price: price,
                    old_price: 0,
                    variation: 0,
                    date: new Date().toISOString(),
                    column_key: 'price'
                 });
             }
         });

         if (historyPayload.length > 0) {
             await supabase.from('price_history').insert(historyPayload);
         }
      }
      
      toast({
        title: 'Importação concluída',
        description: `${newProductsList.length} itens importados.`,
      });
      
      setPage(0);
      getProducts(0);
      return true;
    } catch(err) {
      console.error(err);
      toast({
        title: 'Erro na importação',
        description: 'Falha ao importar alguns produtos.',
        variant: 'destructive'
      });
      return false;
    }
  }, [categoryId, toast, getProducts]);

  return {
    products,
    loading,
    error,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    importBulkProducts,
    refreshProducts: () => getProducts(0),
    loadMore,
    hasMore
  };
};
