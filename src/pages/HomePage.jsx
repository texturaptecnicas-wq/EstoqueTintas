
import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Upload, PackageSearch, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts.js';
import { useCategory } from '@/hooks/useCategory.js';
import { useColumns } from '@/hooks/useColumns.js';
import DragDropManager from '@/contexts/DragDropManager.jsx';
import { usePaintingMode } from '@/contexts/PaintingModeContext.jsx';
import { motion } from 'framer-motion';
import SkeletonLoader from '@/components/SkeletonLoader.jsx';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AlertIndicator from '@/components/AlertIndicator.jsx';
import { useReorderAlertCount } from '@/hooks/useReorderAlertCount.js';

const ProductTable = React.lazy(() => import('@/components/ProductTable.jsx'));
const SearchBar = React.lazy(() => import('@/components/SearchBar.jsx'));
const ProductForm = React.lazy(() => import('@/components/ProductForm.jsx'));
const ImportModal = React.lazy(() => import('@/components/ImportModal.jsx'));
const CategoryManager = React.lazy(() => import('@/components/CategoryManager.jsx'));

const CategoryTab = ({ cat, isActive, onClick, activeProducts }) => {
  const count = useReorderAlertCount(cat.id, isActive ? activeProducts : null);

  return (
    <button
      onClick={() => onClick(cat)}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
        isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {cat.name}
      <AlertIndicator categoryName={cat.name} count={count} />
    </button>
  );
};

const HomePage = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { registerCategory } = usePaintingMode();

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

  const handleCategoryChange = useCallback((cat) => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedProduct(null);
    setCurrentCategory(cat);
  }, [setCurrentCategory]);

  useEffect(() => {
    if (!currentCategory && categories && categories.length > 0) {
      handleCategoryChange(categories[0]);
    } else if (currentCategory) {
      registerCategory(currentCategory.id);
    }
  }, [categories, currentCategory, handleCategoryChange, registerCategory]);

  const { 
    products, 
    loading: productsLoading,
    error: productsError,
    isDeletingAll,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    deleteAllProducts,
    getProducts, 
    loadMore,
    retryLoadMore,
    hasMore,
    updateCaixaAberta,
    updateMeiaCaixaStatus
  } = useProducts(currentCategory?.id);

  const { addColumn, updateColumn } = useColumns(currentCategory?.id);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!debouncedSearch.trim()) return products;
    
    const lowerQuery = debouncedSearch.toLowerCase();
    return products.filter(product => {
      const inData = Object.values(product).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      );
      return inData;
    });
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

  const handleImportSuccess = useCallback(() => {
    const timer = setTimeout(() => {
        getProducts(0);
    }, 3000);
    getProducts(0);
    return () => clearTimeout(timer);
  }, [getProducts]);
  
  const handleCellUpdate = useCallback(async (id, updates) => {
      await updateProduct(id, updates);
  }, [updateProduct]);
  
  const handleUpdateColumnWrapper = useCallback(async (updatedColumn) => {
      if (!currentCategory) return;
      
      const newColumns = currentCategory.columns.map(c => 
          c.key === updatedColumn.key ? updatedColumn : c
      );
      setCurrentCategory(prev => ({ ...prev, columns: newColumns }));

      await updateColumn(updatedColumn);
  }, [currentCategory, setCurrentCategory, updateColumn]);

  const handleAddColumnWrapper = useCallback(async (newColumn) => {
      if (!currentCategory) return;
      const updatedColumns = await addColumn(newColumn);
      if (updatedColumns) {
           setCurrentCategory(prev => ({ ...prev, columns: updatedColumns }));
      }
  }, [currentCategory, setCurrentCategory, addColumn]);

  const visibleColumns = useMemo(() => {
    return currentCategory ? currentCategory.columns.filter(col => col.visible !== false) : [];
  }, [currentCategory]);

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
                    <CategoryTab
                      key={cat.id}
                      cat={cat}
                      isActive={currentCategory?.id === cat.id}
                      onClick={handleCategoryChange}
                      activeProducts={products}
                    />
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

        <main key={currentCategory?.id || 'loading'} className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-4 md:px-6 md:py-6 flex gap-4 h-[calc(100vh-140px)]">
          
          <div className="flex-1 flex flex-col min-w-0">
            {!currentCategory ? (
              <div className="text-center py-20">Selecione uma categoria</div>
            ) : productsError && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Alert variant="destructive" className="max-w-md mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro ao carregar produtos</AlertTitle>
                  <AlertDescription>
                    {productsError.message || 'Não foi possível conectar ao servidor.'}
                  </AlertDescription>
                </Alert>
                <Button onClick={() => getProducts(0)} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </Button>
              </div>
            ) : (
              <DragDropManager products={filteredProducts} columns={visibleColumns} categoryId={currentCategory?.id}>
                <Suspense fallback={<div className="space-y-4"><SkeletonLoader height="50px" /><SkeletonLoader count={5} height="60px" /></div>}>
                  <div className="flex-1 h-full min-h-[500px]">
                    {productsLoading && products.length === 0 ? (
                        <div className="space-y-4"><SkeletonLoader height="50px" /><SkeletonLoader count={5} height="60px" /></div>
                    ) : (
                        <ProductTable
                          categoryId={currentCategory.id}
                          products={filteredProducts}
                          category={currentCategory}
                          onEdit={handleEditProduct}
                          onDelete={handleDeleteProduct}
                          onAddColumn={handleAddColumnWrapper}
                          onUpdateColumn={handleUpdateColumnWrapper}
                          onAddProduct={addProduct}
                          onProductUpdate={handleCellUpdate}
                          onUpdateCaixaAberta={updateCaixaAberta}
                          onUpdateMeiaCaixaStatus={updateMeiaCaixaStatus}
                          onDeleteAll={deleteAllProducts}
                          isDeletingAll={isDeletingAll}
                          loadMore={loadMore}
                          retryLoadMore={retryLoadMore}
                          hasMore={hasMore && !debouncedSearch}
                          error={productsError}
                        />
                    )}
                  </div>
                </Suspense>
              </DragDropManager>
            )}
          </div>
        </main>

        <Suspense fallback={null}>
          <ProductForm
            key={`form-${currentCategory?.id}`}
            isOpen={showForm}
            onClose={() => { setShowForm(false); setSelectedProduct(null); }}
            onSave={handleSaveProduct}
            product={selectedProduct}
            category={currentCategory}
          />
          <ImportModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            onImport={handleImportSuccess}
            category={currentCategory}
            categories={categories}
            onCategoryChange={handleCategoryChange}
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
