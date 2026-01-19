
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';

const ITEMS_PER_PAGE = 50;
const FETCH_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

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
  const [loading, setLoading] = useState(false); // Global loading (initial)
  const [isNextPageLoading, setIsNextPageLoading] = useState(false); // Pagination loading
  const [error, setError] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const { toast } = useToast();
  
  // Refs for stability
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

  // Reset state when category changes
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
    if (!categoryId) {
        return;
    }
    
    // Prevent duplicate requests
    const cacheKey = `${categoryId}-${pageNum}`;
    if (requestCache.current.get(cacheKey) === 'loading' && !isRetry) {
        console.log(`[FETCH] Skipped: Request for page ${pageNum} already in progress`);
        return;
    }

    // Cancel previous request if we are restarting or jumping (mostly for page 0)
    if (pageNum === 0 && abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Set Loading States
    if (pageNum === 0) {
        setLoading(true);
    } else {
        setIsNextPageLoading(true);
    }
    
    setError(null);
    requestCache.current.set(cacheKey, 'loading');
    
    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    console.log(`[FETCH] Starting. Page: ${pageNum}, Range: ${from}-${to}, Category: ${categoryId}`);

    let attempt = 0;
    let success = false;

    while (attempt <= MAX_RETRIES && !success) {
      try {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const queryStart = Date.now();

        // OPTIMIZATION: Only fetch exact count on first page. 
        // For deep pagination (offset > 0), getting count is expensive and unnecessary for 'hasMore' logic.
        const needCount = pageNum === 0;

        // Promise for the actual fetch
        const fetchPromise = supabase
            .from('products')
            .select(`id, category_id, data, name, created_at, updated_at`, { count: needCount ? 'exact' : undefined })
            .eq('category_id', categoryId)
            .order('name', { ascending: true }) 
            .range(from, to)
            .abortSignal(signal);

        // Promise for timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Request timed out after ${FETCH_TIMEOUT}ms`)), FETCH_TIMEOUT)
        );

        // Race: Fetch vs Timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Destructure carefully
        const { data, error: supabaseError, count } = response || {};
        const duration = Date.now() - queryStart;

        // --- ERROR HANDLING ---
        if (supabaseError) {
            console.error(`[ERROR] API Error (Page ${pageNum}, Attempt ${attempt + 1}):`, supabaseError);
            throw supabaseError;
        }

        // --- VALIDATION ---
        if (!data) throw new Error('Received null data from Supabase');
        if (!Array.isArray(data)) throw new Error(`Invalid structure: expected array, got ${typeof data}`);

        if (duration > 10000) {
            console.warn(`[PERFORMANCE] Slow request: ${duration}ms for page ${pageNum}`);
        }

        // --- SUCCESS PROCESSING ---
        if (mountedRef.current) {
             const formattedProducts = data.map(p => ({
                ...p.data,
                id: p.id,
                category_id: p.category_id,
                name: p.name || p.data?.name || p.data?.product || '', // Enhanced fallback
                created_at: p.created_at,
                updated_at: p.updated_at
             }));

             setProducts(prev => {
                let combined;
                if (pageNum === 0) {
                    combined = formattedProducts;
                } else {
                    // Deduplicate
                    const existingIds = new Set(prev.map(p => p.id));
                    const newItems = formattedProducts.filter(p => !existingIds.has(p.id));
                    combined = [...prev, ...newItems];
                }
                return sortProductsByName(combined);
             });

             // Update Pagination
             if (needCount && count !== null) {
                 setTotalCount(count);
                 setHasMore(count > (pageNum + 1) * ITEMS_PER_PAGE);
             } else {
                 // Determine hasMore by checking if we received a full page
                 setHasMore(data.length === ITEMS_PER_PAGE);
             }
        }

        console.log(`[FETCH] Success Page ${pageNum}. Items: ${data.length}. Duration: ${duration}ms`);
        requestCache.current.set(cacheKey, 'cached');
        success = true;

      } catch (err) {
        if (err.name === 'AbortError') {
             console.log(`[FETCH] Aborted page ${pageNum}.`);
             requestCache.current.delete(cacheKey); 
             return; 
        }

        console.error(`[FETCH] Failed Page ${pageNum}, Attempt ${attempt + 1}. Error: ${err.message}`);
        attempt++;
        
        if (attempt <= MAX_RETRIES) {
             const delay = RETRY_DELAYS[attempt - 1] || 4000;
             console.log(`[RETRY] Waiting ${delay}ms...`);
             await new Promise(resolve => setTimeout(resolve, delay));
        } else {
             // Final Failure
             console.error('[FETCH] All retries exhausted.');
             if (mountedRef.current) {
                 setError(err); // This triggers UI error state in the list
                 
                 let userMsg = 'Falha ao carregar dados.';
                 if (err.message.includes('timed out')) userMsg = 'Tempo limite excedido.';
                 
                 // Only show toast if it's not a background pagination failure (which shows inline)
                 if (pageNum === 0) {
                     toast({
                        title: 'Erro de conexão',
                        description: userMsg,
                        variant: 'destructive'
                     });
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
    // Safety checks before loading more
    if (loading || isNextPageLoading || !hasMore || error) {
        return;
    }
    
    const nextPage = page + 1;
    setPage(nextPage);
    getProducts(nextPage);
  }, [loading, isNextPageLoading, hasMore, page, getProducts, error]);

  const retryLoadMore = useCallback(() => {
     // Specifically for retrying the LAST failed page
     if (!hasMore && !error) return; 
     
     // If we have an error, we assume the current 'page' failed.
     // We don't increment page, we just retry 'page'.
     console.log(`[RETRY MANUAL] Retrying page ${page}`);
     getProducts(page, true);
  }, [page, getProducts, hasMore, error]);


  // --- REALTIME HANDLER ---
  const handleRealtimeUpdate = useCallback((payload) => {
    // Helper to extract name safely from payload, with fallbacks
    const getPayloadName = (p) => p.name || p.data?.name || p.data?.product || '';

    if (payload.eventType === 'INSERT') {
       if (payload.new.category_id !== categoryId) return;
       setProducts(prev => {
         if (prev.some(p => p.id === payload.new.id)) return prev;
         const newProduct = {
           ...payload.new.data,
           id: payload.new.id,
           category_id: payload.new.category_id,
           name: getPayloadName(payload.new),
           created_at: payload.new.created_at,
           updated_at: payload.new.updated_at
         };
         return sortProductsByName([...prev, newProduct]);
       });
    } else if (payload.eventType === 'UPDATE') {
       if (payload.new.category_id !== categoryId) {
          setProducts(prev => prev.filter(p => p.id !== payload.new.id));
          return;
       }
       setProducts(prev => {
         const exists = prev.some(p => p.id === payload.new.id);
         if (!exists) {
            const newProduct = {
               ...payload.new.data,
               id: payload.new.id,
               category_id: payload.new.category_id,
               name: getPayloadName(payload.new),
               created_at: payload.new.created_at,
               updated_at: payload.new.updated_at
            };
            return sortProductsByName([...prev, newProduct]);
         }
         const updated = prev.map(p => {
           if (p.id === payload.new.id) {
             return { 
                 ...p, 
                 ...payload.new.data, 
                 name: getPayloadName(payload.new),
                 updated_at: payload.new.updated_at 
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

  // Initial Load
  useEffect(() => {
    if (categoryId) {
        getProducts(0);
    }
  }, [categoryId, getProducts]);

  // --- CRUD OPERATIONS ---
  const addProduct = useCallback(async (productData) => {
    try {
        const { priceHistory, ...cleanData } = productData;
        // NOTE: We no longer extract 'name' or 'product' to send as a separate 'name' column.
        // We rely on Supabase to handle the 'name' column generation via database triggers or defaults,
        // or we rely on the 'data' JSONB column for the name.

        if (!categoryId) throw new Error("ID da categoria não encontrado.");

        const { data, error } = await supabase
          .from('products')
          .insert([{
            category_id: categoryId,
            data: cleanData
            // name field REMOVED from insert as requested
          }])
          .select()
          .single();

        if (error) {
             console.error('[ADD PRODUCT] Supabase error:', error);
             throw error;
        }

        console.log('[ADD PRODUCT] Success:', data);
        toast({ title: 'Produto adicionado com sucesso!' });
        return data;
    } catch (err) {
        console.error('[ADD] Error:', err);
        toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' });
        throw err;
    }
  }, [categoryId, toast]);

  const updateProduct = useCallback(async (id, updates) => {
    try {
      const { data: current } = await supabase.from('products').select('data').eq('id', id).single();
      if (!current) throw new Error("Product not found");

      const mergedData = { ...current.data, ...updates };
      const productName = mergedData.name || mergedData.product || '';

      const { error } = await supabase
        .from('products')
        .update({ 
            data: mergedData, 
            name: productName,
            updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Produto atualizado' });
      
      if (updates.price) {
          supabase.from('price_history').insert({
             product_id: id,
             price: parseFloat(updates.price),
             date: new Date().toISOString(),
             column_key: 'price'
          }).then();
      }
    } catch (err) {
      console.error('[UPDATE] Error:', err);
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [toast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido' });
    } catch (err) {
      console.error('[DELETE] Error:', err);
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
         console.error('[DELETE ALL] Error:', err);
         toast({ title: 'Erro ao limpar produtos', description: err.message, variant: 'destructive' });
     } finally {
         setIsDeletingAll(false);
     }
  }, [categoryId, toast]);

  return {
    products,
    loading,         // Initial loading
    isNextPageLoading, // Pagination loading
    error,
    totalCount,
    isDeletingAll,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    loadMore,
    retryLoadMore,  // New retry function
    hasMore
  };
};
