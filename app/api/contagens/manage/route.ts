
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const { id, quantidade, senha } = await request.json();
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    if (!id || quantidade === undefined) {
      return NextResponse.json(
        { error: 'ID e quantidade são obrigatórios' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('contagens')
      .update({ 
        quantidade, 
        data_modificacao: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contagem atualizada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar contagem:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar contagem' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const senha = searchParams.get('senha');
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('contagens')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contagem removida com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao remover contagem:', error);
    return NextResponse.json(
      { error: 'Erro ao remover contagem' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: lojasComContagem, error: lojaError } = await supabase
      .from('contagens')
      .select('distinct(loja)')
      .order('loja', { ascending: true });
    
    if (lojaError) throw lojaError;
    
    const { data: contagensData, error: contagemError } = await supabase
      .from('contagens')
      .select('*');
    
    if (contagemError) throw contagemError;
    
    const agora = new Date();
    const dataLimite = new Date(agora);
    dataLimite.setHours(agora.getHours() - 24);
    
    const { data: contagens24h, error: contagens24hError } = await supabase
      .from('contagens')
      .select('*')
      .gt('data_registro', dataLimite.toISOString());
    
    if (contagens24hError) throw contagens24hError;
    
    const contagensPorHora: { [key: number]: number } = {};
    contagens24h?.forEach(c => {
      const data = new Date(c.data_registro);
      const hora = data.getHours();
      if (!contagensPorHora[hora]) {
        contagensPorHora[hora] = 0;
      }
      contagensPorHora[hora]++;
    });
    
    const horas = Object.keys(contagensPorHora).length;
    const totalContagens24h = contagens24h?.length || 0;
    const mediaPorHora = horas ? (totalContagens24h / horas) : 0;
    
    const ativosPorContagem: { [key: string]: number } = {};
    contagensData?.forEach(c => {
      if (!ativosPorContagem[c.ativo]) {
        ativosPorContagem[c.ativo] = 0;
      }
      ativosPorContagem[c.ativo] += c.quantidade;
    });
    
    const contagensPorLoja: { [key: string]: number } = {};
    contagensData?.forEach(c => {
      if (!contagensPorLoja[c.loja]) {
        contagensPorLoja[c.loja] = 0;
      }
      contagensPorLoja[c.loja] += c.quantidade;
    });
    
    return NextResponse.json({ 
      success: true,
      estatisticas: {
        totalLojas: 96,
        lojasComContagem: lojasComContagem?.length || 0,
        totalRegistros: contagensData?.length || 0,
        totalItens: Object.values(ativosPorContagem).reduce((a: number, b: number) => a + b, 0),
        mediaPorHora,
        ativosPorContagem,
        contagensPorLoja
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}