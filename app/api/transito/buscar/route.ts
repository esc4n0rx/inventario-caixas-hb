
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
    
    const { data, error } = await supabase
      .from('contagens_transito')
      .select('*')
      .eq('loja', loja)
      .order('data_registro', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true,
      transito: data || []
    });
  } catch (error) {
    console.error('Erro ao buscar contagens de trânsito:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contagens de trânsito' },
      { status: 500 }
    );
  }
}