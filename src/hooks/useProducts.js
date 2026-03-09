
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';
import { validateStockData } from '@/utils/validateStockData';

const ITEMS_PER_PAGE = 50;
const FETCH_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

const sortProductsByName = (items) => {
  return [...items].sort((a, b) => {
    const getName = (item) => {
        if (item.name) return item.name;
        if (item.data?.name) return item.data.name;
        if (item.data?.product) return item.data.product;
        return '';
    };
    
    const nameA = getName(a).toString().toLowerCase();
    const nameB = getName(b).toString().toLowerCase();
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });
};

export const useProducts = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const { toast } = useToast();
  
  const productsRef = useRef([]);
  const requestCache = useRef(new Map());
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setProducts([]);
    setPage(0);
    setHasMore(true);
    setTotalCount(0);
    setError(null);
    setLoading(false);
    setIsNextPageLoading(false);
    requestCache.current.clear();
  }, [categoryId]);

  const getProducts = useCallback(async (pageNum = 0, isRetry = false) => {
    if (!categoryId) return;
    
    const cacheKey = `${categoryId}-${pageNum}`;
    if (requestCache.current.get(cacheKey) === 'loading' && !isRetry) return;

    if (pageNum === 0 && abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (pageNum === 0) setLoading(true);
    else setIsNextPageLoading(true);
    
    setError(null);
    requestCache.current.set(cacheKey, 'loading');
    
    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let attempt = 0;
    let success = false;

    while (attempt <= MAX_RETRIES && !success) {
      try {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const needCount = pageNum === 0;

        const fetchPromise = supabase
            .from('products')
            .select(`id, category_id, data, name, created_at, updated_at, caixa_aberta, lote_minimo`, { count: needCount ? 'exact' : undefined })
            .eq('category_id', categoryId)
            .order('name', { ascending: true }) 
            .range(from, to)
            .abortSignal(signal);

        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Request timed out`)), FETCH_TIMEOUT)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const { data, error: supabaseError, count } = response || {};

        if (supabaseError) throw supabaseError;
        if (!data) throw new Error('Received null data');

        if (mountedRef.current) {
             const formattedProducts = data.map(p => {
                const rawStock = p.data?.stock || p.data?.estoque || 0;
                const rawLoteMinimo = p.lote_minimo !== undefined ? p.lote_minimo : (p.data?.lote_minimo || 0);
                
                const { estoque: cleanStock, lote_minimo: cleanLoteMinimo } = validateStockData(rawStock, rawLoteMinimo);

                return {
                  ...p.data,
                  stock: cleanStock,
                  id: p.id,
                  category_id: p.category_id,
                  name: p.name || p.data?.name || p.data?.product || '',
                  created_at: p.created_at,
                  updated_at: p.updated_at,
                  caixa_aberta: p.caixa_aberta || false,
                  data_caixa_aberta: p.data?.data_caixa_aberta || null,
                  lote_minimo: cleanLoteMinimo
                };
             });

             setProducts(prev => {
                let combined;
                if (pageNum === 0) combined = formattedProducts;
                else {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newItems = formattedProducts.filter(p => !existingIds.has(p.id));
                    combined = [...prev, ...newItems];
                }
                return sortProductsByName(combined);
             });

             if (needCount && count !== null) {
                 setTotalCount(count);
                 setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);
             } else {
                 setHasMore(data.length === ITEMS_PER_PAGE);
             }
        }

        requestCache.current.set(cacheKey, 'cached');
        success = true;

      } catch (err) {
        if (err.name === 'AbortError') {
             requestCache.current.delete(cacheKey); 
             return; 
        }

        attempt++;
        if (attempt <= MAX_RETRIES) {
             const delay = RETRY_DELAYS[attempt - 1] || 4000;
             await new Promise(resolve => setTimeout(resolve, delay));
        } else {
             if (mountedRef.current) {
                 setError(err);
                 if (pageNum === 0) {
                     toast({ title: 'Erro de conexão', description: 'Falha ao carregar dados.', variant: 'destructive' });
                 }
             }
             requestCache.current.delete(cacheKey);
        }
      }
    }

    if (mountedRef.current) {
        setLoading(false);
        setIsNextPageLoading(false);
    }
  }, [categoryId, toast]);

  const loadMore = useCallback(() => {
    if (loading || isNextPageLoading || !hasMore || error) return;
    const nextPage = page + 1;
    setPage(nextPage);
    getProducts(nextPage);
  }, [loading, isNextPageLoading, hasMore, page, getProducts, error]);

  const retryLoadMore = useCallback(() => {
     if (!hasMore && !error) return; 
     getProducts(page, true);
  }, [page, getProducts, hasMore, error]);

  const handleRealtimeUpdate = useCallback((payload) => {
    const getPayloadName = (p) => p.name || p.data?.name || p.data?.product || '';

    if (payload.eventType === 'INSERT') {
       if (payload.new.category_id !== categoryId) return;
       setProducts(prev => {
         if (prev.some(p => p.id === payload.new.id)) return prev;
         
         const rawStock = payload.new.data?.stock || 0;
         const rawLoteMinimo = payload.new.lote_minimo !== undefined ? payload.new.lote_minimo : (payload.new.data?.lote_minimo || 0);
         const { estoque: cleanStock, lote_minimo: cleanLoteMinimo } = validateStockData(rawStock, rawLoteMinimo);

         const newProduct = {
           ...payload.new.data,
           stock: cleanStock,
           id: payload.new.id,
           category_id: payload.new.category_id,
           name: getPayloadName(payload.new),
           created_at: payload.new.created_at,
           updated_at: payload.new.updated_at,
           caixa_aberta: payload.new.caixa_aberta || false,
           data_caixa_aberta: payload.new.data?.data_caixa_aberta || null,
           lote_minimo: cleanLoteMinimo
         };
         return sortProductsByName([...prev, newProduct]);
       });
    } else if (payload.eventType === 'UPDATE') {
       if (payload.new.category_id !== categoryId) {
          setProducts(prev => prev.filter(p => p.id !== payload.new.id));
          return;
       }
       setProducts(prev => {
         const rawStock = payload.new.data?.stock || 0;
         const rawLoteMinimo = payload.new.lote_minimo !== undefined ? payload.new.lote_minimo : (payload.new.data?.lote_minimo || 0);
         const { estoque: cleanStock, lote_minimo: cleanLoteMinimo } = validateStockData(rawStock, rawLoteMinimo);

         const exists = prev.some(p => p.id === payload.new.id);
         if (!exists) {
            const newProduct = {
               ...payload.new.data,
               stock: cleanStock,
               id: payload.new.id,
               category_id: payload.new.category_id,
               name: getPayloadName(payload.new),
               created_at: payload.new.created_at,
               updated_at: payload.new.updated_at,
               caixa_aberta: payload.new.caixa_aberta || false,
               data_caixa_aberta: payload.new.data?.data_caixa_aberta || null,
               lote_minimo: cleanLoteMinimo
            };
            return sortProductsByName([...prev, newProduct]);
         }
         const updated = prev.map(p => {
           if (p.id === payload.new.id) {
             return { 
                 ...p, 
                 ...payload.new.data,
                 stock: cleanStock, 
                 name: getPayloadName(payload.new),
                 updated_at: payload.new.updated_at,
                 caixa_aberta: payload.new.caixa_aberta || false,
                 data_caixa_aberta: payload.new.data?.data_caixa_aberta || null,
                 lote_minimo: cleanLoteMinimo
             };
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

  useEffect(() => {
    if (categoryId) getProducts(0);
  }, [categoryId, getProducts]);

  const addProduct = useCallback(async (productData) => {
    try {
        const { priceHistory, lote_minimo, ...cleanData } = productData;
        if (!categoryId) throw new Error("ID da categoria não encontrado.");

        const { data, error } = await supabase
          .from('products')
          .insert([{ 
             category_id: categoryId, 
             data: cleanData,
             lote_minimo: lote_minimo !== undefined ? lote_minimo : (cleanData.lote_minimo || 0)
          }])
          .select()
          .single();

        if (error) throw error;
        toast({ title: 'Produto adicionado com sucesso!' });
        return data;
    } catch (err) {
        toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' });
        throw err;
    }
  }, [categoryId, toast]);

  const updateProduct = useCallback(async (id, updates) => {
    try {
      console.log(`\n[updateProduct Hook] (1) Called for ID: ${id} with updates:`, updates);
      
      const { data: current, error: fetchError } = await supabase.from('products').select('data, lote_minimo').eq('id', id).single();
      if (fetchError || !current) throw new Error("Product not found");
      console.log(`[updateProduct Hook] Current product data fetched successfully.`);

      const { lote_minimo, ...dataUpdates } = updates;
      const mergedData = { ...current.data, ...dataUpdates };

      const updatePayload = { data: mergedData, updated_at: new Date().toISOString() };
      if (lote_minimo !== undefined) {
         updatePayload.lote_minimo = lote_minimo;
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
          console.error(`[updateProduct Hook] (5) Error updating product record:`, updateError);
          throw updateError;
      }
      
      toast({ title: 'Produto atualizado' });
      
      // Task 1 & 2: Fix price history recording with debugging
      // Capture any numeric field updates and log to price_history
      for (const [key, newValue] of Object.entries(dataUpdates)) {
          // Check if the value is a number or numeric string to avoid logging text changes
          if (typeof newValue === 'number' || (!isNaN(parseFloat(newValue)) && newValue !== '')) {
              const newNum = parseFloat(newValue);
              const oldNum = parseFloat(current.data[key]);
              
              // If it's a valid number and it actually changed, log the history
              if (!isNaN(newNum) && oldNum !== newNum && typeof newValue !== 'boolean') {
                  const oldPriceValue = isNaN(oldNum) ? 0 : oldNum;
                  
                  // Calculate percentage variation
                  let variationValue = 0;
                  if (oldPriceValue > 0) {
                      variationValue = ((newNum - oldPriceValue) / oldPriceValue) * 100;
                  } else if (newNum > 0) {
                      variationValue = 100; // if old price was 0 and it increased
                  } else if (newNum < 0) {
                      variationValue = -100; // if old price was 0 and it decreased
                  }

                  console.log(`[updateProduct Hook] (2) Price change detected for column '${key}': old=${oldPriceValue}, new=${newNum}, variation=${variationValue.toFixed(2)}%`);
                  
                  const historyRecord = {
                     product_id: id,
                     price: newNum,
                     old_price: oldPriceValue,
                     variation: variationValue,
                     date: new Date().toISOString(),
                     column_key: key
                  };

                  console.log(`[updateProduct Hook] (3) Before inserting into price_history:`, historyRecord);

                  // Await the insert so it happens reliably before returning
                  const { error: historyErr } = await supabase.from('price_history').insert([historyRecord]);
                  
                  if (historyErr) {
                      console.error(`[updateProduct Hook] (5) Failed to insert into price_history:`, historyErr);
                  } else {
                      console.log(`[updateProduct Hook] (4) Successfully inserted price_history record for '${key}'`);
                  }
              }
          }
      }
    } catch (err) {
      console.error(`[updateProduct Hook] (5) Exception caught:`, err);
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [toast]);
  
  const updateCaixaAberta = useCallback(async (id, value) => {
      try {
          const { data: current } = await supabase.from('products').select('data').eq('id', id).single();
          const currentData = current?.data || {};
          
          const newData = { ...currentData };
          if (value) {
              newData.data_caixa_aberta = new Date().toISOString();
          } else {
              newData.data_caixa_aberta = null;
          }

          const { error } = await supabase
            .from('products')
            .update({ 
                caixa_aberta: value,
                data: newData
            })
            .eq('id', id);
            
          if (error) throw error;
      } catch (err) {
          toast({ title: 'Erro ao atualizar caixa', description: err.message, variant: 'destructive' });
          throw err;
      }
  }, [toast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido' });
    } catch (err) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  const deleteAllProducts = useCallback(async () => {
     try {
         setIsDeletingAll(true);
         const { error } = await supabase.from('products').delete().eq('category_id', categoryId);
         if (error) throw error;
         
         setProducts([]);
         requestCache.current.clear();
         toast({ title: 'Categoria limpa', description: 'Todos os produtos foram removidos.' });
     } catch (err) {
         toast({ title: 'Erro ao limpar produtos', description: err.message, variant: 'destructive' });
     } finally {
         setIsDeletingAll(false);
     }
  }, [categoryId, toast]);

  return {
    products,
    loading,
    isNextPageLoading,
    error,
    totalCount,
    isDeletingAll,
    getProducts,
    addProduct,
    updateProduct,
    updateCaixaAberta,
    deleteProduct,
    deleteAllProducts,
    loadMore,
    retryLoadMore,
    hasMore
  };
};
