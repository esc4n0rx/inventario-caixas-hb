import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado, getCurrentDateInSaoPauloTZ } from '@/lib/utils';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"


export async function GET() {
  try {
    console.log("[API] Verificando status do sistema no timezone de São Paulo");
    
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) throw error;
    
    const config: { [key: string]: string } = {};
    data.forEach(item => {
      config[item.chave] = item.valor;
    });
    
    // If not in automatic mode, no action needed
    if (config['sistema_modo'] !== 'automatico') {
      return NextResponse.json({ 
        success: true, 
        message: 'Sistema em modo manual, nenhuma ação tomada',
        status: 'manual'
      });
    }
    
    // Get current time in São Paulo
    const spTime = getCurrentDateInSaoPauloTZ();
    
    // Log timezone information for debugging
    console.log(`[API] Horário atual UTC: ${new Date().toISOString()}`);
    console.log(`[API] Horário em São Paulo: ${spTime.formatted}`);
    
    // Check if current time is within the scheduled window using São Paulo timezone
    const dentroDoHorario = verificarHorarioProgramado(
      config['data_inicio'],
      config['hora_inicio'],
      config['data_fim'],
      config['hora_fim']
    );
    
    console.log(`[API] Dentro do horário programado: ${dentroDoHorario}`);
    
    // System should be blocked if NOT within the scheduled window
    const deveBloqueado = !dentroDoHorario;
    
    // Get current system status
    const statusAtual = config['sistema_bloqueado'] === 'true';
    
    console.log(`[API] Status atual: ${statusAtual ? 'Bloqueado' : 'Desbloqueado'}`);
    console.log(`[API] Status desejado: ${deveBloqueado ? 'Bloqueado' : 'Desbloqueado'}`);
    
    // If current status doesn't match what it should be, update it
    if (statusAtual !== deveBloqueado) {
      console.log(`[API] Atualizando status de ${statusAtual ? 'bloqueado' : 'desbloqueado'} para ${deveBloqueado ? 'bloqueado' : 'desbloqueado'}`);
      
      const { error: updateError } = await supabase
        .from('configuracao_sistema')
        .update({ 
          valor: deveBloqueado.toString(),
          data_modificacao: new Date().toISOString()
        })
        .eq('chave', 'sistema_bloqueado');
      
      if (updateError) throw updateError;
      
      return NextResponse.json({ 
        success: true, 
        message: `Sistema ${deveBloqueado ? 'bloqueado' : 'desbloqueado'} automaticamente`,
        status: deveBloqueado ? 'blocked' : 'unblocked',
        schedule: {
          dataInicio: config['data_inicio'],
          horaInicio: config['hora_inicio'],
          dataFim: config['data_fim'],
          horaFim: config['hora_fim'],
          dentroDoHorario,
          timezone: 'America/Sao_Paulo',
          currentTimeSP: spTime.formatted
        }
      });
    }
    
    // Status is already correct, no action needed
    return NextResponse.json({ 
      success: true, 
      message: 'Status já está correto, nenhuma ação necessária',
      status: deveBloqueado ? 'blocked' : 'unblocked',
      schedule: {
        dataInicio: config['data_inicio'],
        horaInicio: config['hora_inicio'],
        dataFim: config['data_fim'],
        horaFim: config['hora_fim'],
        dentroDoHorario,
        timezone: 'America/Sao_Paulo',
        currentTimeSP: spTime.formatted
      }
    });
  } catch (error) {
    console.error('Erro ao verificar e atualizar status do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar e atualizar status do sistema' },
      { status: 500 }
    );
  }
}