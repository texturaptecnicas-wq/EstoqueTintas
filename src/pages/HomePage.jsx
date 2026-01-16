
import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Upload, PackageSearch, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { useCategory } from '@/hooks/useCategory';
import { motion } from 'framer-motion';
import SkeletonLoader from '@/components/SkeletonLoader';

// Lazy Load Components
const ProductTable = React.lazy(() => import('@/components/ProductTable'));
const SearchBar = React.lazy(() => import('@/components/SearchBar'));
const ProductForm = React.lazy(() => import('@/components/ProductForm'));
const ImportModal = React.lazy(() => import('@/components/ImportModal'));
const CategoryManager = React.lazy(() => import('@/components/CategoryManager'));

const HomePage = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { 
    categories, 
    currentCategory, 
    setCurrentCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    loading: categoriesLoading 
  } = useCategory();

  useEffect(() => {
    if (!currentCategory && categories && categories.length > 0) {
      setCurrentCategory(categories[0]);
    }
  }, [categories, currentCategory, setCurrentCategory]);

  const { 
    products, 
    loading: productsLoading, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    deleteAllProducts,
    importBulkProducts,
    loadMore,
    hasMore
  } = useProducts(currentCategory?.id);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearch.trim()) return products;
    
    const lowerQuery = debouncedSearch.toLowerCase();
    return products.filter(product => 
      Object.values(product).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      )
    );
  }, [products, debouncedSearch]);

  const handleAddProduct = useCallback(() => {
    setSelectedProduct(null);
    setShowForm(true);
  }, []);

  const handleEditProduct = useCallback((product) => {
    setSelectedProduct(product);
    setShowForm(true);
  }, []);

  const handleSaveProduct = useCallback(async (productData) => {
    if (selectedProduct) {
      await updateProduct(selectedProduct.id, productData);
    } else {
      await addProduct(productData);
    }
    setShowForm(false);
    setSelectedProduct(null);
  }, [selectedProduct, updateProduct, addProduct]);

  const handleDeleteProduct = useCallback(async (id) => {
    if (window.confirm('Excluir este item?')) await deleteProduct(id);
  }, [deleteProduct]);

  const handleImportProduct = useCallback(async (newProducts) => {
    await importBulkProducts(newProducts);
    setShowImport(false);
  }, [importBulkProducts]);
  
  const handleAddColumn = useCallback(async (newColumn) => {
    if (!currentCategory) return;
    if (currentCategory.columns.some(col => col.key === newColumn.key)) {
       newColumn.key = `${newColumn.key}_${Math.random().toString(36).substr(2, 5)}`;
    }
    const updatedCategory = {
      ...currentCategory,
      columns: [...currentCategory.columns, newColumn]
    };
    await updateCategory(currentCategory.id, { columns: updatedCategory.columns });
  }, [currentCategory, updateCategory]);

  const handleUpdateColumn = useCallback(async (updatedColumn) => {
    if (!currentCategory) return;
    const newColumns = currentCategory.columns.map(col => 
      col.key === updatedColumn.key ? updatedColumn : col
    );
    await updateCategory(currentCategory.id, { columns: newColumns });
  }, [currentCategory, updateCategory]);

  if (categoriesLoading) {
    return (
       <div className="h-screen flex items-center justify-center flex-col gap-4">
         <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent" />
         <p className="text-gray-500">Iniciando sistema...</p>
       </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>ERP Estoque | {currentCategory?.name || 'Início'}</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg shrink-0">
                  <PackageSearch className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">ERP Estoque</h1>
                  <p className="text-xs text-gray-500">Gestão Multicategoria</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="flex items-center bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCurrentCategory(cat)}
                      className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                        currentCategory?.id === cat.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  <button onClick={() => setShowCategoryManager(true)} className="px-3 py-2 text-gray-500 hover:bg-gray-200 rounded-md">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                   <Button onClick={() => setShowImport(true)} variant="outline" size="sm" className="flex-1 md:flex-none">
                      <Upload className="w-4 h-4 mr-2" /> Importar
                   </Button>
                   <Button onClick={handleAddProduct} size="sm" className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" /> Novo Item
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white border-b shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto px-4 py-3">
             <Suspense fallback={<SkeletonLoader height="40px" />}>
                <SearchBar 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  count={filteredProducts.length}
                />
             </Suspense>
          </div>
        </div>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:px-6 md:py-8 flex flex-col">
          {!currentCategory ? (
            <div className="text-center py-20">Selecione uma categoria</div>
          ) : (
            <Suspense fallback={<div className="space-y-4"><SkeletonLoader height="50px" /><SkeletonLoader count={5} height="60px" /></div>}>
              <div className="flex-1 h-full min-h-[500px]">
                <ProductTable
                  products={filteredProducts}
                  category={currentCategory}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                  onAddColumn={handleAddColumn}
                  onUpdateColumn={handleUpdateColumn}
                  onAddProduct={addProduct}
                  onProductUpdate={updateProduct}
                  loadMore={loadMore}
                  hasMore={hasMore && !debouncedSearch}
                />
              </div>
            </Suspense>
          )}
        </main>

        <Suspense fallback={null}>
          <ProductForm
            isOpen={showForm}
            onClose={() => { setShowForm(false); setSelectedProduct(null); }}
            onSave={handleSaveProduct}
            product={selectedProduct}
            category={currentCategory}
          />
          <ImportModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            onImport={handleImportProduct}
            category={currentCategory}
            categories={categories}
            onCategoryChange={setCurrentCategory}
          />
          <CategoryManager 
            isOpen={showCategoryManager}
            onClose={() => setShowCategoryManager(false)}
            categories={categories}
            onAdd={addCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
          />
        </Suspense>
      </div>
    </>
  );
};

export default HomePage;
