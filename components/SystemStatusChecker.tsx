'use client';

/*
 * 🔄 SystemStatusChecker
 * 
 * Resumo: Esse carinha roda em background, pingando a nossa API a cada minuto pra saber
 *        se o sistema deve ficar bloqueado ou liberado. Sem UI, só fetch + state + uns logs
 *        pra você não esquecer quando foi a última vez que isso rolou.
 */

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function SystemStatusChecker() {
  // Puxando o setter global que bloqueia/desbloqueia o app — tipo o botão de pânico
  const { setIsBlocked } = useStore();
  // Armazenamos a última vez que o check rolou
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Disparo de request pra rota mágica que retorna o status
        const response = await fetch('/api/sistema/check-status');
        const data = await response.json();
        
        // Só processa se o backend cooperar com success=true
        if (data.success) {
          // Aqui a gente decide: bloqueia ou libera?
          if (data.status === 'blocked') {
            setIsBlocked(true);
          } else if (data.status === 'unblocked') {
            setIsBlocked(false);
          }
          // Atualiza o carimbo de data/hora — quem não gosta de um log bonitinho?
          setLastCheck(new Date());
        }
      } catch (error) {
        // Se deu ruim, joga no console e segue o baile — sem crash, por favor!
        console.error('Erro ao verificar status do sistema:', error);
      }
    };
    
    // Primeira chamada na lata, porque aguardar 60s pra saber se tá bloqueado é dose
    checkSystemStatus();
    
    // Cron job de React: roda a cada 60 segundos, estilo “me lembra todo minuto”
    const intervalId = setInterval(checkSystemStatus, 60000);
    
    // Limpa o intervalo quando o componente desmontar (pra não virar vazamento de memória)
    return () => clearInterval(intervalId);
  }, [setIsBlocked]);
  
  // Render nada — essa belezinha só trabalha nos bastidores
  return null;
}
