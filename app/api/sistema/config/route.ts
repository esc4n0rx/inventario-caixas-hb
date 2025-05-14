// app/api/sistema/config/route.ts com logs detalhados

import { NextRequest, NextResponse } from 'next/server';
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
  logWithTime("GET /api/sistema/config - Iniciando");
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) {
      logWithTime("GET /api/sistema/config - Erro ao buscar dados", error);
      throw error;
    }
    
    logWithTime("GET /api/sistema/config - Dados recuperados com sucesso", data);
    
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
      horaFim: config['hora_fim'] || ''
    };
    
    logWithTime("GET /api/sistema/config - Configuração processada", processedConfig);
    
    return NextResponse.json({ 
      success: true, 
      config: processedConfig 
    });
  } catch (error) {
    logWithTime("GET /api/sistema/config - Erro não tratado", error);
    console.error('Erro ao buscar configurações do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações do sistema' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  logWithTime("POST /api/sistema/config - Iniciando");
  try {
    const requestBody = await request.json();
    logWithTime("POST /api/sistema/config - Corpo da requisição", requestBody);
    
    const { config, senha } = requestBody;
    
    // Validação da senha
    logWithTime(`POST /api/sistema/config - Validando senha (${senha ? 'fornecida' : 'não fornecida'})`);
    if (senha !== process.env.ADMIN_PASSWORD) {
      logWithTime("POST /api/sistema/config - Senha inválida");
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Validação do config
    if (!config || config.modo === undefined) {
      logWithTime("POST /api/sistema/config - Dados de configuração incompletos", config);
      return NextResponse.json(
        { error: 'Dados de configuração incompletos' },
        { status: 400 }
      );
    }
    
    // Create an array of operations to perform
    const operations = [];
    logWithTime(`POST /api/sistema/config - Modo configurado para: ${config.modo}`);
    
    // Update the mode first
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({
          chave: 'sistema_modo',
          valor: config.modo,
          data_modificacao: new Date().toISOString()
        })
    );
    
    // If automatic mode, update schedule details
    if (config.modo === 'automatico') {
      logWithTime("POST /api/sistema/config - Modo automático, atualizando configurações de horário");
      
      if (config.dataInicio) {
        logWithTime(`POST /api/sistema/config - Atualizando data de início: ${config.dataInicio}`);
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'data_inicio',
              valor: config.dataInicio,
              data_modificacao: new Date().toISOString()
            })
        );
      } else {
        logWithTime("POST /api/sistema/config - ATENÇÃO: Data de início não fornecida");
      }
      
      if (config.horaInicio) {
        logWithTime(`POST /api/sistema/config - Atualizando hora de início: ${config.horaInicio}`);
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'hora_inicio',
              valor: config.horaInicio,
              data_modificacao: new Date().toISOString()
            })
        );
      } else {
        logWithTime("POST /api/sistema/config - ATENÇÃO: Hora de início não fornecida");
      }
      
      if (config.dataFim) {
        logWithTime(`POST /api/sistema/config - Atualizando data de fim: ${config.dataFim}`);
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'data_fim',
              valor: config.dataFim,
              data_modificacao: new Date().toISOString()
            })
        );
      } else {
        logWithTime("POST /api/sistema/config - ATENÇÃO: Data de fim não fornecida");
      }
      
      if (config.horaFim) {
        logWithTime(`POST /api/sistema/config - Atualizando hora de fim: ${config.horaFim}`);
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'hora_fim',
              valor: config.horaFim,
              data_modificacao: new Date().toISOString()
            })
        );
      } else {
        logWithTime("POST /api/sistema/config - ATENÇÃO: Hora de fim não fornecida");
      }
      
      // If all schedule parameters are provided, update system blocked state
      if (config.dataInicio && config.horaInicio && config.dataFim && config.horaFim) {
        logWithTime("POST /api/sistema/config - Todos os parâmetros de horário fornecidos, verificando estado atual");
        
        // Check if current time is within schedule
        const dentroDoHorario = verificarHorarioProgramado(
          config.dataInicio,
          config.horaInicio,
          config.dataFim,
          config.horaFim
        );
        
        // System should be blocked if NOT within the scheduled window
        const deveBloqueado = !dentroDoHorario;
        
        logWithTime(`POST /api/sistema/config - Dentro do horário programado? ${dentroDoHorario}`);
        logWithTime(`POST /api/sistema/config - Sistema deve estar bloqueado? ${deveBloqueado}`);
        
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'sistema_bloqueado',
              valor: deveBloqueado.toString(),
              data_modificacao: new Date().toISOString()
            })
        );
      } else {
        logWithTime("POST /api/sistema/config - ALERTA: Alguns parâmetros de horário estão faltando, não atualizando estado de bloqueio");
      }
    } else {
      logWithTime("POST /api/sistema/config - Modo manual, não atualizando configurações de horário");
    }
    
    // Execute all operations
    logWithTime(`POST /api/sistema/config - Executando ${operations.length} operações no banco de dados`);
    const results = await Promise.all(operations);
    
    // Log individual operation results
    results.forEach((result, index) => {
      if (result.error) {
        logWithTime(`POST /api/sistema/config - Erro na operação ${index}`, result.error);
      } else {
        logWithTime(`POST /api/sistema/config - Operação ${index} executada com sucesso`, result.data);
      }
    });
    
    // Check for errors in any operation
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      logWithTime(`POST /api/sistema/config - ${errors.length} operações resultaram em erro`, errors);
      throw errors[0].error;
    }
    
    // Verificar se as configurações foram realmente salvas
    logWithTime("POST /api/sistema/config - Verificando se as configurações foram salvas");
    const { data: verifyData, error: verifyError } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (verifyError) {
      logWithTime("POST /api/sistema/config - Erro ao verificar configurações", verifyError);
    } else {
      logWithTime("POST /api/sistema/config - Estado atual das configurações", verifyData);
    }
    
    logWithTime("POST /api/sistema/config - Configurações atualizadas com sucesso");
    return NextResponse.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso',
      updated: config,
      operationResults: results.map(r => ({ error: r.error ? r.error.message : null }))
    });
  } catch (error) {
    logWithTime("POST /api/sistema/config - Erro não tratado", error);
    console.error('Erro ao atualizar configurações do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações do sistema', details: error },
      { status: 500 }
    );
  }
}