
import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Upload, PackageSearch, Trash2, Settings, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductTable from '@/components/ProductTable';
import ProductForm from '@/components/ProductForm';
import ImportModal from '@/components/ImportModal';
import CategoryManager from '@/components/CategoryManager';
import SearchBar from '@/components/SearchBar';
import { useProducts } from '@/hooks/useProducts';
import { useCategory } from '@/hooks/useCategory';
import { motion } from 'framer-motion';

const HomePage = () => {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    categories, 
    currentCategory, 
    setCurrentCategory,
    addCategory,
    updateCategory,
    deleteCategory 
  } = useCategory();

  const { 
    products, 
    loading, 
    getProducts, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    deleteAllProducts,
    importBulkProducts
  } = useProducts(currentCategory?.id);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return products.filter(product => {
      // Search in all values of the product object
      return Object.values(product).some(val => 
        String(val).toLowerCase().includes(lowerQuery)
      );
    });
  }, [products, searchQuery]);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleSaveProduct = (productData) => {
    if (selectedProduct) {
      updateProduct(selectedProduct.id, productData);
    } else {
      addProduct(productData);
    }
    setShowForm(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      deleteProduct(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Tem certeza que deseja excluir TODOS os itens desta categoria?')) {
      deleteAllProducts();
    }
  };

  const handleImportProduct = (newProducts) => {
    importBulkProducts(newProducts);
  };
  
  const handleAddColumn = (newColumn) => {
    if (!currentCategory) return;
    
    if (currentCategory.columns.some(col => col.key === newColumn.key)) {
       newColumn.key = `${newColumn.key}_${Math.random().toString(36).substr(2, 5)}`;
    }
    
    const updatedCategory = {
      ...currentCategory,
      columns: [...currentCategory.columns, newColumn]
    };
    
    updateCategory(currentCategory.id, updatedCategory);
  };

  const handleUpdateColumn = (updatedColumn) => {
    if (!currentCategory) return;
    
    const newColumns = currentCategory.columns.map(col => 
      col.key === updatedColumn.key ? updatedColumn : col
    );

    const updatedCategory = {
      ...currentCategory,
      columns: newColumns
    };
    
    updateCategory(currentCategory.id, updatedCategory);
  };
  
  const handleQuickAddProduct = (productData) => {
    addProduct(productData);
  };

  if (!currentCategory) return <div className="p-10 text-center">Carregando sistema...</div>;

  return (
    <>
      <Helmet>
        <title>ERP Estoque | {currentCategory.name}</title>
        <meta name="description" content="Gestão de estoque mobile-first" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex flex-col pb-6">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-20 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              
              {/* Top Row: Logo & Title */}
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg shrink-0">
                  <PackageSearch className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">ERP Estoque</h1>
                  <p className="text-xs text-gray-500">Gestão Multicategoria</p>
                </div>
                {/* Mobile: Category Settings Shortcut */}
                <button 
                  onClick={() => setShowCategoryManager(true)}
                  className="md:hidden p-3 text-gray-500 hover:bg-gray-100 rounded-full touch-target"
                  aria-label="Gerenciar Categorias"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>

              {/* Second Row/Col: Category & Actions */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                {/* Category Selector */}
                <div className="flex items-center bg-gray-100 p-1.5 rounded-lg overflow-x-auto no-scrollbar max-w-full md:max-w-md -mx-1 px-1 md:mx-0">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCurrentCategory(cat)}
                      className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all touch-target h-10 md:h-auto ${
                        currentCategory.id === cat.id 
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-gray-300 mx-2 hidden md:block"></div>
                  <button 
                    onClick={() => setShowCategoryManager(true)}
                    className="hidden md:flex px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-200 rounded-md items-center"
                    title="Gerenciar Categorias"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                   {products.length > 0 && (
                    <Button
                      onClick={handleDeleteAll}
                      variant="ghost"
                      size="sm"
                      className="hidden sm:flex h-11 md:h-9 px-4 text-red-600 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
                    >
                      <Trash2 className="w-5 h-5 mr-2 md:w-4 md:h-4 md:mr-1.5" />
                      Limpar
                    </Button>
                  )}
                  <div className="flex-1 md:flex-none flex gap-3 w-full md:w-auto">
                    <Button
                      onClick={() => setShowImport(true)}
                      variant="outline"
                      size="sm"
                      className="flex-1 md:flex-none h-11 md:h-9 px-4 text-sm border-gray-300 hover:bg-gray-50 active:bg-gray-100 touch-target"
                    >
                      <Upload className="w-5 h-5 mr-2 md:w-4 md:h-4 md:mr-1.5" />
                      Importar
                    </Button>
                    <Button
                      onClick={handleAddProduct}
                      size="sm"
                      className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white h-11 md:h-9 px-5 text-sm font-medium active:bg-blue-800 touch-target shadow-sm"
                    >
                      <Plus className="w-5 h-5 mr-2 md:w-4 md:h-4 md:mr-1.5" />
                      Novo Item
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Search Bar & Sub-Header */}
        <div className="bg-white border-b shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto px-4 py-3">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SearchBar 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  count={filteredProducts.length}
                />
                
                <div className="flex items-center gap-2 text-xs text-gray-500 overflow-hidden whitespace-nowrap hidden md:flex">
                   <span className="font-semibold text-gray-700 shrink-0 text-sm">{currentCategory.name}</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span>
                   <span className="truncate max-w-[200px]">{currentCategory.description || 'Sem descrição'}</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span>
                   <span className="shrink-0 font-medium">{products.length} itens totais</span>
                </div>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:px-6 md:py-8">
          {loading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"
              />
              <p className="text-base text-gray-500 mt-4">Carregando estoque...</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-visible min-h-[300px] md:min-h-[400px]">
              <ProductTable
                products={filteredProducts}
                category={currentCategory}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onAddColumn={handleAddColumn}
                onUpdateColumn={handleUpdateColumn}
                onAddProduct={handleQuickAddProduct}
                onProductUpdate={updateProduct}
              />
            </div>
          )}
        </main>

        <ProductForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedProduct(null);
          }}
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
      </div>
    </>
  );
};

export default HomePage;
