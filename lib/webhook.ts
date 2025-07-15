// lib/webhook.ts
import { supabase } from './supabase';

export interface WebhookPayload {
  contagens: Array<{
    email: string;
    ativo_nome: string;
    quantidade: number;
    loja_nome: string;
    tipo: 'loja' | 'transito';
    obs?: string;
  }>;
}

export interface WebhookConfig {
  url: string;
  token: string;
  enabled: boolean;
}

/**
 * Busca a configuração do webhook no banco de dados
 */
export async function getWebhookConfig(): Promise<WebhookConfig | null> {
  try {
    const { data, error } = await supabase
      .from('webhook_config')
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao buscar configuração do webhook:', error);
      return null;
    }

    return {
      url: data.url || '',
      token: data.token || '',
      enabled: data.enabled || false,
    };
  } catch (error) {
    console.error('Erro ao buscar configuração do webhook:', error);
    return null;
  }
}

/**
 * Envia um webhook para a URL configurada
 */
export async function sendWebhook(payload: WebhookPayload): Promise<boolean> {
  try {
    const config = await getWebhookConfig();
    
    if (!config || !config.enabled || !config.url) {
      console.log('Webhook não configurado ou desabilitado');
      return false;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Adicionar token se configurado
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Erro ao enviar webhook:', response.status, response.statusText);
      return false;
    }

    console.log('Webhook enviado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
    return false;
  }
}

/**
 * Cria múltiplos webhooks individuais para cada ativo
 */
export async function sendIndividualWebhooks(
  email: string,
  loja_nome: string,
  tipo: 'loja' | 'transito',
  contagens: Array<{ ativo_nome: string; quantidade: number; obs?: string }>
): Promise<void> {
  const promises = contagens.map(async (contagem) => {
    const payload: WebhookPayload = {
      contagens: [
        {
          email,
          ativo_nome: contagem.ativo_nome,
          quantidade: contagem.quantidade,
          loja_nome,
          tipo,
          obs: contagem.obs,
        },
      ],
    };

    return sendWebhook(payload);
  });

  await Promise.all(promises);
}