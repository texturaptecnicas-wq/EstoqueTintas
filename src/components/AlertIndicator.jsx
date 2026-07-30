
import React from 'react';

const AlertIndicator = ({ categoryName, count }) => {
  if (count <= 0) return null;
  if (!categoryName?.toLowerCase().includes('insumo')) return null;

  return (
    <span className="alert-pulse ml-2 inline-flex items-center justify-center">
      <span className="alert-badge alert-shake" title={`${count} itens precisam de recompra`}>
        <span className="mr-1 text-[10px]">🔴</span>
        <span>{count}</span>
      </span>
    </span>
  );
};

export default AlertIndicator;
