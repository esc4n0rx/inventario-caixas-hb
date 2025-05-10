'use client'

import { useEffect, useState } from 'react';
import { useIntegrationProcessor } from '@/hooks/useIntegrationProcessor';
import { supabase } from '@/lib/supabase';

/**
 * Provedor de integração para o aplicativo
 * 
 * Este componente verifica se a integração está ativa e configura
 * o processador de integração conforme necessário.
 */
export default function IntegrationProvider() {
  const [isIntegrationEnabled, setIsIntegrationEnabled] = useState(false);
  
  // Carregar estado da integração
  useEffect(() => {
    async function checkIntegrationStatus() {
      try {
        const { data, error } = await supabase
          .from('integracao_config')
          .select('enabled')
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Erro ao verificar status da integração:', error);
          }
          return;
        }
        
        setIsIntegrationEnabled(!!data.enabled);
      } catch (error) {
        console.error('Erro ao verificar configuração de integração:', error);
      }
    }
    
    checkIntegrationStatus();
    
    // Configurar verificação periódica (a cada 5 minutos)
    const intervalId = setInterval(checkIntegrationStatus, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Utilizar o hook de processamento
  useIntegrationProcessor({ enabled: isIntegrationEnabled });
  
  // Não renderiza nada, apenas gerencia o estado
  return null;
}