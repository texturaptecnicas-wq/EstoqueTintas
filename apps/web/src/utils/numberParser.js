export const parseBRNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const cleanString = String(value).replace(/[^\d.,-]/g, '');
  if (!cleanString) return 0;
  
  const dotCount = (cleanString.match(/\./g) || []).length;
  const commaCount = (cleanString.match(/,/g) || []).length;
  
  // Format: 1.234,56
  if (commaCount === 1 && dotCount >= 1) {
    return parseFloat(cleanString.replace(/\./g, '').replace(',', '.'));
  }
  // Format: 1,23
  if (commaCount === 1 && dotCount === 0) {
     return parseFloat(cleanString.replace(',', '.'));
  }
  // Format: 1234.56
  if (dotCount === 1 && commaCount === 0) {
     return parseFloat(cleanString);
  }
  
  // Fallback
  const result = parseFloat(cleanString.replace(/,/g, ''));
  return isNaN(result) ? 0 : result;
};