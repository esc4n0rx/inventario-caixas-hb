'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

/**
 * Este componente deve ser incluído em _app.tsx ou layout.tsx
 * para verificar o status do sistema periodicamente e garantir
 * que o bloqueio/desbloqueio ocorra no horário programado.
 */
export default function SystemStatusChecker() {
  const { setIsBlocked } = useStore();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  useEffect(() => {
    // Função para verificar o status do sistema
    const checkSystemStatus = async () => {
      try {
        const response = await fetch('/api/sistema/check-status');
        const data = await response.json();
        
        if (data.success) {
          // Atualizar o estado global do sistema se ele foi alterado
          if (data.status === 'blocked') {
            setIsBlocked(true);
          } else if (data.status === 'unblocked') {
            setIsBlocked(false);
          }
          
          // Registrar quando ocorreu a última verificação
          setLastCheck(new Date());
        }
      } catch (error) {
        console.error('Erro ao verificar status do sistema:', error);
      }
    };
    
    // Verificar imediatamente ao montar o componente
    checkSystemStatus();
    
    // Configurar verificação periódica (a cada minuto)
    const intervalId = setInterval(checkSystemStatus, 60000);
    
    // Limpar intervalo ao desmontar o componente
    return () => clearInterval(intervalId);
  }, [setIsBlocked]);
  
  // Este é um componente invisível, não renderiza nada na UI
  return null;
}