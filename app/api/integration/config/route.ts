import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Obter configuração atual da integração
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
    
    const { data, error } = await supabase
      .from('integracao_config')
      .select('*')
      .single();
    
    if (error) {
      // Se o registro não existe, retornar um vazio
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          enabled: false,
          token: '',
          expiration: '',
        });
      }
      throw error;
    }
    
    // Ocultar token completo na resposta por segurança
    const maskedToken = data.token 
      ? `${data.token.substring(0, 4)}...${data.token.substring(data.token.length - 4)}` 
      : '';
    
    return NextResponse.json({
      id: data.id,
      enabled: data.enabled,
      token: maskedToken,
      expiration: data.expiration,
      last_used: data.last_used,
      connections: data.connections,
      last_updated: data.last_updated
    });
  } catch (error) {
    console.error('Erro ao buscar configuração de integração:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração de integração' },
      { status: 500 }
    );
  }
}

// POST: Atualizar configuração de integração
export async function POST(request: NextRequest) {
  try {
    const { enabled, token, expiration, senha } = await request.json();
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar se o sistema está bloqueado
    if (enabled) {
      const { data: configData, error: configError } = await supabase
        .from('configuracao_sistema')
        .select('valor')
        .eq('chave', 'sistema_bloqueado')
        .single();
      
      if (configError) throw configError;
      
      if (configData.valor === 'true') {
        return NextResponse.json(
          { error: 'Não é possível ativar a integração enquanto o sistema estiver bloqueado' },
          { status: 400 }
        );
      }
    }
    
    // Preparar dados para atualização/inserção
    const updateData = {
      enabled,
      last_updated: new Date().toISOString()
    };
    
    // Adicionar token e expiration se fornecidos
    if (token) {
      Object.assign(updateData, { token });
    }
    
    if (expiration) {
      Object.assign(updateData, { expiration });
    }
    
    // Upsert (insert ou update)
    const { data, error } = await supabase
      .from('integracao_config')
      .upsert({
        id: 1, // ID fixo para configuração única
        ...updateData
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: enabled ? 'Integração ativada com sucesso' : 'Integração desativada com sucesso',
      config: {
        id: data[0].id,
        enabled: data[0].enabled,
        expiration: data[0].expiration,
        last_updated: data[0].last_updated
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração de integração:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração de integração' },
      { status: 500 }
    );
  }
}

// Gerar novo token
export async function PUT(request: NextRequest) {
  try {
    const { senha } = await request.json();
    
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Gerar token aleatório
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < 32; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Calcular expiração (24 horas no futuro)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);
    
    // Atualizar no banco de dados
    const { data, error } = await supabase
      .from('integracao_config')
      .upsert({
        id: 1, // ID fixo para configuração única
        token,
        expiration: expirationDate.toISOString(),
        last_updated: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Token gerado com sucesso',
      token,
      expiration: expirationDate.toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar novo token:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar novo token' },
      { status: 500 }
    );
  }
}