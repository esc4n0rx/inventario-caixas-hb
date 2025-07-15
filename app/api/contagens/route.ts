// app/api/contagem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ativos } from '@/data/ativos';
import { lojas } from '@/data/lojas';
import { sendIndividualWebhooks } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const { userData, contagem } = await request.json();
    
    if (!userData.email || !userData.loja) {
      return NextResponse.json(
        { error: 'Dados de usuário incompletos' },
        { status: 400 }
      );
    }

    // Verificar se o sistema está bloqueado
    const { data: configData, error: configError } = await supabase
      .from('configuracao_sistema')
      .select('valor')
      .eq('chave', 'sistema_bloqueado')
      .single();
    
    if (configError) throw configError;
    
    if (configData.valor === 'true') {
      return NextResponse.json(
        { error: 'Sistema bloqueado para contagens' },
        { status: 403 }
      );
    }

    // Verificar se a loja já fez contagem
    const { data: contagemData, count } = await supabase
      .from('contagens')
      .select('id', { count: 'exact' })
      .eq('loja', userData.loja)
      .limit(1);
    
    if (count !== null && count > 0) {
      return NextResponse.json(
        { error: 'Loja já realizou contagem' },
        { status: 409 }
      );
    }

    const loja = lojas.find(l => l.id === userData.loja);
    if (!loja) {
      return NextResponse.json(
        { error: 'Loja não encontrada' },
        { status: 400 }
      );
    }

    // Preparar registros para inserção
    const registros = ativos.map(ativo => ({
      email: userData.email,
      loja: userData.loja,
      loja_nome: loja.nome,
      ativo: ativo.id,
      ativo_nome: ativo.nome,
      quantidade: contagem[ativo.id] || 0
    }));
    
    // Inserir contagens no banco
    const { data, error } = await supabase
      .from('contagens')
      .insert(registros)
      .select();
    
    if (error) throw error;

    // Enviar webhooks individuais para cada ativo
    const contagensParaWebhook = registros.map(registro => ({
      ativo_nome: registro.ativo_nome,
      quantidade: registro.quantidade,
      obs: undefined, // Pode ser expandido futuramente
    }));

    // Enviar webhooks de forma assíncrona (não bloquear a resposta)
    sendIndividualWebhooks(
      userData.email,
      loja.nome,
      'loja',
      contagensParaWebhook
    ).catch(error => {
      console.error('Erro ao enviar webhooks:', error);
      // Não falhar a operação se webhook falhar
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Contagem registrada com sucesso',
      registros: data
    });
  } catch (error) {
    console.error('Erro ao registrar contagem:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar contagem' },
      { status: 500 }
    );
  }
}