// components/SelectCdCountType.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Warehouse, Truck } from "lucide-react";

interface SelectCdCountTypeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: "estoque" | "transito") => void;
}

export function SelectCdCountType({
  open,
  onOpenChange,
  onSelectType,
}: SelectCdCountTypeProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800">
        <DialogHeader>
          <DialogTitle>Tipo de Contagem</DialogTitle>
          <DialogDescription className="text-zinc-400">
            O que você deseja contar primeiro?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button 
            onClick={() => onSelectType("estoque")} 
            variant="outline" 
            className="h-24 border-zinc-700 text-white hover:bg-zinc-800 flex flex-col p-3"
          >
            <Warehouse className="h-8 w-8 mb-2 text-[#F4C95D]" />
            <span>Estoque do CD</span>
          </Button>
          <Button 
            onClick={() => onSelectType("transito")} 
            variant="outline" 
            className="h-24 border-zinc-700 text-white hover:bg-zinc-800 flex flex-col p-3"
          >
            <Truck className="h-8 w-8 mb-2 text-[#F4C95D]" />
            <span>Caixas em Trânsito</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}