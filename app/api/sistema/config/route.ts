// app/api/sistema/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Obter todas as configurações do sistema
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) throw error;
    
    // Transformar array em objeto
    const config: { [key: string]: string } = {};
    data.forEach(item => {
      config[item.chave] = item.valor;
    });
    
    // Processar as configurações para formato mais amigável
    const processedConfig = {
      bloqueado: config['sistema_bloqueado'] === 'true',
      modo: config['sistema_modo'] || 'manual',
      dataInicio: config['data_inicio'] || '',
      horaInicio: config['hora_inicio'] || '',
      dataFim: config['data_fim'] || '',
      horaFim: config['hora_fim'] || ''
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

// Atualizar configurações do sistema
export async function POST(request: NextRequest) {
  try {
    const { config, senha } = await request.json();
    
    // Verificação básica de segurança
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Validar os dados mínimos
    if (config.modo === undefined) {
      return NextResponse.json(
        { error: 'Dados de configuração incompletos' },
        { status: 400 }
      );
    }
    
    // Criar array de operações para atualizar todas as configurações
    const operations = [];
    
    // Configuração do modo (manual/automático)
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({
          chave: 'sistema_modo',
          valor: config.modo,
          data_modificacao: new Date().toISOString()
        })
    );
    
    // Se for modo automático, também atualize as configurações de data/hora
    if (config.modo === 'automatico') {
      // Data de início
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
      
      // Hora de início
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
      
      // Data de fim
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
      
      // Hora de fim
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
      
      // Verificar se deve bloquear automaticamente baseado na hora atual
      if (config.dataInicio && config.horaInicio && config.dataFim && config.horaFim) {
        const agora = new Date();
        const dataInicio = new Date(`${config.dataInicio}T${config.horaInicio}`);
        const dataFim = new Date(`${config.dataFim}T${config.horaFim}`);
        
        const deveBloqueado = !(agora >= dataInicio && agora <= dataFim);
        
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
    
    // Execute todas as operações
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