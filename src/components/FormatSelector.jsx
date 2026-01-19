
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FormatSelector = ({ value, onChange, className }) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Selecione o formato" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700 text-white">
        <SelectItem value="text">Texto</SelectItem>
        <SelectItem value="number">Número</SelectItem>
        <SelectItem value="currency">Moeda (R$)</SelectItem>
        <SelectItem value="percentage">Percentual (%)</SelectItem>
        <SelectItem value="date">Data</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default FormatSelector;
