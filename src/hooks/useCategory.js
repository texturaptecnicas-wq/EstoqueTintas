
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'inventoryCategories';

const DEFAULT_CATEGORY = {
  id: 'default',
  name: 'Tintas',
  description: 'Gestão de estoque de tintas',
  columns: [
    { key: 'color', label: 'Cor / Nome', type: 'text', required: true },
    { key: 'finish', label: 'Acabamento', type: 'text', required: true },
    { key: 'code', label: 'Código', type: 'text', required: true },
    { key: 'supplier', label: 'Fornecedor', type: 'text', required: true },
    { key: 'price', label: 'Preço', type: 'currency', required: true },
    { key: 'last_purchase_month', label: 'Última Compra', type: 'date', required: false },
    { key: 'stock', label: 'Estoque', type: 'number', required: true },
    { key: 'minimum_batch', label: 'Lote Mínimo', type: 'number', required: true }
  ]
};

export const useCategory = () => {
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCategories(parsed);
        // Default to first category if available
        if (parsed.length > 0 && !currentCategory) {
          setCurrentCategory(parsed[0]);
        }
      } else {
        // Initialize with default category
        const initial = [DEFAULT_CATEGORY];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        setCategories(initial);
        setCurrentCategory(initial[0]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar categorias.',
        variant: 'destructive'
      });
    }
  };

  const saveCategories = (newCategories) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCategories));
      setCategories(newCategories);
      return true;
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar categorias.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const addCategory = (categoryData) => {
    const newCategory = {
      ...categoryData,
      id: crypto.randomUUID()
    };
    const updated = [...categories, newCategory];
    if (saveCategories(updated)) {
      toast({ title: 'Categoria criada com sucesso!' });
      return newCategory;
    }
  };

  const updateCategory = (id, updates) => {
    const updated = categories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    );
    if (saveCategories(updated)) {
      toast({ title: 'Categoria atualizada!' });
      // Update current if we edited the active one
      if (currentCategory?.id === id) {
        setCurrentCategory(updated.find(c => c.id === id));
      }
    }
  };

  const deleteCategory = (id) => {
    if (categories.length <= 1) {
      toast({ 
        title: 'Ação bloqueada', 
        description: 'Você precisa ter pelo menos uma categoria.',
        variant: 'destructive' 
      });
      return;
    }
    const updated = categories.filter(cat => cat.id !== id);
    if (saveCategories(updated)) {
      toast({ title: 'Categoria removida!' });
      if (currentCategory?.id === id) {
        setCurrentCategory(updated[0]);
      }
    }
  };

  return {
    categories,
    currentCategory,
    setCurrentCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories
  };
};
