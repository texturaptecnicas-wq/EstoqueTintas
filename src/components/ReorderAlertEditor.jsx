
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ReorderAlertEditor = ({ productId, valor, unidade, onSave, onCancel }) => {
  const [localVal, setLocalVal] = useState(valor || '');
  const [localUnit, setLocalUnit] = useState(unidade || 'dias');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const inputRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (saving) return;
    if (!localVal) {
      if (onCancel) onCancel();
      return;
    }

    const numVal = parseFloat(localVal);
    
    if (isNaN(numVal) || numVal <= 0) {
      setError(true);
      toast({ title: 'Valor inválido', description: 'O valor deve ser maior que zero.', variant: 'destructive' });
      return;
    }
    
    setError(false);
    setSaving(true);
    
    try {
      const { error: sbError } = await supabase
        .from('products')
        .update({ 
          prazo_recompra_valor: numVal, 
          prazo_recompra_unidade: localUnit 
        })
        .eq('id', productId);
        
      if (sbError) throw sbError;
      
      if (onSave) {
        onSave();
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') {
      if (onCancel) onCancel();
    }
  };

  const handleBlur = (e) => {
    // Do not trigger save if the dropdown is open
    if (isSelectOpen) return;

    // Check if the focus went to the Radix UI portal content
    if (e.relatedTarget && e.relatedTarget.closest('[data-radix-popper-content-wrapper]')) {
      return;
    }

    // Only save if the new focused element is outside of our component wrapper
    if (!e.currentTarget.contains(e.relatedTarget)) {
      handleSave();
    }
  };

  return (
    <div className="flex w-full items-center gap-1 relative z-20" onBlur={handleBlur} tabIndex="-1">
      <Input 
        type="number" min="1" step="any"
        ref={inputRef} value={localVal} onChange={(e) => setLocalVal(e.target.value)}
        onKeyDown={handleKeyDown} disabled={saving}
        className={cn("h-9 w-16 px-2 text-center shadow-sm focus-visible:ring-2 focus-visible:ring-blue-200 bg-white text-gray-900", error ? "border-red-500" : "border-blue-500", saving && "opacity-50")}
        placeholder="Qtd"
      />
      
      <div 
        className="flex-1"
        onMouseDown={(e) => { 
          // Prevent blur on the input when clicking the dropdown trigger
          e.preventDefault(); 
          e.stopPropagation(); 
        }}
      >
        <Select 
          value={localUnit} 
          onValueChange={(val) => { 
            setLocalUnit(val);
            // Return focus to the input so clicking outside later properly triggers blur
            setTimeout(() => inputRef.current?.focus(), 0);
          }} 
          disabled={saving}
          open={isSelectOpen}
          onOpenChange={setIsSelectOpen}
        >
          <SelectTrigger className="h-9 w-full bg-white text-gray-900 border-blue-500 focus:ring-2 focus:ring-blue-200">
            <SelectValue placeholder="Unidade" />
          </SelectTrigger>
          <SelectContent className="z-[60]" onCloseAutoFocus={(e) => e.preventDefault()}>
            <SelectItem value="dias">Dias</SelectItem>
            <SelectItem value="semanas">Sem.</SelectItem>
            <SelectItem value="meses">Meses</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {saving && <Loader2 className="w-3 h-3 animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-blue-600" />}
    </div>
  );
};

export default ReorderAlertEditor;
