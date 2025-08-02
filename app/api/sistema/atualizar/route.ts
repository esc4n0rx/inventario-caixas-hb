// app/api/sistema/atualizar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { bloqueado, senha } = await request.json();

    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Função auxiliar para upsert seguro
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
        console.error(`[API /sistema/atualizar] Erro no update para ${chave}:`, updateError);
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
          console.error(`[API /sistema/atualizar] Erro no insert para ${chave}:`, insertError);
          throw insertError;
        }

        return insertData;
      }

      return updateData;
    };

    // Atualizar 'sistema_bloqueado'
    await safeUpsert('sistema_bloqueado', bloqueado ? 'true' : 'false');
    console.log(`[API /sistema/atualizar] sistema_bloqueado atualizado para: ${bloqueado ? 'true' : 'false'}`);

    // Definir 'sistema_modo' para 'manual' pois esta é uma alteração manual
    await safeUpsert('sistema_modo', 'manual');
    console.log("[API /sistema/atualizar] sistema_modo atualizado para: manual");

    console.log("[API /sistema/atualizar] System status and mode updated to manual successfully.");

    return NextResponse.json({ 
      success: true, 
      message: 'Estado do sistema atualizado e modo definido para manual.' 
    });
  } catch (error) {
    console.error('Erro ao atualizar estado do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar estado do sistema' },
      { status: 500 }
    );
  }
}