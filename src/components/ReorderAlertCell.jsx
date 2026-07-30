
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useReorderAlert } from '@/hooks/useReorderAlert';

const ReorderAlertCell = ({ product }) => {
  const { needsReorder } = useReorderAlert(product);

  if (!needsReorder) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded shadow-sm text-[10px] uppercase alert-badge-recomprar ml-2 whitespace-nowrap shrink-0 pointer-events-none z-10">
      <AlertTriangle className="w-3 h-3" />
      <span>Recomprar</span>
    </div>
  );
};

export default ReorderAlertCell;
