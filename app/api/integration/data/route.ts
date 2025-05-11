// app/api/integration/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Set CORS headers to allow cross-origin requests
    const response = NextResponse.json(
      { message: 'Initializing' },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app', // For production, specify the exact origin instead of *
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );

    // Obter o token do cabeçalho Authorization
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se a integração está ativada e se o token é válido
    const { data: configData, error: configError } = await supabase
      .from('integracao_config')
      .select('*')
      .single();
    
    if (configError) {
      return NextResponse.json(
        { error: 'Configuração de integração não encontrada' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    if (!configData.enabled) {
      return NextResponse.json(
        { error: 'Integração desativada' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    if (configData.token !== token) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    // Verificar se o token expirou
    const expirationDate = new Date(configData.expiration);
    const now = new Date();
    
    if (now > expirationDate) {
      return NextResponse.json(
        { error: 'Token expirado' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
    
    // Registrar uso da API
    await supabase
      .from('integracao_logs')
      .insert({
        token: token,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        date: new Date().toISOString()
      });
    
    // Atualizar last_used na configuração
    await supabase
      .from('integracao_config')
      .update({ 
        last_used: new Date().toISOString(),
        connections: (configData.connections || 0) + 1
      })
      .eq('id', configData.id);
    
    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const loja = searchParams.get('loja');
    const ativo = searchParams.get('ativo');
    const desde = searchParams.get('desde'); // Timestamp ISO para filtrar registros mais recentes
    
    // Construir a consulta base
    let query = supabase
      .from('contagens')
      .select('*')
      .order('data_registro', { ascending: false });
    
    // Aplicar filtros se fornecidos
    if (loja) {
      query = query.eq('loja', loja);
    }
    
    if (ativo) {
      query = query.eq('ativo', ativo);
    }
    
    if (desde) {
      query = query.gt('data_registro', desde);
    }
    
    // Executar a consulta
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Formatar resposta com CORS headers
    return NextResponse.json(
      {
        success: true,
        count: data.length,
        timestamp: new Date().toISOString(),
        data: data
      },
      { 
        headers: {
          'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error) {
    console.error('Erro ao fornecer dados de integração:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

// Handle OPTIONS requests (for CORS preflight)
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 204, // No content
      headers: {
        'Access-Control-Allow-Origin': 'https://hbinventory.vercel.app',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    }
  );
}