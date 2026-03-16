
export const parseBRNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    console.log('parseBRNumber input:', value, 'output:', 0);
    return 0;
  }
  
  if (typeof value === 'number') {
    console.log('parseBRNumber input:', value, 'output:', value);
    return value;
  }
  
  let str = String(value).trim();
  // Remove all dots (thousands separator)
  str = str.replace(/\./g, '');
  // Replace comma with dot for decimal
  str = str.replace(',', '.');
  
  const num = parseFloat(str);
  const result = isNaN(num) ? 0 : num;
  
  console.log('parseBRNumber input:', value, 'output:', result);
  return result;
};
