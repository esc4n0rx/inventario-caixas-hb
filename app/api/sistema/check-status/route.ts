// app/api/sistema/check-status/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado } from '@/lib/utils';

/**
 * Esta API verifica o status do sistema com base nas configurações de agendamento
 * e atualiza o status se necessário. Pode ser chamada por um job/cron a cada minuto.
 */
export async function GET() {
  try {
    // Buscar todas as configurações do sistema
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) throw error;
    
    // Organizar as configurações em um objeto
    const config: { [key: string]: string } = {};
    data.forEach(item => {
      config[item.chave] = item.valor;
    });
    
    // Se o modo de operação não for automático, não faz nada
    if (config['sistema_modo'] !== 'automatico') {
      return NextResponse.json({ 
        success: true, 
        message: 'Sistema em modo manual, nenhuma ação tomada',
        status: 'manual'
      });
    }
    
    // Verificar se estamos dentro do horário programado
    const dentroDoHorario = verificarHorarioProgramado(
      config['data_inicio'],
      config['hora_inicio'],
      config['data_fim'],
      config['hora_fim']
    );
    
    // O sistema deve estar bloqueado fora do horário programado
    const deveBloqueado = !dentroDoHorario;
    
    // Verificar status atual
    const statusAtual = config['sistema_bloqueado'] === 'true';
    
    // Se o status atual for diferente do que deveria ser, atualizar
    if (statusAtual !== deveBloqueado) {
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
          dentroDoHorario
        }
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status já está correto, nenhuma ação necessária',
      status: deveBloqueado ? 'blocked' : 'unblocked',
      schedule: {
        dataInicio: config['data_inicio'],
        horaInicio: config['hora_inicio'],
        dataFim: config['data_fim'],
        horaFim: config['hora_fim'],
        dentroDoHorario
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