import { useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useCells = () => {
  const { toast } = useToast();

  const updateCell = useCallback(async (productId, updates) => {
    try {
      // 1. Fetch current data for safety (Optimistic locking or just merge safety)
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('data')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentProduct) throw new Error("Produto não encontrado");

      // 2. Merge updates
      const mergedData = { ...currentProduct.data, ...updates };

      // 3. Update Supabase
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
            data: mergedData, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', productId);

      if (updateError) throw updateError;
      
      // 4. Handle side effects (Price history)
      if (updates.price !== undefined) {
         // Fire and forget
         supabase.from('price_history').insert({
             product_id: productId,
             price: parseFloat(updates.price),
             date: new Date().toISOString(),
             column_key: 'price'
         }).then(({error}) => {
             if (error) console.error("Failed to record price history", error);
         });
      }

      // Success is mostly silent or small toast in UI, or optimistic update handled by parent
      return true;

    } catch (err) {
      console.error('Update cell error:', err);
      toast({ title: 'Erro ao salvar alteração', description: err.message, variant: 'destructive' });
      throw err;
    }
  }, [toast]);

  return { updateCell };
};