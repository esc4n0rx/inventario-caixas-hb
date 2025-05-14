// Enhanced version of CleanupCard component that uses the API endpoint
import { useState } from "react";
import { Trash2, RotateCw, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { lojas } from "@/data/lojas"; // Import your list of stores

interface CleanupCardProps {
  systemConfig: any;
  onRefresh: () => Promise<void>;
}

export default function CleanupCard({ systemConfig, onRefresh }: CleanupCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cleanupType, setCleanupType] = useState<"all" | "transit" | "inventory" | "custom">("all");
  const [selectedLoja, setSelectedLoja] = useState<string>("all");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    deletedRecords: 0,
    deletedLoja: 0,
    totalRecords: 0,
  });
  const { toast } = useToast();
  
  const isSystemBlocked = systemConfig?.bloqueado || false;

  const handleOpenDialog = () => {
    setCleanupType("all");
    setSelectedLoja("all");
    setShowConfirmDialog(true);
  };

  const performCleanup = async () => {
    setIsProcessing(true);
    setProgress(10); // Start progress indicator
    
    try {
      // Use the admin API endpoint for cleanup
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cleanupType,
          lojaId: selectedLoja,
          senha: localStorage.getItem('admin_password') || '', // Get password from local storage (should be set during admin login)
        }),
      });
      
      setProgress(50); // Update progress
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao limpar registros');
      }
      
      const data = await response.json();
      
      setProgress(100); // Complete progress
      
      // Update stats with response data
      setStats({
        deletedRecords: data.results.totalDeleted,
        deletedLoja: cleanupType === "custom" ? 1 : (data.results.totalStores || 0),
        totalRecords: data.results.totalBefore,
      });
      
      // Show success message
      toast({
        title: "Limpeza concluída",
        description: `Foram removidos ${data.results.totalDeleted} registros do sistema.`,
        variant: "default",
      });
      
      // Refresh dashboard data
      await onRefresh();
      setTimeout(() => {
        setShowConfirmDialog(false);
      }, 1000); // Close dialog after a short delay to show completion
      
    } catch (error) {
      console.error('Erro ao limpar registros:', error);
      toast({
        title: "Erro na limpeza",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao limpar os registros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-400" />
          <CardTitle className="text-lg font-medium">Limpar Registros</CardTitle>
        </div>
        <CardDescription>
          Remove registros de contagem para permitir novo inventário
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="bg-amber-900/20 border-amber-800/30 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Esta ação é irreversível e removerá dados de contagem do sistema.
              Certifique-se de exportar quaisquer dados importantes antes de prosseguir.
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={handleOpenDialog}
            disabled={isSystemBlocked || isProcessing}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpar Registros do Sistema
          </Button>
          
          {isSystemBlocked && (
            <div className="p-3 rounded-md bg-zinc-800 text-sm text-zinc-400">
              <ShieldAlert className="inline-block mr-2 h-4 w-4" />
              O sistema precisa estar desbloqueado para realizar a limpeza de registros.
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Dialog de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar Limpeza</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta ação é irreversível e removerá os dados de contagem do sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de Limpeza</Label>
              <Select 
                value={cleanupType} 
                onValueChange={(value) => setCleanupType(value as "all" | "transit" | "inventory" | "custom")}
                disabled={isProcessing}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Selecione o tipo de limpeza" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">
                    Limpar tudo (inventário + trânsito)
                  </SelectItem>
                  <SelectItem value="inventory">
                    Apenas registros de inventário
                  </SelectItem>
                  <SelectItem value="transit">
                    Apenas registros de trânsito
                  </SelectItem>
                  <SelectItem value="custom">
                    Limpar por loja
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {cleanupType === "custom" && (
              <div className="space-y-2">
                <Label>Selecione a Loja</Label>
                <Select 
                  value={selectedLoja} 
                  onValueChange={setSelectedLoja}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-80">
                    <SelectItem value="all">Todas as lojas</SelectItem>
                    {lojas.map((loja) => (
                      <SelectItem key={loja.id} value={loja.id}>
                        {loja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {isProcessing ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Progresso</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-700" />
                
                {progress === 100 && (
                  <div className="flex items-center justify-center p-4 bg-green-900/20 text-green-400 rounded-md">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Limpeza concluída com sucesso!</span>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800/30 text-red-400">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="font-bold">Confirmação necessária</AlertTitle>
                <AlertDescription>
                  {cleanupType === "all" 
                    ? "Você está prestes a remover TODOS os registros de contagem do sistema." 
                    : cleanupType === "transit"
                    ? "Você está prestes a remover TODOS os registros de trânsito do sistema."
                    : cleanupType === "inventory"
                    ? "Você está prestes a remover TODOS os registros de inventário do sistema."
                    : selectedLoja === "all"
                    ? "Você está prestes a remover os registros de TODAS as lojas."
                    : `Você está prestes a remover os registros da loja ${lojas.find(l => l.id === selectedLoja)?.nome || selectedLoja}.`}
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing && progress < 100}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              {progress === 100 ? "Fechar" : "Cancelar"}
            </Button>
            {progress < 100 && (
              <Button
                onClick={performCleanup}
                disabled={isProcessing}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <>
                    <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Confirmar Limpeza
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}