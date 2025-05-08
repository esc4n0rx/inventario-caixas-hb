
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const loja = searchParams.get('loja');
    
    if (!loja) {
      return NextResponse.json(
        { error: 'ID da loja não fornecido' },
        { status: 400 }
      );
    }
    
    const { data, error, count } = await supabase
      .from('contagens')
      .select('id', { count: 'exact' })
      .eq('loja', loja)
      .limit(1);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      lojaJaContou: count !== null && count > 0 
    });
  } catch (error) {
    console.error('Erro ao verificar status da loja:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar status da loja' },
      { status: 500 }
    );
  }
}