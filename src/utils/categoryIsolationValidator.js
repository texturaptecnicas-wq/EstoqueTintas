
export const validateCategoryIsolation = (categoryId, products, colorLegends, cellColors) => {
  const issues = [];

  // 1. Verify Products
  if (products && products.length > 0) {
    const leakedProducts = products.filter(p => p.category_id !== categoryId);
    if (leakedProducts.length > 0) {
      issues.push(`Found ${leakedProducts.length} products belonging to another category.`);
      console.error("Cross-Category Product Leakage:", leakedProducts);
    }
  }

  // 2. Verify Color Legends
  if (colorLegends && colorLegends.length > 0) {
    const leakedLegends = colorLegends.filter(l => l.category_type && l.category_type !== categoryId);
    if (leakedLegends.length > 0) {
      issues.push(`Found ${leakedLegends.length} color legends belonging to another category.`);
      console.error("Cross-Category Legend Leakage:", leakedLegends);
    }
  }

  // 3. Verify Cell Colors (by checking product association)
  if (cellColors && cellColors.length > 0) {
    const leakedColors = cellColors.filter(c => c.products && c.products.category_id !== categoryId);
    if (leakedColors.length > 0) {
      issues.push(`Found ${leakedColors.length} cell colors belonging to products in another category.`);
      console.error("Cross-Category Cell Color Leakage:", leakedColors);
    }
  }

  if (issues.length === 0) {
    console.log(`[Category ${categoryId}] Isolation validation passed. No leaks detected.`);
  } else {
    console.warn(`[Category ${categoryId}] Isolation validation FAILED.`, issues);
  }

  return issues;
};

export const clearCategoryCache = (categoryId) => {
  console.log(`Clearing local cache for category: ${categoryId}`);
  // In a real scenario, this removes specific local storage keys
  localStorage.removeItem(`erp-row-order-${categoryId}`);
  localStorage.removeItem(`erp-column-order-${categoryId}`);
};
