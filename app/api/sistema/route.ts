// app/api/sistema/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('valor')
      .eq('chave', 'sistema_bloqueado')
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      bloqueado: data.valor === 'true' 
    });
  } catch (error) {
    console.error('Erro ao buscar estado do sistema:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estado do sistema' },
      { status: 500 }
    );
  }
}