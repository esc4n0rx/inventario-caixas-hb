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
    const operations = [];

    // Atualiza 'sistema_bloqueado'
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({ 
          chave: 'sistema_bloqueado',
          valor: bloqueado ? 'true' : 'false',
          data_modificacao: now
        }, { onConflict: 'chave' })
    );

    // Define 'sistema_modo' para 'manual' pois esta é uma alteração manual
    operations.push(
      supabase
        .from('configuracao_sistema')
        .upsert({
          chave: 'sistema_modo',
          valor: 'manual',
          data_modificacao: now
        }, { onConflict: 'chave' })
    );

    const results = await Promise.all(operations.map(op => op.then(res => {
      if (res.error) throw res.error;
      return res;
    })));
    
    console.log("[API /sistema/atualizar] System status and mode updated to manual.", results);

    return NextResponse.json({ success: true, message: 'Estado do sistema atualizado e modo definido para manual.' });
  } catch (error) {
    console.error('Erro ao atualizar estado do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar estado do sistema' },
      { status: 500 }
    );
  }
}