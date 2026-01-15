
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'paint_stock_products_v2';

export const useProducts = (categoryId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const getProducts = useCallback(() => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      let allData = {};
      
      if (stored) {
        allData = JSON.parse(stored);
      } else {
        // Migration check: check for old key
        const oldData = localStorage.getItem('paint_stock_products');
        if (oldData) {
          allData = { 'default': JSON.parse(oldData) }; // Assume old data belongs to default 'Tintas'
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        }
      }

      const categoryProducts = allData[categoryId] || [];
      setProducts(categoryProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    getProducts();
  }, [getProducts, categoryId]);

  const saveToStorage = (newProducts) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allData = stored ? JSON.parse(stored) : {};
      
      allData[categoryId] = newProducts;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      setProducts(newProducts);
      return true;
    } catch (err) {
      console.error('Error saving to localStorage:', err);
      setError('Erro ao salvar dados');
      toast({
        title: 'Erro de armazenamento',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const addProduct = (productData) => {
    try {
      const newProduct = {
        ...productData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        priceHistory: [] // Initialize empty history
      };
      
      // Initial price history record if price exists
      if (newProduct.price) {
         newProduct.priceHistory.push({
            date: new Date().toISOString(),
            price: parseFloat(newProduct.price),
            oldPrice: 0,
            variation: 0,
            note: 'Initial Price'
         });
      }

      const newProducts = [newProduct, ...products];
      if (saveToStorage(newProducts)) {
        toast({
          title: 'Produto adicionado',
          description: 'Produto adicionado com sucesso!',
        });
        return newProduct;
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao adicionar',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const updateProduct = (id, updates) => {
    try {
      const newProducts = products.map(p => {
        if (p.id === id) {
          const updatedProduct = {
            ...p,
            ...updates,
            updated_at: new Date().toISOString()
          };

          // Price History Tracking Logic
          // Detect changes in fields that look like prices
          const priceKeys = ['price', 'valor', 'custo', 'cost', 'sale_price'];
          
          Object.keys(updates).forEach(key => {
            // Check if key is a price key OR if key ends with _price, etc.
            const isPriceField = priceKeys.includes(key) || 
                                 key.toLowerCase().includes('price') || 
                                 key.toLowerCase().includes('valor');
            
            if (isPriceField) {
               const oldVal = parseFloat(p[key]);
               const newVal = parseFloat(updates[key]);
               
               // Only log if valid numbers and actually changed
               if (!isNaN(oldVal) && !isNaN(newVal) && oldVal !== newVal) {
                  const variation = oldVal === 0 ? 100 : ((newVal - oldVal) / oldVal) * 100;
                  
                  const historyEntry = {
                    date: new Date().toISOString(),
                    price: newVal,
                    oldPrice: oldVal,
                    variation: variation,
                    column: key
                  };

                  if (!updatedProduct.priceHistory) {
                    updatedProduct.priceHistory = [];
                  }
                  updatedProduct.priceHistory.push(historyEntry);
                  
                  // Keep history reasonable size (last 50 entries)
                  if (updatedProduct.priceHistory.length > 50) {
                     updatedProduct.priceHistory = updatedProduct.priceHistory.slice(-50);
                  }
               }
            }
          });

          return updatedProduct;
        }
        return p;
      });

      if (saveToStorage(newProducts)) {
        // Silent success for frequent updates (like stock buttons), only toast for specific cases if needed
        // Or keep existing behavior. For now, we keep the toast from previous file version.
        /* 
        toast({
          title: 'Produto atualizado',
          description: 'Produto atualizado com sucesso!',
        });
        */
        const updated = newProducts.find(p => p.id === id);
        return updated;
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const deleteProduct = (id) => {
    try {
      const newProducts = products.filter(p => p.id !== id);
      if (saveToStorage(newProducts)) {
        toast({
          title: 'Produto removido',
          description: 'Produto removido com sucesso!',
        });
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao remover',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const deleteAllProducts = () => {
    try {
      if (saveToStorage([])) {
        toast({
          title: 'Todos os produtos removidos',
          description: 'A lista de produtos foi limpa com sucesso.',
        });
      }
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Erro ao limpar lista',
        description: err.message,
        variant: 'destructive'
      });
    }
  };
  
  // Special method for bulk import to bypass individual adds
  const importBulkProducts = (newProductsList) => {
    try {
      const formattedNew = newProductsList.map(p => ({
        ...p,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        priceHistory: p.price ? [{
           date: new Date().toISOString(),
           price: parseFloat(p.price),
           oldPrice: 0,
           variation: 0,
           note: 'Imported'
        }] : []
      }));
      
      const merged = [...formattedNew, ...products];
      if (saveToStorage(merged)) {
        toast({
          title: 'Importação concluída',
          description: `${formattedNew.length} itens importados.`,
        });
        return true;
      }
    } catch(err) {
      console.error(err);
      return false;
    }
  };

  return {
    products,
    loading,
    error,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    importBulkProducts,
    refreshProducts: getProducts
  };
};
