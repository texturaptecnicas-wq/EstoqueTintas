
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useRealtimeSync = (onEvent) => {
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    console.log('Setting up Realtime Sync...');
    
    const channel = supabase
      .channel('products-global-sync')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public', 
          table: 'products' 
        },
        (payload) => {
           // Immediate execution without debouncing or buffering
           // This ensures multi-device sync happens instantly
           if (callbackRef.current) {
             callbackRef.current(payload);
           }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected!');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime sync connection error');
        }
      });

    return () => {
      console.log('Cleaning up Realtime Sync...');
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array ensures single subscription per component mount

  return {};
};
