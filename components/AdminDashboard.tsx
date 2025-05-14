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
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import CleanupCard from "@/components/CleanupCard" 
import SystemMaintenanceCard from "@/components/SystemMaintenanceCard";
import { formatarData } from '@/lib/utils';
import { lojas } from '@/data/lojas';
import { ativos } from '@/data/ativos';

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
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    modo: systemConfig?.modo || 'manual',
    dataInicio: systemConfig?.dataInicio || '',
    horaInicio: systemConfig?.horaInicio || '',
    dataFim: systemConfig?.dataFim || '',
    horaFim: systemConfig?.horaFim || '',
  });
  const [editingContagem, setEditingContagem] = useState<Contagem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ quantidade: number }>({ quantidade: 0 });
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (systemConfig) {
      setScheduleForm({
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
  const progressoInventario = (lojasComContagem / totalLojas) * 100;

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleEditContagem = (contagem: Contagem): void => {
    setEditingContagem(contagem);
    setEditForm({ quantidade: contagem.quantidade });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (editingContagem) {
      await onEditContagem(editingContagem.id, editForm.quantidade);
      setShowEditDialog(false);
    }
  };

  const handleSaveSchedule = async (): Promise<void> => {
    await onUpdateSchedule({
      modo: scheduleForm.modo,
      dataInicio: scheduleForm.dataInicio,
      horaInicio: scheduleForm.horaInicio,
      dataFim: scheduleForm.dataFim,
      horaFim: scheduleForm.horaFim
    });
    setShowScheduleDialog(false);
  };

  const handleModeChange = (value: boolean) => {
    const newMode = value ? 'automatico' : 'manual';
    setScheduleForm({
      ...scheduleForm,
      modo: newMode
    });
    
    if (value && (!systemConfig?.dataInicio || !systemConfig?.horaInicio)) {
      setShowScheduleDialog(true);
    } else {
      onUpdateSchedule({ modo: newMode });
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
      if (!agg[c.loja]) agg[c.loja] = { loja: c.loja_nome, total: 0 };
      agg[c.loja].total += c.quantidade;
    });
    return Object.values(agg)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const prepararDadosAtivosPorContagem = (): Array<{ ativo: string; total: number }> => {
    const agg: Record<string, { ativo: string; total: number }> = {};
    contagensData.forEach((c) => {
      if (!agg[c.ativo]) agg[c.ativo] = { ativo: c.ativo_nome, total: 0 };
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
  const sistemaLigado = !(systemConfig?.bloqueado ?? false);

  const verificarHorarioProgramado = (): boolean => {
    if (!systemConfig || !systemConfig.dataInicio || !systemConfig.dataFim) return false;
    const now = new Date();
    const inicio = new Date(`${systemConfig.dataInicio}T${systemConfig.horaInicio}`);
    const fim = new Date(`${systemConfig.dataFim}T${systemConfig.horaFim}`);
    return now >= inicio && now <= fim;
  };

  const dentroDoHorario = verificarHorarioProgramado();

  const formatarDataBR = (dataISO: string): string => {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  function fetchSystemData(): Promise<void> {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="flex flex-col w-full">
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
            <RefreshCcw className={`mr-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
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
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
              <p className="ml-2">Carregando dados...</p>
            </div>
          ) : (
            <>
              {/* Cards de Status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                    <Progress value={progressoInventario} className="h-2.5 bg-zinc-700" />
                  </CardContent>
                </Card>

                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-zinc-400 text-sm mb-1">Contagens Recebidas</p>
                        <div className="text-2xl font-bold">{contagensData.length / ativos.length}</div>
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
                        <p className="text-zinc-400 text-sm mb-1">Total de Ativos</p>
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
                        <p className="text-zinc-400 text-sm mb-1">Média por Hora</p>
                        <div className="text-2xl font-bold">{mediaPorHora}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Nas últimas 24 horas
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
                            <div className="mt-1 font-medium">
                              {sistemaLigado ? 'Sistema Online' : 'Sistema Offline'}
                            </div>
                          </div>
                          <div className={`h-4 w-4 rounded-full ${sistemaLigado ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                        <div className="text-sm font-medium text-zinc-400">Modo de Operação</div>
                        <div className="mt-1 font-medium flex items-center">
                          {sistemaAutomatico ? (
                            <>
                              <Clock3 className="h-4 w-4 mr-1.5 text-[#F4C95D]" />
                              Programado
                            </>
                          ) : (
                            <>
                              <Settings className="h-4 w-4 mr-1.5 text-[#F4C95D]" />
                              Manual
                            </>
                          )}
                        </div>
                      </div>
                      
                      {sistemaAutomatico && (
                        <div className={`p-4 rounded-lg border ${dentroDoHorario ? 'bg-green-900/20 border-green-800/30' : 'bg-amber-900/20 border-amber-800/30'}`}>
                          <div className="text-sm font-medium text-zinc-400">Janela de Funcionamento</div>
                          <div className="mt-1 font-medium">
                            {systemConfig?.dataInicio && 
                             `${formatarDataBR(systemConfig.dataInicio)} ${systemConfig.horaInicio} até ${formatarDataBR(systemConfig?.dataFim || '')} ${systemConfig?.horaFim || ''}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos em duas colunas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Gráfico de barras - Top Lojas */}
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Top Lojas por Contagem</CardTitle>
                    <CardDescription>Total de itens contados por loja</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={dadosContagensPorLoja}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 90, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                          <XAxis type="number" stroke="#888" />
                          <YAxis 
                            dataKey="loja" 
                            type="category" 
                            stroke="#888" 
                            width={80}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#333', 
                              border: '1px solid #555',
                              borderRadius: '4px'
                            }}
                          />
                          <Bar dataKey="total" fill="#F4C95D" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Linha - Contagens por Hora */}
                <Card className="bg-zinc-800/50 border-zinc-700/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Contagens por Hora</CardTitle>
                    <CardDescription>Distribuição das contagens durante o dia</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={dadosContagensPorHora}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis 
                            dataKey="hora" 
                            stroke="#888"
                            tickFormatter={(value) => `${value}h`} 
                          />
                          <YAxis stroke="#888" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#333', 
                              border: '1px solid #555',
                              borderRadius: '4px'
                            }}
                            formatter={(value, name) => [`${value} contagens`, 'Total']}
                            labelFormatter={(label) => `${label}:00 - ${label}:59`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="contagens" 
                            stroke="#F4C95D" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6, stroke: '#F4C95D', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de pizza - Tipos de Ativo */}
              <Card className="bg-zinc-800/50 border-zinc-700/50 mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Distribuição por Tipo de Ativo</CardTitle>
                  <CardDescription>Quantidade total por tipo de caixa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex justify-center">
                    <ResponsiveContainer width="80%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosAtivosPorContagem}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={120}
                          innerRadius={60}
                          fill="#8884d8"
                          dataKey="total"
                          nameKey="ativo"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {dadosAtivosPorContagem.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#333', 
                            border: '1px solid #555',
                            borderRadius: '4px'
                          }}
                          formatter={(value, name, props) => [`${value} unidades`, props.payload.ativo]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="configurations" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Configuração de Modo */}
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Modo de Operação</CardTitle>
                <CardDescription>Determine como o sistema liga e desliga</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
                    <div className="space-y-0.5">
                      <Label className="text-base">Modo Automatizado</Label>
                      <p className="text-sm text-zinc-400">
                        Sistema liga e desliga nos horários programados
                      </p>
                    </div>
                    <Switch 
                      checked={sistemaAutomatico} 
                      onCheckedChange={handleModeChange}
                    />
                  </div>

                  {sistemaAutomatico ? (
                    <div className="border border-zinc-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-medium">Horário Programado</h3>
                          <p className="text-sm text-zinc-400">
                            Janela de funcionamento do sistema
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowScheduleDialog(true)}
                          className="border-zinc-700 text-white hover:bg-zinc-700"
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                      </div>

                      <SystemMaintenanceCard 
                        systemConfig={systemConfig} 
                        contagensData={contagensData}
                        onRefresh={onRefresh}
                      />

                      {systemConfig?.dataInicio ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between bg-zinc-700/20 p-3 rounded-md">
                            <span className="text-zinc-400">Data Início:</span>
                            <span>{systemConfig.dataInicio.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-700/20 p-3 rounded-md">
                            <span className="text-zinc-400">Hora Início:</span>
                            <span>{systemConfig.horaInicio}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-700/20 p-3 rounded-md">
                            <span className="text-zinc-400">Data Fim:</span>
                            <span>{systemConfig.dataFim?.split('-').reverse().join('/') || '-'}</span>
                          </div>
                          <div className="flex justify-between bg-zinc-700/20 p-3 rounded-md">
                            <span className="text-zinc-400">Hora Fim:</span>
                            <span>{systemConfig.horaFim}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-900/20 text-amber-400 p-3 rounded-md text-sm">
                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                          Nenhum horário configurado ainda
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-zinc-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-medium">Controle Manual</h3>
                          <p className="text-sm text-zinc-400">
                            Ligar ou desligar o sistema manualmente
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button
                          onClick={() => onToggleSystem(false)}
                          className={`h-12 ${!sistemaLigado ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-zinc-700/30 text-zinc-400 border-zinc-700/50'} border`}
                          variant="outline"
                          disabled={!sistemaLigado}
                        >
                          <div className={`h-2 w-2 mr-2 rounded-full ${!sistemaLigado ? 'bg-red-500' : 'bg-zinc-500'}`} />
                          Desligar Sistema
                        </Button>
                        
                        <Button
                          onClick={() => onToggleSystem(true)}
                          className={`h-12 ${sistemaLigado ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-zinc-700/30 text-zinc-400 border-zinc-700/50'} border`}
                          variant="outline"
                          disabled={sistemaLigado}
                        >
                          <div className={`h-2 w-2 mr-2 rounded-full ${sistemaLigado ? 'bg-green-500' : 'bg-zinc-500'}`} />
                          Ligar Sistema
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Estado Atual */}
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Estado Atual</CardTitle>
                <CardDescription>Status e estatísticas de operação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status atual com badge de semáforo */}
                  <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Status do Sistema</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {sistemaLigado ? 'Aceitando novas contagens' : 'Bloqueado para novas contagens'}
                        </p>
                      </div>
                      <Badge 
                        className={`px-3 py-1 ${
                          sistemaLigado ? 'bg-green-600/30 text-green-400 hover:bg-green-600/30' : 
                          'bg-red-600/30 text-red-400 hover:bg-red-600/30'
                        }`}
                      >
                        {sistemaLigado ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  </div>

                  {/* Progresso de inventário */}
                  <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="font-medium">Progresso do Inventário</h3>
                        <p className="text-sm text-zinc-400 mt-1">
                          {lojasComContagem} de {totalLojas} lojas completaram
                        </p>
                      </div>
                      <Badge className="bg-[#F4C95D]/30 text-[#F4C95D] hover:bg-[#F4C95D]/30 px-3 py-1">
                        {progressoInventario.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={progressoInventario} className="h-2.5 bg-zinc-700" />
                  </div>

                    <BatchGenerator 
                      systemConfig={systemConfig as SystemConfig} 
                      onRefresh={handleRefresh}
                    />

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                      <div className="text-xs text-zinc-400">Total Itens Contados</div>
                      <div className="text-xl font-bold mt-1">
                        {dadosAtivosPorContagem.reduce((sum, item) => sum + item.total, 0)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                      <div className="text-xs text-zinc-400">Média por Loja</div>
                      <div className="text-xl font-bold mt-1">
                        {(dadosAtivosPorContagem.reduce((sum, item) => sum + item.total, 0) / (lojasComContagem || 1)).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="mt-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
              <p className="ml-2">Carregando dados...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seleção de Loja */}
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Gerenciamento de Contagens</CardTitle>
                  <CardDescription>Edite ou remova contagens de lojas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <Label className="mb-2 block">Selecione uma loja para gerenciar</Label>
                    <Select 
                      onValueChange={(value) => {
                        /* Implementar filtro de loja */
                      }}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 h-10">
                        <SelectValue placeholder="Todas as lojas" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="todas">Todas as lojas</SelectItem>
                        {lojas.map((loja) => (
                          <SelectItem key={loja.id} value={loja.id}>
                            {loja.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tabela de Contagens */}
                  <div className="rounded-md border border-zinc-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-zinc-800">
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Loja</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Email</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Ativo</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Qtd.</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400">Data</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contagensData.slice(0, 10).map((registro) => (
                            <tr key={registro.id} className="border-t border-zinc-700 hover:bg-zinc-800/50">
                              <td className="py-3 px-4 text-sm">{registro.loja_nome}</td>
                              <td className="py-3 px-4 text-sm">{registro.email}</td>
                              <td className="py-3 px-4 text-sm">{registro.ativo_nome}</td>
                              <td className="py-3 px-4 text-sm">
                                <Badge variant="outline" className="bg-zinc-800 font-mono">
                                  {registro.quantidade}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-zinc-400">
                                {formatarData(registro.data_registro)}
                              </td>
                              <td className="py-3 px-4 text-sm text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditContagem(registro)}
                                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-zinc-900 text-white border-zinc-800">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-400">
                                          Tem certeza que deseja excluir esta contagem? Esta ação não pode ser desfeita.
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
                          ))}
                          {contagensData.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-zinc-400">
                                Nenhuma contagem encontrada
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {contagensData.length > 10 && (
                      <div className="p-3 text-center text-zinc-400 border-t border-zinc-700 text-sm">
                        Mostrando 10 de {contagensData.length} contagens
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Gerenciamento de Lojas */}
              <Card className="bg-zinc-800/50 border-zinc-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium">Lojas com Contagem Concluída</CardTitle>
                  <CardDescription>Lojas que já finalizaram o inventário</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-72 rounded-md border border-zinc-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Array.from(new Set(contagensData.map(c => c.loja))).map(lojaId => {
                        const loja = lojas.find(l => l.id === lojaId);
                        const lojaContagens = contagensData.filter(c => c.loja === lojaId);
                        const ultimaContagem = new Date(Math.max(...lojaContagens.map(c => new Date(c.data_registro).getTime())));
                        
                        return (
                          <div key={lojaId} className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg border border-zinc-700/30">
                            <div>
                              <div className="font-medium">{loja ? loja.nome : lojaId}</div>
                              <div className="text-xs text-zinc-400 mt-1">
                                {formatarData(ultimaContagem)}
                              </div>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                >
                                  Detalhes
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 bg-zinc-800 border-zinc-700" align="end">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Detalhes da Contagem</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-zinc-400">Total de Registros:</div>
                                    <div>{lojaContagens.length}</div>
                                    <div className="text-zinc-400">Email Responsável:</div>
                                    <div>{lojaContagens[0]?.email}</div>
                                    <div className="text-zinc-400">Data da Contagem:</div>
                                    <div>{formatarData(ultimaContagem)}</div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter className="text-zinc-400 text-sm">
                  Total: {Array.from(new Set(contagensData.map(c => c.loja))).length} lojas concluídas
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de Configuração de Horário */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
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
                <Input
                  type="date"
                  value={scheduleForm.dataInicio}
                  onChange={(e) => setScheduleForm({...scheduleForm, dataInicio: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de Início</Label>
                <Input
                  type="time"
                  value={scheduleForm.horaInicio}
                  onChange={(e) => setScheduleForm({...scheduleForm, horaInicio: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={scheduleForm.dataFim}
                  onChange={(e) => setScheduleForm({...scheduleForm, dataFim: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de Término</Label>
                <Input
                  type="time"
                  value={scheduleForm.horaFim}
                  onChange={(e) => setScheduleForm({...scheduleForm, horaFim: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSchedule}
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição de Contagem */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Editar Contagem</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Modifique a quantidade contada para este item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editingContagem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                    <div className="text-xs text-zinc-400">Loja</div>
                    <div className="mt-1">{editingContagem.loja_nome}</div>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                    <div className="text-xs text-zinc-400">Item</div>
                    <div className="mt-1">{editingContagem.ativo_nome}</div>
                  </div>
                </div>
                <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                  <div className="text-xs text-zinc-400">Data do Registro</div>
                  <div className="mt-1">{formatarData(editingContagem.data_registro)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Nova Quantidade</Label>
                  <Input
                    type="number"
                    value={editForm.quantidade}
                    onChange={(e) => setEditForm({...editForm, quantidade: parseInt(e.target.value) || 0})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminDashboard;