
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ativos } from '@/data/ativos';
import { lojas } from '@/data/lojas';

export async function POST(request: NextRequest) {
  try {
    const { userData, contagem } = await request.json();
    
    if (!userData.email || !userData.loja) {
      return NextResponse.json(
        { error: 'Dados de usuário incompletos' },
        { status: 400 }
      );
    }
    
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
    

    const registros = ativos.map(ativo => ({
      email: userData.email,
      loja: userData.loja,
      loja_nome: loja.nome,
      ativo: ativo.id,
      ativo_nome: ativo.nome,
      quantidade: contagem[ativo.id] || 0
    }));
    

    const { data, error } = await supabase
      .from('contagens')
      .insert(registros)
      .select();
    
    if (error) throw error;
    
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const loja = searchParams.get('loja');
    const email = searchParams.get('email');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    
    let query = supabase
      .from('contagens')
      .select('*')
      .order('data_registro', { ascending: false });
    
    if (loja) {
      query = query.eq('loja', loja);
    }
    
    if (email) {
      query = query.eq('email', email);
    }
    
    if (dataInicio) {
      query = query.gte('data_registro', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('data_registro', dataFim);
    }
    
    const { data, error } = await query.limit(100);
    
    if (error) throw error;
    
    return NextResponse.json({ contagens: data });
  } catch (error) {
    console.error('Erro ao buscar contagens:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contagens' },
      { status: 500 }
    );
  }
}