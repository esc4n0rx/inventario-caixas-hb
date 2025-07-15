// components/WebhookConfiguration.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Webhook, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface WebhookConfig {
  url: string;
  token: string;
  enabled: boolean;
  last_updated?: string;
}

interface WebhookConfigurationProps {
  adminPassword: string;
}

export function WebhookConfiguration({ adminPassword }: WebhookConfigurationProps) {
  const [config, setConfig] = useState<WebhookConfig>({
    url: '',
    token: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhook/config');
      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
      } else {
        throw new Error(data.error || 'Erro ao buscar configuração');
      }
    } catch (error) {
      console.error('Erro ao buscar configuração do webhook:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a configuração do webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/webhook/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          token: config.token,
          enabled: config.enabled,
          senha: adminPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
        toast({
          title: 'Sucesso',
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração do webhook:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração do webhook',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Webhook className="h-5 w-5" />
            Configuração do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Webhook className="h-5 w-5" />
          Configuração do Webhook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <Label htmlFor="webhook-enabled" className="text-sm font-medium text-zinc-300">
            Status do Webhook
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id="webhook-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
            />
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* URL do Webhook */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url" className="text-sm font-medium text-zinc-300">
            URL do Webhook
          </Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://exemplo.com/webhook"
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <p className="text-xs text-zinc-500">
            URL onde as contagens serão enviadas via POST
          </p>
        </div>

        {/* Token de Acesso */}
        <div className="space-y-2">
          <Label htmlFor="webhook-token" className="text-sm font-medium text-zinc-300">
            Token de Acesso (Opcional)
          </Label>
          <Input
            id="webhook-token"
            type="password"
            placeholder="Token de autenticação"
            value={config.token}
            onChange={(e) => setConfig({ ...config, token: e.target.value })}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
          <p className="text-xs text-zinc-500">
            Token enviado no header Authorization: Bearer {config.token ? '[CONFIGURADO]' : '[VAZIO]'}
          </p>
        </div>

        {/* Informações sobre o formato */}
        <div className="bg-zinc-800 p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Formato dos Dados</h4>
          <pre className="text-xs text-zinc-300 overflow-x-auto">
{`{
  "contagens": [
    {
      "email": "usuario@hortifruti.com.br",
      "ativo_nome": "Nome do Ativo",
      "quantidade": 10,
      "loja_nome": "Nome da Loja",
      "tipo": "loja", // ou "transito"
      "obs": "Observações opcionais"
    }
  ]
}`}
          </pre>
          <p className="text-xs text-zinc-500 mt-2">
            CD SP e CD ES enviam 2 webhooks: um com tipo "loja" e outro com tipo "transito"
          </p>
        </div>

        {/* Botão de Salvar */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </>
          )}
        </Button>

        {/* Última atualização */}
        {config.last_updated && (
          <p className="text-xs text-zinc-500 text-center">
            Última atualização: {new Date(config.last_updated).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}