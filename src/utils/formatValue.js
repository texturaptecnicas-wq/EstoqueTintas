
export const formatValue = (value, format) => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Clean string numbers (e.g. "1.200,50" -> 1200.50) if passed as string
  let numValue = value;
  if (typeof value === 'string' && ['currency', 'number', 'percentage'].includes(format)) {
     // Check if it's already a number in string form or needs conversion
     if (!isNaN(parseFloat(value))) {
         numValue = parseFloat(value);
     }
  }

  const isValidNumber = !isNaN(numValue) && typeof numValue === 'number';

  switch (format) {
    case 'currency':
      return isValidNumber 
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue)
        : value;
        
    case 'date':
      if (!value) return '-';
      const date = new Date(value);
      // Check if valid date
      return !isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR') : value;
      
    case 'number':
      return isValidNumber 
        ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numValue)
        : value;
        
    case 'percentage':
      return isValidNumber 
        ? `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numValue)}%` 
        : value;
        
    case 'text':
    default:
      return value;
  }
};
