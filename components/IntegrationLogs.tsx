import { useState, useEffect } from "react";
import { Clock, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatarData } from "@/lib/utils";

interface IntegrationLog {
  id: number;
  token: string;
  ip_address: string;
  user_agent: string;
  date: string;
}

interface IntegrationLogsProps {
  isIntegrationEnabled: boolean;
}

export default function IntegrationLogs({ isIntegrationEnabled }: IntegrationLogsProps) {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statsLastHour, setStatsLastHour] = useState({ count: 0 });
  const [statsLastDay, setStatsLastDay] = useState({ count: 0 });

  useEffect(() => {
    if (isIntegrationEnabled) {
      fetchLogs();
      fetchStats();
    }
  }, [isIntegrationEnabled]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('integracao_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao buscar logs de integração:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Calcular timestamps para últimas 1 hora e 24 horas
      const now = new Date();
      
      const oneHourAgo = new Date(now);
      oneHourAgo.setHours(now.getHours() - 1);
      
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);
      
      // Buscar contagem para última hora
      const { count: countLastHour, error: errorLastHour } = await supabase
        .from('integracao_logs')
        .select('*', { count: 'exact', head: true })
        .gte('date', oneHourAgo.toISOString());
      
      if (errorLastHour) throw errorLastHour;
      
      // Buscar contagem para último dia
      const { count: countLastDay, error: errorLastDay } = await supabase
        .from('integracao_logs')
        .select('*', { count: 'exact', head: true })
        .gte('date', oneDayAgo.toISOString());
      
      if (errorLastDay) throw errorLastDay;
      
      setStatsLastHour({ count: countLastHour || 0 });
      setStatsLastDay({ count: countLastDay || 0 });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de integração:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchLogs();
    await fetchStats();
  };

  if (!isIntegrationEnabled) {
    return null;
  }

  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50 mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#F4C95D]" />
          <CardTitle className="text-lg font-medium">Atividade de Integração</CardTitle>
        </div>
        <CardDescription>
          Monitoramento de acessos à API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Acessos (última hora)</p>
                <p className="text-2xl font-bold mt-1">{statsLastHour.count}</p>
              </div>
              <Clock className="h-8 w-8 text-zinc-500" />
            </div>
            <div className="p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Acessos (24 horas)</p>
                <p className="text-2xl font-bold mt-1">{statsLastDay.count}</p>
              </div>
              <Activity className="h-8 w-8 text-zinc-500" />
            </div>
          </div>

          {/* Lista de logs */}
          <div className="rounded-lg border border-zinc-700/30 overflow-hidden">
            <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700/30 flex justify-between items-center">
              <h3 className="font-medium">Logs de Acesso</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-zinc-700"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
            
            <ScrollArea className="h-60">
              {logs.length > 0 ? (
                <div className="divide-y divide-zinc-700/30">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-zinc-800/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{log.ip_address}</div>
                          <div className="text-xs text-zinc-500 mt-1 truncate max-w-xs">{log.user_agent}</div>
                        </div>
                        <Badge variant="outline" className="bg-zinc-800 text-xs">
                          {formatarData(log.date)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-full p-6 text-zinc-500">
                  {isLoading ? "Carregando logs..." : "Nenhum log de acesso encontrado"}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-zinc-500">
        {logs.length > 0 
          ? `Exibindo os últimos ${logs.length} acessos de um total de ${statsLastDay.count} nas últimas 24h` 
          : 'Nenhum acesso registrado'}
      </CardFooter>
    </Card>
  );
}