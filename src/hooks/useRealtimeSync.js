
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useRealtimeSync = (onHistoryChange) => {
  // Use refs to store mutable state without triggering re-effects
  const callbackRef = useRef(onHistoryChange);
  const bufferRef = useRef([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    callbackRef.current = onHistoryChange;
  }, [onHistoryChange]);

  useEffect(() => {
    // Optimization: Process buffered events in batch
    const processBuffer = () => {
      if (bufferRef.current.length === 0) return;
      
      const events = [...bufferRef.current];
      bufferRef.current = []; // Clear buffer
      
      // Request Animation Frame for smoother UI updates during heavy sync
      requestAnimationFrame(() => {
        if (callbackRef.current) {
          // Process unique events to avoid duplicate state updates
          // For INSERTs, we can just pass them. For UPDATEs on same ID, take latest.
          const uniqueUpdates = new Map();
          const inserts = [];
          const deletes = [];

          events.forEach(event => {
            if (event.eventType === 'INSERT') inserts.push(event);
            else if (event.eventType === 'DELETE') deletes.push(event);
            else if (event.eventType === 'UPDATE') uniqueUpdates.set(event.new.id, event);
          });

          // Dispatch consolidated updates
          inserts.forEach(e => callbackRef.current(e));
          deletes.forEach(e => callbackRef.current(e));
          uniqueUpdates.forEach(e => callbackRef.current(e));
        }
      });
    };

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
           // Basic validation
           if (!payload || !payload.new && !payload.old) return;

           // Add to buffer
           bufferRef.current.push(payload);

           // Debounce processing (500ms window)
           if (timeoutRef.current) clearTimeout(timeoutRef.current);
           timeoutRef.current = setTimeout(processBuffer, 500);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime sync connection error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []); // Empty dependency array ensures single subscription

  return {};
};
