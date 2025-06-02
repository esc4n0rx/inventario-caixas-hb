// components/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  RefreshCcw,
  Layers,
  ReceiptText,
  Package,
  Clock3,
  PencilLine,
  Trash2,
  Settings,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BatchGenerator from "@/components/BatchGenerator";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast'; // Certifique-se que este é o hook correto
import CleanupCard from "@/components/CleanupCard";
import SystemMaintenanceCard from "@/components/SystemMaintenanceCard";
import { formatarData } from '@/lib/utils';
import { lojas } from '@/data/lojas';
import { ativos } from '@/data/ativos';
import IntegrationManager from './IntegrationManager'; // Import IntegrationManager
import IntegrationLogs from './IntegrationLogs';     // Import IntegrationLogs

const COLORS = [
  '#F4C95D', '#7C96AB', '#6DC267', '#F87171', '#60A5FA',
  '#C084FC', '#FB923C', '#34D399', '#A3E635', '#FBBF24',
];

export interface Contagem {
  id: string;
  loja: string;
  loja_nome: string;
  email: string;
  ativo: string;
  ativo_nome: string;
  quantidade: number;
  data_registro: string;
}

export interface SystemConfig {
  modo: 'automatico' | 'manual';
  bloqueado: boolean;
  dataInicio?: string;
  horaInicio?: string;
  dataFim?: string;
  horaFim?: string;
}

type ScheduleForm = {
  modo: 'automatico' | 'manual';
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
};

export interface AdminDashboardProps {
  contagensData: Contagem[];
  contagensTransitoData: Contagem[];
  systemConfig: SystemConfig | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onUpdateSchedule: (config: Partial<SystemConfig>) => Promise<void>;
  onToggleSystem: (state: boolean) => Promise<void>;
  onRemoveContagem: (id: string) => Promise<void>;
  onEditContagem: (id: string, quantidade: number) => Promise<void>;
}

// Schedule Config Dialog Component (local to AdminDashboard or imported)
function ScheduleConfigDialogComponent({ // Renamed to avoid conflict if it's also a separate file
  open,
  onOpenChange,
  initialConfig,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: ScheduleForm;
  onSave: (config: ScheduleForm) => Promise<void>;
}) {
  const [formData, setFormData] = useState<ScheduleForm>(initialConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChange = (field: keyof ScheduleForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.dataInicio || !formData.horaInicio || !formData.dataFim || !formData.horaFim) {
      toast({
        title: "Campos incompletos",
        description: "Todos os campos de data e hora são obrigatórios para o modo automático.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData); // This will call props.onUpdateSchedule with full data
      onOpenChange(false);
      console.log("Configuração de agendamento salva com sucesso:", formData);
    } catch (error) {
      console.error("Erro ao salvar configuração de agendamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração de agendamento. Tente novamente.",
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
              <Label htmlFor="dataInicioDlg">Data de Início</Label>
              <div className="relative">
                <Input
                  id="dataInicioDlg"
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => handleChange('dataInicio', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaInicioDlg">Hora de Início</Label>
              <div className="relative">
                <Input
                  id="horaInicioDlg"
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => handleChange('horaInicio', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Clock3 className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataFimDlg">Data de Término</Label>
              <div className="relative">
                <Input
                  id="dataFimDlg"
                  type="date"
                  value={formData.dataFim}
                  onChange={(e) => handleChange('dataFim', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaFimDlg">Hora de Término</Label>
              <div className="relative">
                <Input
                  id="horaFimDlg"
                  type="time"
                  value={formData.horaFim}
                  onChange={(e) => handleChange('horaFim', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 pl-10"
                />
                <Clock3 className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
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


const AdminDashboard: React.FC<AdminDashboardProps> = ({
  contagensData,
  contagensTransitoData,
  systemConfig,
  isLoading,
  onRefresh,
  onUpdateSchedule,
  onToggleSystem,
  onRemoveContagem,
  onEditContagem,
}) => {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'configurations' | 'management'>('overview');
  const [showScheduleDialog, setShowScheduleDialog] = useState<boolean>(false);
  
  // scheduleFormState é o estado local para o diálogo de agendamento DENTRO do AdminDashboard
  const [scheduleFormState, setScheduleFormState] = useState<ScheduleForm>({
    modo: systemConfig?.modo || 'manual',
    dataInicio: systemConfig?.dataInicio || '',
    horaInicio: systemConfig?.horaInicio || '',
    dataFim: systemConfig?.dataFim || '',
    horaFim: systemConfig?.horaFim || '',
  });

  const [editingContagem, setEditingContagem] = useState<Contagem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ quantidade: number }>({ quantidade: 0 });
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState(false);


  useEffect(() => {
    if (systemConfig) {
      setScheduleFormState({ // Atualiza o estado local do formulário do diálogo
        modo: systemConfig.modo || 'manual',
        dataInicio: systemConfig.dataInicio || '',
        horaInicio: systemConfig.horaInicio || '',
        dataFim: systemConfig.dataFim || '',
        horaFim: systemConfig.horaFim || '',
      });
    }
  }, [systemConfig]);

  const totalLojas = lojas.length;
  const lojasComContagem = new Set(contagensData.map((c) => c.loja)).size;
  const progressoInventario = totalLojas > 0 ? (lojasComContagem / totalLojas) * 100 : 0;

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleEditContagemClick = (contagem: Contagem): void => {
    setEditingContagem(contagem);
    setEditForm({ quantidade: contagem.quantidade });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (editingContagem) {
      await onEditContagem(editingContagem.id, editForm.quantidade);
      setShowEditDialog(false);
      setEditingContagem(null);
    }
  };
  
  // Esta função é chamada quando o diálogo de agendamento é salvo.
  // `formData` vem diretamente do estado do diálogo.
  const handleSaveScheduleDialog = async (formData: ScheduleForm): Promise<void> => {
    await onUpdateSchedule(formData); // Passa os dados completos para a função da página admin
  };

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'automatico' : 'manual';
    
    // Prepara a carga para onUpdateSchedule
    // Se mudando para automático, e já existe um agendamento, envia esse agendamento.
    // Se não existe agendamento, abre o diálogo para o usuário definir.
    // Se mudando para manual, só envia o novo modo.
    if (newMode === 'automatico') {
      const hasExistingValidSchedule =
        systemConfig?.dataInicio &&
        systemConfig?.horaInicio &&
        systemConfig?.dataFim &&
        systemConfig?.horaFim;

      if (hasExistingValidSchedule) {
        onUpdateSchedule({ // Envia o modo E o agendamento existente
          modo: newMode,
          dataInicio: systemConfig.dataInicio,
          horaInicio: systemConfig.horaInicio,
          dataFim: systemConfig.dataFim,
          horaFim: systemConfig.horaFim,
        });
      } else {
        // Agendamento não existe ou incompleto, precisa abrir o diálogo
        // Atualiza o estado local do formulário do diálogo para 'automatico' antes de abrir
        setScheduleFormState(prev => ({
            ...prev,
            modo: newMode,
            dataInicio: prev.dataInicio || '', // Mantém ou usa vazio
            horaInicio: prev.horaInicio || '',
            dataFim: prev.dataFim || '',
            horaFim: prev.horaFim || '',
        }));
        setShowScheduleDialog(true);
      }
    } else { // newMode === 'manual'
      onUpdateSchedule({ modo: newMode }); // A API /api/sistema/config só precisa do modo aqui
                                          // A API /api/sistema/atualizar (chamada por onToggleSystem) também setará modo para manual.
    }
  };


  const calcularMediaPorHora = (): string => {
    if (!contagensData.length) return '0.0';
    const agora = new Date();
    const umDiaAtras = new Date(agora);
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);
    const contagensRecentes = contagensData.filter((c) => new Date(c.data_registro) > umDiaAtras);
    if (!contagensRecentes.length) return '0.0';
    const contagensPorHora: Record<number, number> = {};
    contagensRecentes.forEach((c) => {
      const hora = new Date(c.data_registro).getHours();
      contagensPorHora[hora] = (contagensPorHora[hora] || 0) + 1;
    });
    const horas = Object.keys(contagensPorHora).length;
    const total = Object.values(contagensPorHora).reduce((sum, v) => sum + v, 0);
    return (total / (horas || 1)).toFixed(1);
  };

  const prepararDadosContagensPorLoja = (): Array<{ loja: string; total: number }> => {
    const agg: Record<string, { loja: string; total: number }> = {};
    contagensData.forEach((c) => {
      if (!agg[c.loja]) agg[c.loja] = { loja: c.loja_nome || `Loja ${c.loja}`, total: 0 };
      agg[c.loja].total += c.quantidade;
    });
    return Object.values(agg)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const prepararDadosAtivosPorContagem = (): Array<{ ativo: string; total: number }> => {
    const agg: Record<string, { ativo: string; total: number }> = {};
    contagensData.forEach((c) => {
      if (!agg[c.ativo]) agg[c.ativo] = { ativo: c.ativo_nome || `Ativo ${c.ativo}`, total: 0 };
      agg[c.ativo].total += c.quantidade;
    });
    return Object.values(agg);
  };

  const prepararDadosContagensPorHora = (): Array<{ hora: number; contagens: number }> => {
    const dados = Array.from({ length: 24 }, (_, i) => ({ hora: i, contagens: 0 }));
    contagensData.forEach((c) => {
      const hora = new Date(c.data_registro).getHours();
      dados[hora].contagens++;
    });
    return dados;
  };

  const dadosContagensPorLoja = prepararDadosContagensPorLoja();
  const dadosAtivosPorContagem = prepararDadosAtivosPorContagem();
  const dadosContagensPorHora = prepararDadosContagensPorHora();
  const mediaPorHora = calcularMediaPorHora();

  const sistemaAutomatico = systemConfig?.modo === 'automatico';
  const sistemaLigado = !(systemConfig?.bloqueado ?? true); // Default to blocked if systemConfig is null

  const verificarHorarioProgramado = (): boolean => {
    if (!systemConfig || !systemConfig.dataInicio || !systemConfig.horaInicio || !systemConfig.dataFim || !systemConfig.horaFim) return false;
    try {
      const now = new Date(); // Hora local da máquina que executa o JS (navegador)
      
      // Para consistência, idealmente esta lógica deveria estar no backend ou usar UTC.
      // Assumindo que as datas/horas no systemConfig são para o fuso horário local do servidor/usuário.
      const inicioProgramado = new Date(`${systemConfig.dataInicio}T${systemConfig.horaInicio}`);
      const fimProgramado = new Date(`${systemConfig.dataFim}T${systemConfig.horaFim}`);
      
      return now >= inicioProgramado && now <= fimProgramado;
    } catch (error) {
      console.error('Erro ao verificar horário programado:', error);
      return false;
    }
  };

  const dentroDoHorario = sistemaAutomatico ? verificarHorarioProgramado() : false;

  const formatarDataBR = (dataISO: string | undefined): string => {
    if (!dataISO) return '--/--/----';
    // Adicionar verificação para formato de data, pois pode vir direto do input type="date" (YYYY-MM-DD)
    if (dataISO.includes('-') && dataISO.length === 10) {
        const [ano, mes, dia] = dataISO.split('-');
        if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
    }
    // Tentar formatar se for ISO completo
    try {
        const dataObj = new Date(dataISO);
        if (isNaN(dataObj.getTime())) return '--/--/----'; // Data inválida
        const dia = dataObj.getDate().toString().padStart(2, '0');
        const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
        const ano = dataObj.getFullYear();
        return `${dia}/${mes}/${ano}`;
    } catch (e) {
        return '--/--/----';
    }
  };
  
  // Função para formatar a hora, garantindo que seja HH:MM
  const formatarHora = (hora: string | undefined): string => {
    if (!hora) return '--:--';
    // Se já estiver no formato HH:MM, retorna. Caso contrário, tenta formatar.
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) return hora.substring(0,5); // Remove segundos

    try {
        const [h,m] = hora.split(':');
        if(h && m) return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`;
    } catch(e) {
        // se não conseguir formatar, retorna o valor original ou um placeholder
    }
    return hora || '--:--';
  }

  return (
    <div className="flex flex-col w-full">
      {/* Header do Dashboard */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-[#F4C95D]" />
            Dashboard Administrativo
          </h1>
          <p className="text-zinc-400 mt-1">
            Gerenciamento e monitoramento do sistema de inventário
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="border-zinc-700 text-white hover:bg-zinc-800 h-9"
          >
            <RefreshCcw className={`mr-1 h-4 w-4 ${refreshing || isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "Carregando..." : (refreshing ? "Atualizando..." : "Atualizar")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={(value: string) => setActiveTab(value as "overview" | "configurations" | "management")} className="w-full">
        <TabsList className="mb-4 bg-zinc-800 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="configurations" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
            Configurações
          </TabsTrigger>
          <TabsTrigger value="management" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
            Gerenciamento
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das abas */}
        <TabsContent value="overview" className="mt-0">
          {isLoading && !systemConfig ? ( // Mostra loading se systemConfig ainda não carregou
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
              <p className="ml-2">Carregando dados do sistema...</p>
            </div>
          ) : (
            <>
              {/* Cards de Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400 text-sm mb-1">Progresso Inventário</p>
                        <div className="text-2xl font-bold">{progressoInventario.toFixed(1)}%</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {lojasComContagem} de {totalLojas} lojas
                        </div>
                      </div>
                      <div className="bg-zinc-700/50 p-2 rounded-lg">
                        <Layers className="h-6 w-6 text-[#F4C95D]" />
                      </div>
                    </div>
                    <Progress value={progressoInventario} className="h-2.5 bg-zinc-700 mt-3" />
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400 text-sm mb-1">Contagens Recebidas</p>
                        <div className="text-2xl font-bold">{contagensData.length > 0 ? Math.round(contagensData.length / ativos.length) : 0}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {contagensData.length} registros no total
                        </div>
                      </div>
                      <div className="bg-zinc-700/50 p-2 rounded-lg">
                        <ReceiptText className="h-6 w-6 text-[#F4C95D]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400 text-sm mb-1">Total de Ativos Contados</p>
                        <div className="text-2xl font-bold">
                          {dadosAtivosPorContagem.reduce((sum, item) => sum + item.total, 0)}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Somando todos os tipos
                        </div>
                      </div>
                      <div className="bg-zinc-700/50 p-2 rounded-lg">
                        <Package className="h-6 w-6 text-[#F4C95D]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400 text-sm mb-1">Média Registros/Hora</p>
                        <div className="text-2xl font-bold">{mediaPorHora}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Últimas 24 horas
                        </div>
                      </div>
                      <div className="bg-zinc-700/50 p-2 rounded-lg">
                        <Clock3 className="h-6 w-6 text-[#F4C95D]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status do Sistema */}
              <div className="mb-6">
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-[#F4C95D]" />
                      Status do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg border ${sistemaLigado ? 'bg-green-900/20 border-green-800/30' : 'bg-red-900/20 border-red-800/30'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-zinc-400">Estado</div>
                            <div className={`mt-1 font-medium ${sistemaLigado ? 'text-green-400' : 'text-red-400'}`}>
                              {sistemaLigado ? 'Sistema Online' : 'Sistema Offline'}
                            </div>
                          </div>
                          <div className={`h-3 w-3 rounded-full ${sistemaLigado ? 'bg-green-500' : 'bg-red-500'} ${sistemaLigado ? 'animate-pulse' : ''}`}></div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                        <div className="text-sm font-medium text-zinc-400">Modo de Operação</div>
                        <div className="mt-1 font-medium flex items-center capitalize">
                          {systemConfig?.modo === 'automatico' ? (
                            <>
                              <Clock3 className="h-4 w-4 mr-1.5 text-[#F4C95D]" />
                              Automático
                            </>
                          ) : (
                            <>
                              <Settings className="h-4 w-4 mr-1.5 text-[#F4C95D]" />
                              Manual
                            </>
                          )}
                        </div>
                      </div>
                      
                      {systemConfig?.modo === 'automatico' && (
                        <div className={`p-4 rounded-lg border ${dentroDoHorario && sistemaLigado ? 'bg-green-900/20 border-green-800/30' : 'bg-amber-900/20 border-amber-800/30'}`}>
                           <div className="text-sm font-medium text-zinc-400">Janela Programada</div>
                           {systemConfig.dataInicio && systemConfig.horaInicio && systemConfig.dataFim && systemConfig.horaFim ? (
                            <div className="mt-1 font-medium text-xs">
                                De: {formatarDataBR(systemConfig.dataInicio)} {formatarHora(systemConfig.horaInicio)}<br/>
                                Até: {formatarDataBR(systemConfig.dataFim)} {formatarHora(systemConfig.horaFim)}
                            </div>
                           ) : (
                            <div className="mt-1 font-medium text-amber-400 text-xs">Não configurada</div>
                           )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Top Lojas por Quantidade</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dadosContagensPorLoja}
                          layout="vertical"
                          margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                          <XAxis type="number" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                          <YAxis 
                            dataKey="loja" 
                            type="category" 
                            stroke="rgba(255,255,255,0.5)" 
                            width={70}
                            tick={{ fontSize: 10 }}
                            interval={0}
                          />
                          <RechartsTooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ 
                              backgroundColor: 'rgba(30,30,30,0.9)', 
                              borderColor: 'rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                          <Bar dataKey="total" fill="#F4C95D" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Registros de Contagem por Hora</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dadosContagensPorHora}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="hora" 
                            stroke="rgba(255,255,255,0.5)"
                            tickFormatter={(value) => `${value}h`} 
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis stroke="rgba(255,255,255,0.5)" allowDecimals={false} tick={{ fontSize: 10 }}/>
                          <RechartsTooltip 
                             cursor={{stroke: '#F4C95D', strokeWidth: 1, strokeDasharray: "3 3"}}
                            contentStyle={{ 
                              backgroundColor: 'rgba(30,30,30,0.9)', 
                              borderColor: 'rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                            formatter={(value: number, name: string) => [`${value} ${name === 'contagens' ? 'registros' : value}`, 'Total']}
                            labelFormatter={(label: number) => `${label.toString().padStart(2,'0')}:00 - ${label.toString().padStart(2,'0')}:59`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="contagens" 
                            name="Registros"
                            stroke="#F4C95D" 
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#F4C95D', strokeWidth:1, stroke: 'rgba(30,30,30,0.9)' }}
                            activeDot={{ r: 5, stroke: '#F4C95D', strokeWidth: 2, fill: 'rgba(30,30,30,0.9)' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
                
              <IntegrationManager 
                systemConfig={systemConfig} 
                isLoading={isLoading} 
                onRefresh={handleRefresh}
              />
              <IntegrationLogs isIntegrationEnabled={isIntegrationEnabled} />


            </>
          )}
        </TabsContent>

        <TabsContent value="configurations" className="mt-0">
           {isLoading && !systemConfig ? (
             <div className="flex justify-center items-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
               <p className="ml-2">Carregando configurações...</p>
             </div>
           ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Modo de Operação do Sistema</CardTitle>
                  <CardDescription>Defina como o sistema de contagem será ativado e desativado.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="modo-automatico-switch" className="text-base">Modo Automático</Label>
                        <p className="text-sm text-zinc-400">
                          O sistema liga e desliga conforme o agendamento.
                        </p>
                      </div>
                      <Switch 
                        id="modo-automatico-switch"
                        checked={sistemaAutomatico} 
                        onCheckedChange={handleModeChange}
                        disabled={isLoading}
                      />
                    </div>

                    {sistemaAutomatico ? (
                      <div className="border border-zinc-700/30 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">Agendamento Atual</h3>
                            <p className="text-sm text-zinc-400">
                              Período em que o sistema estará ativo.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                // Sincroniza o estado do formulário do diálogo com systemConfig antes de abrir
                                setScheduleFormState({
                                    modo: systemConfig?.modo || 'automatico',
                                    dataInicio: systemConfig?.dataInicio || '',
                                    horaInicio: systemConfig?.horaInicio || '',
                                    dataFim: systemConfig?.dataFim || '',
                                    horaFim: systemConfig?.horaFim || '',
                                });
                                setShowScheduleDialog(true);
                            }}
                            className="border-zinc-700 text-white hover:bg-zinc-700"
                            disabled={isLoading}
                          >
                            <Calendar className="h-4 w-4 mr-1.5" />
                            Configurar
                          </Button>
                        </div>
                        {systemConfig?.dataInicio && systemConfig?.horaInicio && systemConfig?.dataFim && systemConfig?.horaFim ? (
                           <div className="space-y-1 text-sm text-zinc-300">
                           <p>De: <span className="font-medium text-white">{formatarDataBR(systemConfig.dataInicio)} às {formatarHora(systemConfig.horaInicio)}</span></p>
                           <p>Até: <span className="font-medium text-white">{formatarDataBR(systemConfig.dataFim)} às {formatarHora(systemConfig.horaFim)}</span></p>
                           <p>Status: <span className={dentroDoHorario && sistemaLigado ? "text-green-400" : "text-amber-400"}>{dentroDoHorario && sistemaLigado ? "Dentro do horário e Online" : "Fora do horário ou Offline"}</span></p>
                         </div>
                        ) : (
                          <div className="bg-amber-900/20 text-amber-400 p-3 rounded-md text-sm">
                            <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                            Agendamento não configurado.
                          </div>
                        )}
                      </div>
                    ) : ( // Modo Manual
                      <div className="border border-zinc-700/30 rounded-lg p-4 space-y-3">
                        <div>
                          <h3 className="font-medium">Controle Manual do Sistema</h3>
                          <p className="text-sm text-zinc-400">
                            Ative ou desative o sistema manualmente.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => onToggleSystem(false)} // false para bloquear (desligar)
                            className={`h-12 ${!sistemaLigado ? 'bg-red-700 hover:bg-red-800' : 'bg-zinc-600 hover:bg-zinc-700'} text-white`}
                            disabled={!sistemaLigado || isLoading}
                          >
                             <div className={`h-2.5 w-2.5 mr-2 rounded-full ${!sistemaLigado ? 'bg-red-400' : 'bg-zinc-400'}`} />
                            Desligar Sistema
                          </Button>
                          <Button
                            onClick={() => onToggleSystem(true)} // true para desbloquear (ligar)
                            className={`h-12 ${sistemaLigado ? 'bg-green-700 hover:bg-green-800' : 'bg-zinc-600 hover:bg-zinc-700'} text-white`}
                            disabled={sistemaLigado || isLoading}
                          >
                             <div className={`h-2.5 w-2.5 mr-2 rounded-full ${sistemaLigado ? 'bg-green-400' : 'bg-zinc-400'}`} />
                            Ligar Sistema
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                 <CardFooter className="text-xs text-zinc-500">
                    O sistema é verificado automaticamente a cada minuto para garantir o estado correto conforme o modo e agendamento.
                 </CardFooter>
              </Card>
              
              <SystemMaintenanceCard 
                 systemConfig={systemConfig} 
                 contagensData={contagensData}
                 onRefresh={onRefresh}
               />

            </div>
           )}
        </TabsContent>


        <TabsContent value="management" className="mt-0">
          {isLoading && !systemConfig ? (
            <div className="flex justify-center items-center h-64">
               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
               <p className="ml-2">Carregando dados de gerenciamento...</p>
             </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Gerenciamento de Contagens</CardTitle>
                  <CardDescription>Visualize, edite ou remova contagens individuais.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* TODO: Adicionar filtros por loja, email, ativo, data */}
                  <div className="rounded-md border border-zinc-700 overflow-hidden">
                    <ScrollArea className="h-[500px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-zinc-800 z-10">
                          <tr>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Loja</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Email</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Ativo</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-zinc-400">Qtd.</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Data</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700/50">
                          {contagensData.length > 0 ? contagensData.map((registro) => (
                            <tr key={registro.id} className="hover:bg-zinc-800/50">
                              <td className="py-2.5 px-4">{registro.loja_nome}</td>
                              <td className="py-2.5 px-4 text-zinc-400">{registro.email}</td>
                              <td className="py-2.5 px-4">{registro.ativo_nome}</td>
                              <td className="py-2.5 px-4 text-center">
                                <Badge variant="secondary" className="bg-zinc-700 text-zinc-300 font-mono">
                                  {registro.quantidade}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-zinc-400 text-xs">
                                {formatarData(registro.data_registro)}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditContagemClick(registro)}
                                    className="h-7 w-7 text-zinc-400 hover:text-[#F4C95D] hover:bg-zinc-700"
                                    title="Editar contagem"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-900/20"
                                        title="Remover contagem"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-zinc-900 text-white border-zinc-800">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-400">
                                          Tem certeza que deseja excluir esta contagem ({registro.ativo_nome} - {registro.loja_nome})? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction 
                                          className="bg-red-600 hover:bg-red-700 text-white"
                                          onClick={() => onRemoveContagem(registro.id)}
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-zinc-500">
                                Nenhuma contagem encontrada.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </CardContent>
                 <CardFooter className="text-xs text-zinc-500">
                    Total de {contagensData.length} registros de contagem de inventário.
                 </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ScheduleConfigDialogComponent
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        initialConfig={scheduleFormState} // Usa o estado local do AdminDashboard para o diálogo
        onSave={handleSaveScheduleDialog} // Esta função chama props.onUpdateSchedule
      />

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Editar Contagem</DialogTitle>
            {editingContagem && (
              <DialogDescription className="text-zinc-400">
                Modificando quantidade para {editingContagem.ativo_nome} na loja {editingContagem.loja_nome}.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 space-y-3">
            {editingContagem && (
              <>
                <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700 text-sm">
                  <span className="text-zinc-400">Data Original: </span>{formatarData(editingContagem.data_registro)}
                </div>
                <div>
                  <Label htmlFor="editQuantidade" className="text-base">Nova Quantidade</Label>
                  <Input
                    id="editQuantidade"
                    type="number"
                    value={editForm.quantidade}
                    onChange={(e) => setEditForm({...editForm, quantidade: parseInt(e.target.value, 10) || 0})}
                    className="bg-zinc-800 border-zinc-700 h-12 mt-1"
                    autoFocus
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;