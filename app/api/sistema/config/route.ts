// app/api/sistema/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado, getCurrentDateInSaoPauloTZ } from '@/lib/utils';

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
    
    const processedConfig = {
      bloqueado: config['sistema_bloqueado'] === 'true',
      modo: config['sistema_modo'] || 'manual',
      dataInicio: config['data_inicio'] || '',
      horaInicio: config['hora_inicio'] || '',
      dataFim: config['data_fim'] || '',
      horaFim: config['hora_fim'] || '',
      timezone: 'America/Sao_Paulo' // Add timezone info
    };
    
    return NextResponse.json({ 
      success: true, 
      config: processedConfig 
    });
  } catch (error) {
    console.error('Erro ao buscar configurações do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações do sistema' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { config, senha } = await request.json();
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    if (config.modo === undefined) {
      return NextResponse.json(
        { error: 'Dados de configuração incompletos' },
        { status: 400 }
      );
    }
    
    const operations = [];
    
    // First, update the mode
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({
          chave: 'sistema_modo',
          valor: config.modo,
          data_modificacao: new Date().toISOString()
        })
    );
    
    // If automatic mode, update schedule details and check if system should be blocked
    if (config.modo === 'automatico') {
      if (config.dataInicio) {
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'data_inicio',
              valor: config.dataInicio,
              data_modificacao: new Date().toISOString()
            })
        );
      }
      
      if (config.horaInicio) {
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'hora_inicio',
              valor: config.horaInicio,
              data_modificacao: new Date().toISOString()
            })
        );
      }
      
      if (config.dataFim) {
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'data_fim',
              valor: config.dataFim,
              data_modificacao: new Date().toISOString()
            })
        );
      }
      
      if (config.horaFim) {
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'hora_fim',
              valor: config.horaFim,
              data_modificacao: new Date().toISOString()
            })
        );
      }
      
      // If all schedule parameters are provided, update system blocked state
      if (config.dataInicio && config.horaInicio && config.dataFim && config.horaFim) {
        // Get current SP time for logging
        const spTime = getCurrentDateInSaoPauloTZ();
        
        console.log("[API Config] Verificando horário programado com timezone SP");
        console.log(`[API Config] Horário atual SP: ${spTime.formatted}`);
        
        // Check if current time is within schedule using São Paulo timezone
        const dentroDoHorario = verificarHorarioProgramado(
          config.dataInicio,
          config.horaInicio,
          config.dataFim,
          config.horaFim
        );
        
        console.log(`[API Config] Dentro do horário: ${dentroDoHorario}`);
        
        // System should be blocked if NOT within the scheduled window
        const deveBloqueado = !dentroDoHorario;
        
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'sistema_bloqueado',
              valor: deveBloqueado.toString(),
              data_modificacao: new Date().toISOString()
            })
        );
      }
    }
    
    // Execute all database operations
    await Promise.all(operations);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações do sistema' },
      { status: 500 }
    );
  }
}