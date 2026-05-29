
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ColorLegendPanel from './ColorLegendPanel';

const ColorLegendModal = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Legendas de Cores</DialogTitle>
          <DialogDescription>Gerencie as legendas de cores para destacar produtos na tabela.</DialogDescription>
        </DialogHeader>
        <ColorLegendPanel />
      </DialogContent>
    </Dialog>
  );
};

export default ColorLegendModal;
