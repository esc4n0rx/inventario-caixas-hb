import { useState } from "react";
import { AlertTriangle, Cog, Loader2, Play, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { lojas } from "@/data/lojas";
import { ativos } from "@/data/ativos";
import { supabase } from "@/lib/supabase";
import { gerarNumeroAleatorio, gerarEmailTeste, gerarDataAleatoria } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BatchGeneratorProps {
  systemConfig: any;
  onRefresh: () => Promise<void>;
}

export default function BatchGenerator({ systemConfig, onRefresh }: BatchGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generationEnabled, setGenerationEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    lojasProcessadas: 0,
    registrosGerados: 0,
    lojasRestantes: 0,
  });
  const { toast } = useToast();
  
  const isSystemBlocked = systemConfig?.bloqueado || false;

  const handleEnableGenerator = (enabled: boolean) => {
    if (enabled) {
      // Se estiver ativando, mostrar diálogo de confirmação primeiro
      setShowConfirmDialog(true);
    } else {
      setGenerationEnabled(false);
    }
  };

  const confirmEnableGenerator = () => {
    setGenerationEnabled(true);
    setShowConfirmDialog(false);
    
    toast({
      title: "Gerador de contagens ativado",
      description: "O gerador de contagens fictícias está agora disponível para uso.",
    });
  };

  const generateBatchCounts = async () => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      // 1. Buscar todas as lojas que já têm contagens
      const { data: contagensExistentes, error: errorContagens } = await supabase
        .from('contagens')
        .select('loja')
        .order('loja');
      
      if (errorContagens) throw errorContagens;
      
      // Extrair IDs únicos de lojas com contagens
      const lojasComContagem = new Set(contagensExistentes?.map(c => c.loja) || []);
      
      // Identificar lojas sem contagens
      const lojasSemContagem = lojas.filter(loja => !lojasComContagem.has(loja.id));
      
      // Atualizar estatísticas iniciais
      setStats({
        lojasProcessadas: 0,
        registrosGerados: 0,
        lojasRestantes: lojasSemContagem.length,
      });
      
      if (lojasSemContagem.length === 0) {
        toast({
          title: "Nenhuma loja pendente",
          description: "Todas as lojas já possuem contagens registradas.",
        });
        setIsGenerating(false);
        return;
      }
      
      let processadas = 0;
      let registrosTotal = 0;
      
      // Para cada loja sem contagem, gerar registros fictícios
      for (const loja of lojasSemContagem) {
        // Gerar contagens para todos os ativos da loja
        const registrosLoja = ativos.map(ativo => {
          // Gerar uma quantidade aleatória entre 0 e 20
          const quantidade = gerarNumeroAleatorio(0, 20);
          
          // Data de uma semana atrás para data atual
          const dataInicio = new Date();
          dataInicio.setDate(dataInicio.getDate() - 7);
          
          return {
            loja: loja.id,
            loja_nome: loja.nome,
            email: gerarEmailTeste(loja.id),
            ativo: ativo.id,
            ativo_nome: ativo.nome,
            quantidade: quantidade,
            data_registro: gerarDataAleatoria(dataInicio),
          };
        });
        
        // Inserir os registros no banco
        const { error: insertError } = await supabase
          .from('contagens')
          .insert(registrosLoja);
        
        if (insertError) throw insertError;
        
        // Atualizar progresso
        processadas++;
        registrosTotal += registrosLoja.length;
        setProgress((processadas / lojasSemContagem.length) * 100);
        
        setStats({
          lojasProcessadas: processadas,
          registrosGerados: registrosTotal,
          lojasRestantes: lojasSemContagem.length - processadas,
        });
        
        // Pequena pausa para não sobrecarregar o banco
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      toast({
        title: "Geração concluída",
        description: `Foram geradas contagens para ${processadas} lojas, totalizando ${registrosTotal} registros.`,
      });
      
      // Atualizar dados do dashboard
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao gerar contagens em lote:', error);
      toast({
        title: "Erro na geração",
        description: "Ocorreu um erro ao gerar as contagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-[#F4C95D]" />
          <CardTitle className="text-lg font-medium">Gerador de Contagens</CardTitle>
        </div>
        <CardDescription>
          Gere contagens fictícias para lojas pendentes para testes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Ativar/Desativar Gerador */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Gerador de Testes</Label>
              <p className="text-sm text-zinc-400">
                Permite gerar contagens fictícias para lojas pendentes
              </p>
            </div>
            <Switch 
              checked={generationEnabled} 
              onCheckedChange={handleEnableGenerator}
              disabled={isSystemBlocked || isGenerating}
            />
          </div>

          {/* Alerta de aviso */}
          {generationEnabled && (
            <Alert variant="destructive" className="bg-red-900/20 border-red-800/30 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção!</AlertTitle>
              <AlertDescription>
                Este gerador criará contagens fictícias que podem interferir com inventários reais em andamento.
                Use somente em ambientes de teste ou quando não houver um inventário real em progresso.
              </AlertDescription>
            </Alert>
          )}

          {/* Status e controles de geração */}
          {generationEnabled && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Status da Geração</h3>
                  <Badge 
                    className={isGenerating ? 
                      "bg-amber-600/30 text-amber-400 hover:bg-amber-600/30" : 
                      "bg-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }
                  >
                    {isGenerating ? "Em Andamento" : "Pronto"}
                  </Badge>
                </div>
                
                {isGenerating && (
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Progresso</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-zinc-700" />
                  </div>
                )}
                
                {isGenerating && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Lojas Processadas</div>
                      <div className="text-xl font-medium mt-1">{stats.lojasProcessadas}</div>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Registros</div>
                      <div className="text-xl font-medium mt-1">{stats.registrosGerados}</div>
                    </div>
                    <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700/50">
                      <div className="text-xs text-zinc-400">Lojas Restantes</div>
                      <div className="text-xl font-medium mt-1">{stats.lojasRestantes}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={generateBatchCounts}
                disabled={isGenerating || isSystemBlocked}
                className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-11"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Contagens...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Geração
                  </>
                )}
              </Button>
              
              {isSystemBlocked && (
                <div className="p-3 rounded-md text-sm bg-zinc-800 border border-zinc-700/50 text-zinc-400">
                  <Cog className="inline-block mr-2 h-4 w-4" />
                  A geração está indisponível enquanto o sistema estiver bloqueado.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Diálogo de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar Ativação</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Ativar o gerador de contagens fictícias pode interferir com inventários reais em andamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-amber-900/20 border-amber-800/30 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cuidado</AlertTitle>
              <AlertDescription>
                Esta funcionalidade está voltada para ambientes de teste e vai gerar dados fictícios 
                para todas as lojas sem contagens. Certifique-se de que não há um inventário real em andamento.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmEnableGenerator}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirmar e Ativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}