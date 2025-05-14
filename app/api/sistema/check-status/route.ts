// app/api/sistema/check-status/route.ts com logs detalhados

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado } from '@/lib/utils';

// Função auxiliar para logar com timestamp
function logWithTime(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data !== undefined) {
    console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
}

export async function GET() {
  logWithTime("GET /api/sistema/check-status - Iniciando");
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) {
      logWithTime("GET /api/sistema/check-status - Erro ao buscar dados", error);
      throw error;
    }
    
    logWithTime("GET /api/sistema/check-status - Dados recuperados com sucesso", data);
    
    const config: { [key: string]: string } = {};
    data.forEach(item => {
      config[item.chave] = item.valor;
    });
    
    logWithTime("GET /api/sistema/check-status - Configuração mapeada", config);
    
    // If not in automatic mode, no action needed
    if (config['sistema_modo'] !== 'automatico') {
      logWithTime("GET /api/sistema/check-status - Sistema em modo manual, nenhuma ação tomada");
      return NextResponse.json({ 
        success: true, 
        message: 'Sistema em modo manual, nenhuma ação tomada',
        status: 'manual',
        configRaw: config
      });
    }
    
    // Extract and log all schedule parameters
    const dataInicio = config['data_inicio'];
    const horaInicio = config['hora_inicio'];
    const dataFim = config['data_fim'];
    const horaFim = config['hora_fim'];
    
    logWithTime("GET /api/sistema/check-status - Parâmetros de horário", {
      dataInicio,
      horaInicio,
      dataFim,
      horaFim
    });
    
    // Check if all schedule parameters are available
    if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
      logWithTime("GET /api/sistema/check-status - Parâmetros de horário incompletos");
      return NextResponse.json({ 
        success: true, 
        message: 'Parâmetros de horário incompletos, não é possível verificar estado',
        status: 'incomplete',
        configParams: {
          dataInicio: dataInicio || "NÃO DEFINIDO",
          horaInicio: horaInicio || "NÃO DEFINIDO",
          dataFim: dataFim || "NÃO DEFINIDO",
          horaFim: horaFim || "NÃO DEFINIDO"
        }
      });
    }
    
    // Check if current time is within the scheduled window
    const dentroDoHorario = verificarHorarioProgramado(
      dataInicio,
      horaInicio,
      dataFim,
      horaFim
    );
    
    logWithTime(`GET /api/sistema/check-status - Dentro do horário programado? ${dentroDoHorario}`);
    
    // System should be blocked if NOT within the scheduled window
    const deveBloqueado = !dentroDoHorario;
    
    // Get current system status
    const statusAtual = config['sistema_bloqueado'] === 'true';
    
    logWithTime(`GET /api/sistema/check-status - Status atual do bloqueio: ${statusAtual}`);
    logWithTime(`GET /api/sistema/check-status - Estado desejado do bloqueio: ${deveBloqueado}`);
    
    // If current status doesn't match what it should be, update it
    if (statusAtual !== deveBloqueado) {
      logWithTime(`GET /api/sistema/check-status - Status precisa ser atualizado de ${statusAtual} para ${deveBloqueado}`);
      
      const { error: updateError, data: updateData } = await supabase
        .from('configuracao_sistema')
        .update({ 
          valor: deveBloqueado.toString(),
          data_modificacao: new Date().toISOString()
        })
        .eq('chave', 'sistema_bloqueado')
        .select();
      
      if (updateError) {
        logWithTime("GET /api/sistema/check-status - Erro ao atualizar status", updateError);
        throw updateError;
      }
      
      logWithTime("GET /api/sistema/check-status - Status atualizado com sucesso", updateData);
      
      return NextResponse.json({ 
        success: true, 
        message: `Sistema ${deveBloqueado ? 'bloqueado' : 'desbloqueado'} automaticamente`,
        status: deveBloqueado ? 'blocked' : 'unblocked',
        schedule: {
          dataInicio,
          horaInicio,
          dataFim,
          horaFim,
          dentroDoHorario,
          statusAnterior: statusAtual,
          statusNovo: deveBloqueado
        }
      });
    }
    
    // Status is already correct, no action needed
    logWithTime("GET /api/sistema/check-status - Status já está correto, nenhuma ação necessária");
    return NextResponse.json({ 
      success: true, 
      message: 'Status já está correto, nenhuma ação necessária',
      status: deveBloqueado ? 'blocked' : 'unblocked',
      schedule: {
        dataInicio,
        horaInicio,
        dataFim,
        horaFim,
        dentroDoHorario,
        statusAtual
      }
    });
  } catch (error) {
    logWithTime("GET /api/sistema/check-status - Erro não tratado", error);
    console.error('Erro ao verificar e atualizar status do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar e atualizar status do sistema', details: error },
      { status: 500 }
    );
  }
}