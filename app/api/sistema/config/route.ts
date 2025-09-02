// app/api/sistema/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verificarHorarioProgramado, getCurrentDateInSaoPauloTZ } from '@/lib/utils';

export async function GET(request: NextRequest) {
  console.log("[API /sistema/config] Received GET request");
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) {
      console.error("[API /sistema/config] Error fetching config from Supabase:", error);
      throw error;
    }
    console.log("[API /sistema/config] Fetched config from Supabase:", data);
    
    const config: { [key: string]: string } = {};
    if (data) {
      data.forEach(item => {
        config[item.chave] = item.valor;
      });
    }
    
    const processedConfig = {
      bloqueado: config['sistema_bloqueado'] === 'true',
      modo: (config['sistema_modo'] || 'manual') as 'automatico' | 'manual',
      dataInicio: config['data_inicio'] || '',
      horaInicio: config['hora_inicio'] || '',
      dataFim: config['data_fim'] || '',
      horaFim: config['hora_fim'] || '',
      timezone: 'America/Sao_Paulo' 
    };
    console.log("[API /sistema/config] Processed config for response:", processedConfig);
    
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
  console.log("[API /sistema/config] Received POST request");
  try {
    const { config, senha } = await request.json();
    console.log("[API /sistema/config] Request body:", { config, senha_present: !!senha });
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      console.warn("[API /sistema/config] Unauthorized attempt: Incorrect admin password.");
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    console.log("[API /sistema/config] Admin password verified.");
    
    if (!config || config.modo === undefined) {
      console.error("[API /sistema/config] Incomplete configuration data received:", config);
      return NextResponse.json(
        { error: 'Dados de configuração incompletos ou inválidos' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();

    // Função auxiliar para upsert seguro (mesmo padrão usado em /api/sistema/atualizar)
    const safeUpsert = async (chave: string, valor: string) => {
      // Primeiro, tentar fazer update
      const { data: updateData, error: updateError } = await supabase
        .from('configuracao_sistema')
        .update({ 
          valor,
          data_modificacao: now
        })
        .eq('chave', chave)
        .select();

      if (updateError) {
        console.error(`[API /sistema/config] Erro no update para ${chave}:`, updateError);
        throw updateError;
      }

      // Se não atualizou nenhum registro (não existe), fazer insert
      if (!updateData || updateData.length === 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('configuracao_sistema')
          .insert({ 
            chave,
            valor,
            data_modificacao: now
          })
          .select();

        if (insertError) {
          console.error(`[API /sistema/config] Erro no insert para ${chave}:`, insertError);
          throw insertError;
        }

        return insertData;
      }

      return updateData;
    };
    
    const operations = [];
    
    // Atualiza 'sistema_modo'
    operations.push(safeUpsert('sistema_modo', config.modo));
    console.log(`[API /sistema/config] Upserting sistema_modo to: ${config.modo}`);
    
    if (config.modo === 'automatico') {
      console.log("[API /sistema/config] Mode is 'automatico'. Processing schedule fields.");
      
      const scheduleFields: string[] = ['dataInicio', 'horaInicio', 'dataFim', 'horaFim'];
      let hasAllScheduleFieldsInPayload = true;

      scheduleFields.forEach(field => {
        if (config[field] !== undefined && config[field] !== null) {
          const dbKey = field.replace(/([A-Z])/g, '_$1').toLowerCase(); // dataInicio -> data_inicio
          operations.push(safeUpsert(dbKey, config[field]));
          console.log(`[API /sistema/config] Upserting ${field} to: ${config[field]}`);
        } else {
          hasAllScheduleFieldsInPayload = false;
        }
      });

      // Atualiza 'sistema_bloqueado' APENAS SE todos os campos de agendamento necessários
      // foram fornecidos neste request específico
      if (hasAllScheduleFieldsInPayload && config.dataInicio && config.horaInicio && config.dataFim && config.horaFim) {
        const spTime = getCurrentDateInSaoPauloTZ();
        console.log(`[API /sistema/config] All schedule fields present in payload. Verificando horário programado (SP Time: ${spTime.formatted})`);
        
        const dentroDoHorario = verificarHorarioProgramado(
          config.dataInicio,
          config.horaInicio,
          config.dataFim,
          config.horaFim
        );
        console.log(`[API /sistema/config] Dentro do horário (baseado no payload): ${dentroDoHorario}`);
        
        const deveBloqueado = !dentroDoHorario;
        operations.push(safeUpsert('sistema_bloqueado', deveBloqueado.toString()));
        console.log(`[API /sistema/config] Upserting sistema_bloqueado to: ${deveBloqueado}`);
      } else if (!hasAllScheduleFieldsInPayload) {
          console.log("[API /sistema/config] Not all schedule fields provided in payload for automatic mode; sistema_bloqueado not updated by this call.");
      }
    } else {
        console.log("[API /sistema/config] Mode is 'manual'. No schedule-based blocking applied by this call.");
    }
    
    // Executar todas as operações sequencialmente para evitar conflitos
    const results = [];
    for (const operation of operations) {
      try {
        const result = await operation;
        results.push(result);
      } catch (error: any) {
        console.error("[API /sistema/config] Supabase operation error:", error);
        throw new Error(`Erro ao salvar configuração: ${error.message}`);
      }
    }
    
    console.log("[API /sistema/config] All Supabase operations successful.");
    return NextResponse.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso' 
    });
  } catch (error: any) {
    console.error('[API /sistema/config] Erro ao atualizar configurações do sistema:', error.message, error.stack);
    return NextResponse.json(
      { error: `Erro ao atualizar configurações do sistema: ${error.message}` },
      { status: 500 }
    );
  }
}