// app/api/webhook/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Buscar configuração do webhook
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('webhook_config')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error;
    }

    return NextResponse.json({
      success: true,
      config: data || {
        url: '',
        token: '',
        enabled: false,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar configuração do webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração do webhook' },
      { status: 500 }
    );
  }
}

// POST: Atualizar configuração do webhook
export async function POST(request: NextRequest) {
  try {
    const { url, token, enabled, senha } = await request.json();

    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Validar URL se webhook estiver habilitado
    if (enabled && url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'URL inválida' },
          { status: 400 }
        );
      }
    }

    // Upsert (insert ou update)
    const { data, error } = await supabase
      .from('webhook_config')
      .upsert({
        id: 1, // ID fixo para configuração única
        url: url || '',
        token: token || '',
        enabled: enabled || false,
        last_updated: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: enabled ? 'Webhook configurado com sucesso' : 'Webhook desabilitado',
      config: data[0],
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração do webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração do webhook' },
      { status: 500 }
    );
  }
}