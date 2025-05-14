// Let's create a new component/ScheduleConfigDialog.tsx component

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface ScheduleConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: {
    modo: 'automatico' | 'manual';
    dataInicio: string;
    horaInicio: string;
    dataFim: string;
    horaFim: string;
  };
  onSave: (config: any) => Promise<void>;
}

export function ScheduleConfigDialog({
  open,
  onOpenChange,
  initialConfig,
  onSave
}: ScheduleConfigDialogProps) {
  const [formData, setFormData] = useState({
    modo: initialConfig.modo || 'automatico',
    dataInicio: initialConfig.dataInicio || '',
    horaInicio: initialConfig.horaInicio || '',
    dataFim: initialConfig.dataFim || '',
    horaFim: initialConfig.horaFim || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update form when initialConfig changes
  useEffect(() => {
    if (open) {
      setFormData({
        modo: initialConfig.modo || 'automatico',
        dataInicio: initialConfig.dataInicio || '',
        horaInicio: initialConfig.horaInicio || '',
        dataFim: initialConfig.dataFim || '',
        horaFim: initialConfig.horaFim || '',
      });
    }
  }, [initialConfig, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate form fields
    if (!formData.dataInicio || !formData.horaInicio || !formData.dataFim || !formData.horaFim) {
      toast({
        title: "Campos incompletos",
        description: "Todos os campos são obrigatórios. Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
      console.log("Configuração salva com sucesso:", formData);
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Horário</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure o período em que o sistema estará disponível para contagens
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => handleChange('dataInicio', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora de Início</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => handleChange('horaInicio', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Término</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={formData.dataFim}
                  onChange={(e) => handleChange('dataFim', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora de Término</Label>
              <div className="relative">
                <Input
                  type="time"
                  value={formData.horaFim}
                  onChange={(e) => handleChange('horaFim', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Clock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}