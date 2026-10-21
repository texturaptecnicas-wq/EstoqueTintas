import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const usePriceHistory = (productId) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('price_history')
          .select('*')
          .eq('product_id', productId)
          .order('date', { ascending: false });

        if (fetchError) throw fetchError;

        if (isMounted) {
          setPriceHistory(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          console.error('Error fetching price history:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  return { priceHistory, loading, error };
};