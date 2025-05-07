// app/api/sistema/atualizar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { bloqueado, senha } = await request.json();
    
    // Verificação básica de segurança
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const { error } = await supabase
      .from('configuracao_sistema')
      .update({ 
        valor: bloqueado ? 'true' : 'false',
        data_modificacao: new Date().toISOString()
      })
      .eq('chave', 'sistema_bloqueado');
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar estado do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar estado do sistema' },
      { status: 500 }
    );
  }
}