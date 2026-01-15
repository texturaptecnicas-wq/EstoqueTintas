
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useRealtimeSync = (onHistoryChange) => {
  const { toast } = useToast();
  // Use a ref to store the callback to prevent effect re-triggering
  const callbackRef = useRef(onHistoryChange);

  useEffect(() => {
    callbackRef.current = onHistoryChange;
  }, [onHistoryChange]);

  useEffect(() => {
    const channel = supabase
      .channel('price-history-sync')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'price_history'
        },
        (payload) => {
          // Validation: Ensure payload has necessary data before processing
          if (!payload || !payload.new || !payload.new.product_id) {
             console.warn("Received invalid price history payload", payload);
             return;
          }

          if (callbackRef.current) {
            callbackRef.current(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Silent error logging to console, toast only if critical in valid context
          console.error('Price history sync error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]); // callbackRef is stable

  return {};
};
