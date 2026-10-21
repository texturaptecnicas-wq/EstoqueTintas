import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { addDays, isBefore, differenceInDays } from 'date-fns';

const checkNeedsReorder = (product) => {
  if (!product) return false;
  const { last_purchase_date, prazo_recompra_valor, prazo_recompra_unidade } = product;
  
  if (!last_purchase_date || !prazo_recompra_valor || !prazo_recompra_unidade) {
    return false;
  }

  try {
    const purchaseDate = new Date(last_purchase_date);
    if (isNaN(purchaseDate.getTime())) return false;

    const valor = parseFloat(prazo_recompra_valor);
    if (isNaN(valor) || valor <= 0) return false;

    let daysToAdd = 0;
    switch (prazo_recompra_unidade) {
      case 'dias':
        daysToAdd = valor;
        break;
      case 'semanas':
        daysToAdd = valor * 7;
        break;
      case 'meses':
        daysToAdd = valor * 30;
        break;
      default:
        return false;
    }

    const reorderDate = addDays(purchaseDate, daysToAdd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return isBefore(reorderDate, today) || differenceInDays(reorderDate, today) <= 0;
  } catch (error) {
    console.error("Error calculating reorder alert in hook:", error);
    return false;
  }
};

export const useReorderAlertCount = (categoryId, productsArray = null) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!categoryId) return;

    let activeProducts = [];

    const updateCount = (prods) => {
      const activeAlerts = prods.filter(checkNeedsReorder).length;
      setCount(activeAlerts);
    };

    const fetchInitial = async () => {
      if (productsArray) {
        activeProducts = [...productsArray];
        updateCount(activeProducts);
      } else {
        const { data } = await supabase
          .from('products')
          .select('id, last_purchase_date, prazo_recompra_valor, prazo_recompra_unidade')
          .eq('category_id', categoryId);
          
        if (data) {
          activeProducts = data;
          updateCount(activeProducts);
        }
      }
    };

    fetchInitial();

    const channel = supabase.channel(`public:products:alerts:${categoryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `category_id=eq.${categoryId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            activeProducts.push(payload.new);
          } else if (payload.eventType === 'UPDATE') {
            activeProducts = activeProducts.map(p => 
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            );
          } else if (payload.eventType === 'DELETE') {
            activeProducts = activeProducts.filter(p => p.id !== payload.old.id);
          }
          updateCount(activeProducts);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  useEffect(() => {
    if (productsArray) {
      const activeAlerts = productsArray.filter(checkNeedsReorder).length;
      setCount(activeAlerts);
    }
  }, [productsArray]);

  return count;
};