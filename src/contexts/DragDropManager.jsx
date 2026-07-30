
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DragDropContext = createContext(null);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropManager');
  }
  return context;
};

const ROW_ORDER_KEY = 'erp-row-order';
const COLUMN_ORDER_KEY = 'erp-column-order';

export const DragDropManager = ({ children, products, columns, categoryId }) => {
  const [rowOrder, setRowOrder] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);

  // Load from local storage exclusively based on categoryId changes
  useEffect(() => {
    if (!categoryId) {
      setRowOrder([]);
      setColumnOrder([]);
      return;
    }

    try {
      const storedRows = localStorage.getItem(`${ROW_ORDER_KEY}-${categoryId}`);
      setRowOrder(storedRows ? JSON.parse(storedRows) : []);
      
      const storedCols = localStorage.getItem(`${COLUMN_ORDER_KEY}-${categoryId}`);
      setColumnOrder(storedCols ? JSON.parse(storedCols) : []);
    } catch {
      setRowOrder([]);
      setColumnOrder([]);
    }
  }, [categoryId]);

  useEffect(() => {
    if (!products || products.length === 0 || !categoryId) {
      return;
    }

    const currentProductIds = products.map(p => p.id);
    const existingIds = rowOrder.filter(id => currentProductIds.includes(id));
    const newIds = currentProductIds.filter(id => !rowOrder.includes(id));
    const updatedOrder = [...existingIds, ...newIds];

    if (JSON.stringify(updatedOrder) !== JSON.stringify(rowOrder)) {
      setRowOrder(updatedOrder);
    }
  }, [products, categoryId]);

  useEffect(() => {
    if (!columns || columns.length === 0 || !categoryId) {
      return;
    }

    const currentColumnKeys = columns.map(c => c.key);
    const existingKeys = columnOrder.filter(key => currentColumnKeys.includes(key));
    const newKeys = currentColumnKeys.filter(key => !columnOrder.includes(key));
    const updatedOrder = [...existingKeys, ...newKeys];

    if (JSON.stringify(updatedOrder) !== JSON.stringify(columnOrder)) {
      setColumnOrder(updatedOrder);
    }
  }, [columns, categoryId]);

  useEffect(() => {
    if (categoryId && rowOrder.length > 0) {
      try {
        localStorage.setItem(`${ROW_ORDER_KEY}-${categoryId}`, JSON.stringify(rowOrder));
      } catch (err) {
        console.error('Failed to save row order:', err);
      }
    }
  }, [rowOrder, categoryId]);

  useEffect(() => {
    if (categoryId && columnOrder.length > 0) {
      try {
        localStorage.setItem(`${COLUMN_ORDER_KEY}-${categoryId}`, JSON.stringify(columnOrder));
      } catch (err) {
        console.error('Failed to save column order:', err);
      }
    }
  }, [columnOrder, categoryId]);

  const reorderRows = useCallback((sourceIndex, destinationIndex) => {
    setRowOrder(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      return result;
    });
  }, []);

  const reorderColumns = useCallback((sourceIndex, destinationIndex) => {
    setColumnOrder(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      return result;
    });
  }, []);

  const getSortedProducts = useCallback(() => {
    if (!products || products.length === 0) return [];
    if (rowOrder.length === 0) return products;

    const orderMap = new Map(rowOrder.map((id, index) => [id, index]));
    return [...products].sort((a, b) => {
      const indexA = orderMap.get(a.id);
      const indexB = orderMap.get(b.id);
      if (indexA === undefined && indexB === undefined) return 0;
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;
      return indexA - indexB;
    });
  }, [products, rowOrder]);

  const getSortedColumns = useCallback(() => {
    if (!columns || columns.length === 0) return [];
    if (columnOrder.length === 0) return columns;

    const orderMap = new Map(columnOrder.map((key, index) => [key, index]));
    return [...columns].sort((a, b) => {
      const indexA = orderMap.get(a.key);
      const indexB = orderMap.get(b.key);
      if (indexA === undefined && indexB === undefined) return 0;
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;
      return indexA - indexB;
    });
  }, [columns, columnOrder]);

  const value = {
    rowOrder,
    columnOrder,
    reorderRows,
    reorderColumns,
    getSortedProducts,
    getSortedColumns
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};

export default DragDropManager;
