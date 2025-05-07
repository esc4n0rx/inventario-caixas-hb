import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { senha } = await request.json();
    
    // Verificar a senha com a variável de ambiente
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('Variável de ambiente ADMIN_PASSWORD não configurada');
      return NextResponse.json(
        { autorizado: false, error: 'Erro de configuração' },
        { status: 500 }
      );
    }
    
    const autorizado = senha === adminPassword;
    
    return NextResponse.json({ autorizado });
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return NextResponse.json(
      { autorizado: false, error: 'Erro ao verificar senha' },
      { status: 500 }
    );
  }
}