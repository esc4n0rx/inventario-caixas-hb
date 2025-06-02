// app/api/sistema/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; //
import { verificarHorarioProgramado, getCurrentDateInSaoPauloTZ } from '@/lib/utils'; //

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
    
    if (!config || config.modo === undefined) { // Checa se config existe e tem modo
      console.error("[API /sistema/config] Incomplete configuration data received:", config);
      return NextResponse.json(
        { error: 'Dados de configuração incompletos ou inválidos' },
        { status: 400 }
      );
    }
    
    const operations = [];
    const now = new Date().toISOString();
    
    // Atualiza 'sistema_modo'
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({
          chave: 'sistema_modo',
          valor: config.modo,
          data_modificacao: now
        }, { onConflict: 'chave' })
    );
    console.log(`[API /sistema/config] Upserting sistema_modo to: ${config.modo}`);
    
    if (config.modo === 'automatico') {
      console.log("[API /sistema/config] Mode is 'automatico'. Processing schedule fields.");
      // Apenas atualiza campos de data/hora se eles existirem no payload `config`
      // Isso permite que o cliente envie apenas o modo para mudar para automático
      // e, se o agendamento já existir no BD, ele será usado pelo check-status.
      // Se o cliente envia um novo agendamento, ele será salvo.
      const scheduleFields: string[] = ['dataInicio', 'horaInicio', 'dataFim', 'horaFim'];
      let hasAllScheduleFieldsInPayload = true;

      scheduleFields.forEach(field => {
        if (config[field] !== undefined && config[field] !== null) { // Permite string vazia para limpar, mas não undefined
          operations.push(
            supabase
              .from('configuracao_sistema')
              .upsert({
                chave: field.replace(/([A-Z])/g, '_$1').toLowerCase(), // dataInicio -> data_inicio
                valor: config[field],
                data_modificacao: now
              }, { onConflict: 'chave' })
          );
          console.log(`[API /sistema/config] Upserting ${field} to: ${config[field]}`);
        } else {
          // Se algum campo do agendamento estiver faltando no payload e o modo é automático,
          // não podemos recalcular 'sistema_bloqueado' com base neste payload.
          // O 'sistema_bloqueado' será então determinado pelo 'SystemStatusChecker' com base
          // nos valores que *estão* no banco de dados.
          hasAllScheduleFieldsInPayload = false;
        }
      });

      // Atualiza 'sistema_bloqueado' APENAS SE todos os campos de agendamento necessários
      // foram fornecidos neste request específico. Caso contrário, 'sistema_bloqueado'
      // será gerenciado pelo SystemStatusChecker ou por uma alteração manual.
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
        operations.push(
          supabase
            .from('configuracao_sistema')
            .upsert({
              chave: 'sistema_bloqueado',
              valor: deveBloqueado.toString(),
              data_modificacao: now
            }, { onConflict: 'chave' })
        );
        console.log(`[API /sistema/config] Upserting sistema_bloqueado to: ${deveBloqueado}`);
      } else if (!hasAllScheduleFieldsInPayload) {
          console.log("[API /sistema/config] Not all schedule fields provided in payload for automatic mode; sistema_bloqueado not updated by this call.");
      }
    } else { // modo manual
        console.log("[API /sistema/config] Mode is 'manual'. No schedule-based blocking applied by this call.");
        // No modo manual, 'sistema_bloqueado' é controlado por /api/sistema/atualizar.
        // Poderia-se, opcionalmente, limpar os campos de data/hora aqui se desejado.
        // Ex: operations.push(supabase.from('configuracao_sistema').upsert({ chave: 'data_inicio', valor: ''...}))
        // Mas, por ora, vamos manter simples: apenas o modo é alterado para manual.
    }
    
    const settledOperations = await Promise.allSettled(operations.map(op => op.then(res => {
      if (res.error) {
        console.error("[API /sistema/config] Supabase operation error:", res.error);
        // Lança o erro para ser pego pelo catch principal e retornar um 500 se alguma operação falhar.
        throw new Error(`Supabase error: ${res.error.message}`);
      }
      return res;
    })));

    const failedOperations = settledOperations.filter(op => op.status === 'rejected');
    if (failedOperations.length > 0) {
        console.error("[API /sistema/config] One or more Supabase operations failed:", failedOperations);
        throw new Error("Uma ou mais operações no banco de dados falharam ao salvar a configuração.");
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