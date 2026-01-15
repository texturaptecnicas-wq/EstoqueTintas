
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeSync } from './useRealtimeSync';

export const useProducts = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const getProducts = useCallback(async () => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      
      // Fetch products and their price history joined
      const { data, error: fetchError } = await supabase
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
        `)
        .eq('category_id', categoryId);

      if (fetchError) throw fetchError;

      // Transform data structure to match UI expectations
      const formattedProducts = data.map(p => ({
        ...p.data, // Spread the JSONB data
        id: p.id,
        category_id: p.category_id,
        updated_at: p.updated_at,
        priceHistory: p.price_history || []
      }));

      setProducts(formattedProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  // Handle Realtime Price History Updates
  const handleHistoryUpdate = useCallback((payload) => {
    if (payload.eventType === 'INSERT') {
      setProducts(currentProducts => 
        currentProducts.map(p => {
          if (p.id === payload.new.product_id) {
            // Check if this history entry already exists to prevent dupes
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

  // Initialize Price History Sync Hook
  useRealtimeSync(handleHistoryUpdate);

  // Subscribe to Products Table changes
  useEffect(() => {
    if (!categoryId) return;

    getProducts();

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
            // New product added
            const newProduct = {
              ...payload.new.data,
              id: payload.new.id,
              category_id: payload.new.category_id,
              updated_at: payload.new.updated_at,
              priceHistory: [] // New product starts with empty history until fetched
            };
            setProducts(prev => [newProduct, ...prev]);

          } else if (payload.eventType === 'UPDATE') {
            // Product updated
            setProducts(prev => prev.map(p => {
              if (p.id === payload.new.id) {
                return {
                  ...p,
                  ...payload.new.data, // Update fields from JSONB
                  updated_at: payload.new.updated_at
                  // Preserve existing priceHistory as it comes from a different table/stream
                };
              }
              return p;
            }));

          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to products');
          toast({
             title: "Erro de conexão",
             description: "Perda de conexão com o servidor. Tentando reconectar...",
             variant: "destructive"
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId, getProducts, toast]);

  const addProduct = async (productData) => {
    try {
      // Remove any temporary priceHistory from data blob before saving
      const { priceHistory, ...cleanData } = productData;

      const { data, error } = await supabase
        .from('products')
        .insert([{
          category_id: categoryId,
          data: cleanData
        }])
        .select()
        .single();

      if (error) throw error;

      // Handle Initial Price History if price is set
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
      setError(err.message);
      toast({
        title: 'Erro ao adicionar',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const updateProduct = async (id, updates) => {
    try {
      const currentProduct = products.find(p => p.id === id);
      if (!currentProduct) return;

      // Detect Price Changes for History
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

      // Prepare data for update (exclude id, priceHistory, metadata from the JSON blob)
      const { id: _, category_id: __, priceHistory: ___, updated_at: ____, ...existingData } = currentProduct;
      const mergedData = { ...existingData, ...updates };

      const { error } = await supabase
        .from('products')
        .update({
          data: mergedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Save history entries concurrently
      await Promise.all(historyPromises);

      // Local state update handled by Realtime subscription usually, 
      // but we can optimistically update for better UX if needed. 
      // For now relying on Realtime as requested.
      
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const deleteProduct = async (id) => {
    try {
      // First delete history (cascade usually handles this but good to be safe if no cascade)
      await supabase.from('price_history').delete().eq('product_id', id);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Produto removido',
        description: 'Produto removido com sucesso!',
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao remover',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const deleteAllProducts = async () => {
    try {
      // Delete all products for this category
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('category_id', categoryId);

      if (error) throw error;

      toast({
        title: 'Todos os produtos removidos',
        description: 'A lista de produtos foi limpa com sucesso.',
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao limpar lista',
        description: err.message,
        variant: 'destructive'
      });
    }
  };
  
  const importBulkProducts = async (newProductsList) => {
    try {
      const promises = newProductsList.map(async (p) => {
         const { price, ...rest } = p;
         const { data: prodData, error } = await supabase
            .from('products')
            .insert({
               category_id: categoryId,
               data: { ...rest, price }
            })
            .select()
            .single();
         
         if (error) throw error;

         if (price) {
            await supabase.from('price_history').insert({
               product_id: prodData.id,
               price: parseFloat(price),
               old_price: 0,
               variation: 0,
               date: new Date().toISOString(),
               column_key: 'price'
            });
         }
      });

      await Promise.all(promises);
      
      toast({
        title: 'Importação concluída',
        description: `${newProductsList.length} itens importados.`,
      });
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
  };

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
    refreshProducts: getProducts
  };
};
