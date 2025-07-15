// app/api/transito/route.ts
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
    
    // Inserir contagens de trânsito no banco
    const { data, error } = await supabase
      .from('contagens_transito')
      .insert(registros)
      .select();
    
    if (error) throw error;

    // Enviar webhooks individuais para cada ativo (tipo trânsito)
    const contagensParaWebhook = registros.map(registro => ({
      ativo_nome: registro.ativo_nome,
      quantidade: registro.quantidade,
      obs: undefined, // Pode ser expandido futuramente
    }));

    // Enviar webhooks de forma assíncrona (não bloquear a resposta)
    sendIndividualWebhooks(
      userData.email,
      loja.nome,
      'transito',
      contagensParaWebhook
    ).catch(error => {
      console.error('Erro ao enviar webhooks de trânsito:', error);
      // Não falhar a operação se webhook falhar
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Contagem de trânsito registrada com sucesso',
      registros: data
    });
  } catch (error) {
    console.error('Erro ao registrar contagem de trânsito:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar contagem de trânsito' },
      { status: 500 }
    );
  }
}