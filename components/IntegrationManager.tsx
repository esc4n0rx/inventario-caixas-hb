import { useState, useEffect } from "react";
import { Plug, Copy, RefreshCw, Check, AlertTriangle, Database, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

export interface IntegrationConfig {
  id?: number;
  enabled: boolean;
  token: string;
  expiration: string;
  lastUsed?: string;
  connections?: number;
}

interface IntegrationManagerProps {
  systemConfig: any;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export default function IntegrationManager({ systemConfig, isLoading, onRefresh }: IntegrationManagerProps) {
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState(false);
  const { toast } = useToast();

  // Buscar configuração de integração ao iniciar
  useEffect(() => {
    fetchIntegrationConfig();
  }, []);

  // Atualizar estado do switch quando a configuração mudar
  useEffect(() => {
    if (integrationConfig) {
      setIsIntegrationEnabled(integrationConfig.enabled);
    }
  }, [integrationConfig]);

  const fetchIntegrationConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('integracao_config')
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Registro não encontrado, criar um novo com estado desabilitado
          setIntegrationConfig({
            enabled: false,
            token: '',
            expiration: '',
          });
          return;
        }
        throw error;
      }
      
      setIntegrationConfig(data);
    } catch (error) {
      console.error('Erro ao buscar configuração de integração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de integração",
        variant: "destructive",
      });
    }
  };

  const handleToggleIntegration = async (enabled: boolean) => {
    if (enabled && !systemConfig?.bloqueado) {
      // Verificar se já existe um token válido
      if (!integrationConfig?.token || isTokenExpired()) {
        // Gerar um novo token se estiver habilitando a integração
        await generateToken();
      }
    }

    try {
      setIsIntegrationEnabled(enabled);
      
      // Atualizar o estado no banco de dados
      const { error } = await supabase
        .from('integracao_config')
        .upsert({
          id: integrationConfig?.id || 1,
          enabled: enabled,
          token: integrationConfig?.token || '',
          expiration: integrationConfig?.expiration || '',
          last_updated: new Date().toISOString()
        });
      
      if (error) throw error;
      
      await fetchIntegrationConfig();
      
      toast({
        title: enabled ? "Integração ativada" : "Integração desativada",
        description: enabled 
          ? "As contagens agora serão disponibilizadas via API para sistemas externos" 
          : "A integração foi desativada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar estado da integração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estado da integração",
        variant: "destructive",
      });
      // Reverter o estado visual do switch
      setIsIntegrationEnabled(!enabled);
    }
  };

  const generateToken = async () => {
    setIsGeneratingToken(true);
    
    try {
      // Gerar um token aleatório forte
      const randomToken = generateRandomToken(32);
      
      // Calcular data de expiração (24 horas a partir de agora)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 24);
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('integracao_config')
        .upsert({
          id: integrationConfig?.id || 1,
          enabled: isIntegrationEnabled,
          token: randomToken,
          expiration: expirationDate.toISOString(),
          last_updated: new Date().toISOString()
        });
      
      if (error) throw error;
      
      await fetchIntegrationConfig();
      
      toast({
        title: "Token gerado com sucesso",
        description: "Um novo token de acesso foi gerado e será válido por 24 horas",
      });
    } catch (error) {
      console.error('Erro ao gerar token de integração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar um novo token",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (integrationConfig?.token) {
      navigator.clipboard.writeText(integrationConfig.token);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      
      toast({
        title: "Token copiado",
        description: "O token foi copiado para a área de transferência",
      });
    }
  };

  const generateRandomToken = (length: number) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < length; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return token;
  };

  const isTokenExpired = () => {
    if (!integrationConfig?.expiration) return true;
    
    const expirationDate = new Date(integrationConfig.expiration);
    const now = new Date();
    
    return now > expirationDate;
  };

  const formatTimeRemaining = () => {
    if (!integrationConfig?.expiration) return 'Não disponível';
    
    const expirationDate = new Date(integrationConfig.expiration);
    const now = new Date();
    
    if (now > expirationDate) return 'Expirado';
    
    const diffMs = expirationDate.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m`;
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'Não disponível';
    
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const apiUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/integration/data` 
    : '/api/integration/data';

  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-[#F4C95D]" />
          <CardTitle className="text-lg font-medium">Integração com Sistemas Externos</CardTitle>
        </div>
        <CardDescription>
          Compartilhe dados do inventário com outros sistemas em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Switch de ativação */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Integração</Label>
              <p className="text-sm text-zinc-400">
                Permitir que sistemas externos recebam dados das contagens
              </p>
            </div>
            <Switch 
              checked={isIntegrationEnabled} 
              onCheckedChange={handleToggleIntegration}
              disabled={systemConfig?.bloqueado || isLoading}
            />
          </div>

          {/* Aviso de sistema bloqueado */}
          {systemConfig?.bloqueado && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-900/20 border border-amber-800/30 text-amber-400">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Sistema bloqueado</p>
                <p className="text-sm mt-1">
                  A integração não pode ser ativada enquanto o sistema estiver bloqueado para contagens.
                </p>
              </div>
            </div>
          )}

          {/* Token e status da integração */}
          {isIntegrationEnabled && integrationConfig && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-zinc-700/30 bg-zinc-700/20">
                <h3 className="font-medium mb-3">Detalhes da Integração</h3>
                
                <div className="space-y-3">
                  {/* Token de acesso */}
                  <div>
                    <Label className="text-sm text-zinc-400">Token de Acesso</Label>
                    <div className="mt-1 flex gap-2">
                      <Input 
                        value={integrationConfig.token || 'Nenhum token gerado'} 
                        readOnly 
                        className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleCopyToken}
                        disabled={!integrationConfig.token}
                        className="border-zinc-700 text-white hover:bg-zinc-700"
                      >
                        {copySuccess ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Status e tempo restante */}
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                      <Label className="text-xs text-zinc-400">Estado do Token</Label>
                      <div className="mt-1 flex items-center">
                        {isTokenExpired() ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Expirado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-900/30 text-green-400 gap-1 border-green-800/30">
                            <Check className="h-3 w-3" /> Ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700">
                      <Label className="text-xs text-zinc-400">Validade Restante</Label>
                      <div className="mt-1 font-medium">
                        {formatTimeRemaining()}
                      </div>
                    </div>
                  </div>
                  
                  {/* API URL */}
                  <div className="p-3 rounded-md bg-zinc-800 border border-zinc-700 mt-4">
                    <Label className="text-xs text-zinc-400">URL da API</Label>
                    <div className="mt-1 flex items-center justify-between">
                      <code className="text-xs text-zinc-300 font-mono truncate">{apiUrl}</code>
                      <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                        <Lock className="h-3 w-3 mr-1" /> Token Requerido
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Instruções de uso */}
                  <div className="p-3 rounded-md bg-zinc-900 border border-zinc-800 text-sm mt-2">
                    <h4 className="font-medium mb-2 flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-[#F4C95D]" /> Como utilizar
                    </h4>
                    <p className="text-zinc-400 mb-2">
                      Para acessar os dados, faça requisições para a API incluindo o token no header:
                    </p>
                    <pre className="bg-black/30 p-2 rounded text-xs overflow-x-auto">
                      {`GET ${apiUrl}
Authorization: Bearer ${integrationConfig.token || 'seu-token-aqui'}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {isIntegrationEnabled && (
        <CardFooter className="justify-between flex-wrap gap-2">
          <div className="text-xs text-zinc-500">
            {integrationConfig?.expiration && 
              `Token válido até ${formatDateTime(integrationConfig.expiration)}`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateToken}
            disabled={isGeneratingToken}
            className="border-zinc-700 text-white hover:bg-zinc-700"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isGeneratingToken ? 'animate-spin' : ''}`} />
            Gerar Novo Token
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}