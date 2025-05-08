
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado } from '@/lib/utils';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) throw error;
    
    const config: { [key: string]: string } = {};
    data.forEach(item => {
      config[item.chave] = item.valor;
    });
    
    if (config['sistema_modo'] !== 'automatico') {
      return NextResponse.json({ 
        success: true, 
        message: 'Sistema em modo manual, nenhuma ação tomada',
        status: 'manual'
      });
    }
    
    const dentroDoHorario = verificarHorarioProgramado(
      config['data_inicio'],
      config['hora_inicio'],
      config['data_fim'],
      config['hora_fim']
    );
    
    const deveBloqueado = !dentroDoHorario;
    

    const statusAtual = config['sistema_bloqueado'] === 'true';
    
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