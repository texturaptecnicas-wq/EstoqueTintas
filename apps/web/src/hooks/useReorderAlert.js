import { addDays, isBefore, differenceInDays } from 'date-fns';

export const useReorderAlert = (product) => {
  if (!product) return { needsReorder: false, reorderDate: null, daysUntilReorder: null };

  const { last_purchase_date, prazo_recompra_valor, prazo_recompra_unidade } = product;

  if (!last_purchase_date || !prazo_recompra_valor || !prazo_recompra_unidade) {
    return { needsReorder: false, reorderDate: null, daysUntilReorder: null };
  }

  try {
    const purchaseDate = new Date(last_purchase_date);
    if (isNaN(purchaseDate.getTime())) {
      return { needsReorder: false, reorderDate: null, daysUntilReorder: null };
    }

    const valor = parseFloat(prazo_recompra_valor);
    if (isNaN(valor) || valor <= 0) {
      return { needsReorder: false, reorderDate: null, daysUntilReorder: null };
    }

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
        return { needsReorder: false, reorderDate: null, daysUntilReorder: null };
    }

    const reorderDate = addDays(purchaseDate, daysToAdd);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate comparison
    
    // Check if reorderDate is before or exactly today
    const needsReorder = isBefore(reorderDate, today) || differenceInDays(reorderDate, today) <= 0;
    const daysUntil = differenceInDays(reorderDate, today);

    return { needsReorder, reorderDate, daysUntilReorder: daysUntil };
  } catch (error) {
    console.error("Error calculating reorder alert:", error);
    return { needsReorder: false, reorderDate: null, daysUntilReorder: null };
  }
};