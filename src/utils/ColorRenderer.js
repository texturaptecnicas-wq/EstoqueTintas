
export const getCellStyle = (colors) => {
  if (!colors || colors.length === 0) return {};
  
  if (colors.length === 1) {
    return { backgroundColor: colors[0] };
  }
  
  const percentage = 100 / colors.length;
  const gradientStops = colors.map((color, index) => {
    return `${color} ${index * percentage}%, ${color} ${(index + 1) * percentage}%`;
  }).join(', ');

  return {
    background: `linear-gradient(135deg, ${gradientStops})`
  };
};

export const getContrastTextColor = (colors) => {
  if (!colors || colors.length === 0) return 'inherit';
  
  // Simple heuristic based on the first color for text contrast
  const hex = colors[0].replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 128) ? '#000000' : '#ffffff';
};
