// API endpoint for cleaning up records: app/api/admin/cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { cleanupType, lojaId, senha } = await request.json();
    
    // Validate admin password
    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Default query for deleting all records
    let inventoryQuery = supabase.from('contagens').delete();
    let transitQuery = supabase.from('contagens_transito').delete();
    
    // If loja-specific cleanup is requested, modify the queries
    if (cleanupType === "custom" && lojaId && lojaId !== "all") {
      inventoryQuery = supabase.from('contagens').delete().eq('loja', lojaId);
      transitQuery = supabase.from('contagens_transito').delete().eq('loja', lojaId);
    }
    
    // Get counts before deletion for statistics
    const { count: countInventory, error: countError } = await supabase
      .from('contagens')
      .select('*', { count: 'exact', head: true });
      
    if (countError) throw countError;
    
    const { count: countTransit, error: transitCountError } = await supabase
      .from('contagens_transito')
      .select('*', { count: 'exact', head: true });
    
    if (transitCountError) throw transitCountError;
    
    // Initialize results object
    const results = {
      deletedInventory: 0,
      deletedTransit: 0,
      totalDeleted: 0,
      totalBefore: (countInventory || 0) + (countTransit || 0)
    };
    
    // Perform deletion based on cleanup type
    if (cleanupType === "all" || cleanupType === "custom" || cleanupType === "inventory") {
      // Delete from contagens table
      const { error, count } = await inventoryQuery;
      
      if (error) throw error;
      
      results.deletedInventory = count || 0;
    }
    
    if (cleanupType === "all" || cleanupType === "custom" || cleanupType === "transit") {
      // Delete from contagens_transito table
      const { error: transitError, count: transitCount } = await transitQuery;
      
      if (transitError) throw transitError;
      
      results.deletedTransit = transitCount || 0;
    }
    
    // Calculate total deleted records
    results.totalDeleted = results.deletedInventory + results.deletedTransit;
    
    // Return success response with deletion statistics
    return NextResponse.json({
      success: true,
      message: `${results.totalDeleted} registros removidos com sucesso`,
      results
    });
    
  } catch (error) {
    console.error('Erro ao limpar registros:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar registros do sistema' },
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS if needed
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}