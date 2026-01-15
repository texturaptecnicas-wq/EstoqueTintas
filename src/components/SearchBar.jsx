
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SearchBar = ({ value, onChange, onClear, count, className }) => {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar produtos por nome, código ou descrição..."
          className="pl-9 pr-10 h-11 bg-white shadow-sm border-gray-200 focus:border-blue-500 transition-all text-base"
        />
        {value && (
          <Button
            type="button"
            onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               onClear();
            }}
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 z-10"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="absolute -bottom-6 left-1 text-xs text-gray-500 animate-in fade-in slide-in-from-top-1">
          Encontrados: <span className="font-medium text-gray-900">{count}</span>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
