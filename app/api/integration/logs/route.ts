import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verificar senha de admin para restringir este endpoint
    const searchParams = request.nextUrl.searchParams;
    const senha = searchParams.get('senha');
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const since = searchParams.get('since'); // ISO date string
    
    let query = supabase
      .from('integracao_logs')
      .select('*')
      .order('date', { ascending: false });
    
    if (since) {
      query = query.gte('date', since);
    }
    
    const { data, error } = await query.limit(limit);
    
    if (error) throw error;
    
    // Estatísticas
    const now = new Date();
    
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(now.getHours() - 1);
    
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);
    
    // Buscar contagem para última hora
    const { count: countLastHour, error: errorLastHour } = await supabase
      .from('integracao_logs')
      .select('*', { count: 'exact', head: true })
      .gte('date', oneHourAgo.toISOString());
    
    if (errorLastHour) throw errorLastHour;
    
    // Buscar contagem para último dia
    const { count: countLastDay, error: errorLastDay } = await supabase
      .from('integracao_logs')
      .select('*', { count: 'exact', head: true })
      .gte('date', oneDayAgo.toISOString());
    
    if (errorLastDay) throw errorLastDay;
    
    return NextResponse.json({
      success: true,
      logs: data,
      stats: {
        lastHour: countLastHour || 0,
        lastDay: countLastDay || 0
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de integração:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar logs de integração' },
      { status: 500 }
    );
  }
}