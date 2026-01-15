
import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useRealtimeSync = (onHistoryChange) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!onHistoryChange) return;

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
          // Pass the payload to the callback to handle state updates
          onHistoryChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Price history sync connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Price history sync error');
          toast({
            title: 'Erro de conexão',
            description: 'Falha ao sincronizar histórico de preços.',
            variant: 'destructive',
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onHistoryChange, toast]);

  return {};
};
