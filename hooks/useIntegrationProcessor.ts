/**
 * Hook para processamento de integrações
 * 
 * Este hook monitora novas contagens e as envia para a API
 * de integração quando a integração está ativada.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface IntegrationProcessorOptions {
  enabled: boolean;
}

export function useIntegrationProcessor({ enabled }: IntegrationProcessorOptions) {
  // Referência para armazenar a última assinatura de canal
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Só configura o processador se a integração estiver ativada
    if (!enabled) {
      // Limpa a assinatura existente se a integração for desativada
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        console.log('Processador de integração desativado');
      }
      return;
    }

    // Inicia o processador de integração
    const setupProcessor = async () => {
      console.log('Iniciando processador de integração...');

      try {
        // Verificar se a integração ainda está ativa no banco (uma segunda verificação)
        const { data, error } = await supabase
          .from('integracao_config')
          .select('enabled, token')
          .single();

        if (error || !data.enabled || !data.token) {
          console.log('Integração desativada ou sem token válido');
          return;
        }

        // Configura assinatura de canal para novas inserções de contagens
        const subscription = supabase
          .channel('contagens-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'contagens'
            },
            async (payload) => {
              console.log('Nova contagem detectada:', payload.new);
              
              // A contagem já está disponível via API, não precisamos fazer nada
              // adicional aqui, apenas registrar que foi processada
              
              // Se quisermos notificar sistemas externos ativamente (push em vez de pull),
              // podemos implementar isso aqui
            }
          )
          .subscribe();

        // Armazena a assinatura para limpeza futura
        subscriptionRef.current = subscription;
        
        console.log('Processador de integração ativado com sucesso');
      } catch (error) {
        console.error('Erro ao configurar processador de integração:', error);
      }
    };

    setupProcessor();

    // Limpeza ao desmontar ou quando enabled mudar
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        console.log('Processador de integração desativado');
      }
    };
  }, [enabled]);

  // Este hook não retorna nada, apenas executa efeitos colaterais
  return null;
}