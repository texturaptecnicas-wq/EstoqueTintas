export const validateProductData = (product) => {
  if (!product) {
    console.warn('validateProductData: Product is null or undefined');
    return { validated: {} };
  }

  // Check both root level and nested data JSONB object
  const dataObj = product.data || {};

  const extract = (...keys) => {
    for (const key of keys) {
      if (product[key] !== undefined && product[key] !== null) return product[key];
      if (dataObj[key] !== undefined && dataObj[key] !== null) return dataObj[key];
    }
    return '';
  };

  const validated = {
    id: extract('id'),
    name: extract('name', 'produto', 'nome'),
    codigo: extract('codigo', 'code'),
    fornecedor: extract('fornecedor', 'supplier'),
    preco: extract('preco', 'price'),
    cor: extract('cor', 'color'),
    estoque: extract('stock', 'estoque'),
    lote_minimo: extract('lote_minimo', 'minimum_batch')
  };

  // Log missing fields for debugging
  const missing = [];
  ['id', 'name', 'codigo', 'fornecedor', 'preco', 'cor'].forEach(field => {
    if (validated[field] === '') {
      missing.push(field);
    }
  });

  if (missing.length > 0) {
    console.log(`[validateProductData] Product missing fields:`, missing, 'Raw product:', product);
  }

  return {
    ...product,
    validated // Attach normalized, guaranteed fields to a 'validated' object
  };
};