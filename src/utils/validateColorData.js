export const validateColorData = (colorRaw, fallback = 'Não especificada') => {
  if (colorRaw === null || colorRaw === undefined) {
    return fallback;
  }
  
  const str = String(colorRaw).trim();
  
  if (str === '' || str.toUpperCase() === 'N/A') {
    return fallback;
  }
  
  return str;
};