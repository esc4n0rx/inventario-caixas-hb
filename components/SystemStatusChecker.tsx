"use client";

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function SystemStatusChecker() {
  const { setIsBlocked } = useStore();
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/sistema/check-status?t=${timestamp}`);
        const data = await response.json();
        
        if (data.success) {
          // Process status result
          if (data.status === 'blocked') {
            setIsBlocked(true);
            console.log('Sistema bloqueado automaticamente com base no horário de São Paulo');
          } else if (data.status === 'unblocked') {
            setIsBlocked(false);
            console.log('Sistema desbloqueado automaticamente com base no horário de São Paulo');
          }
          
          // Update timestamp of last check
          setLastCheck(new Date());
        }
      } catch (error) {
        console.error('Erro ao verificar status do sistema:', error);
      }
    };
    
    // Check immediately on component mount
    checkSystemStatus();
    
    // Set up interval to check every minute
    const intervalId = setInterval(checkSystemStatus, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [setIsBlocked]);
  
  // This is a purely background component
  return null;
}