// app/api/admin/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdmin: SupabaseClient | null = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceKey);
    console.log("[API Cleanup] Supabase admin client initialized successfully.");
  } else {
    if (!supabaseUrl) console.error("[API Cleanup] NEXT_PUBLIC_SUPABASE_URL is missing.");
    if (!serviceKey) console.error("[API Cleanup] SUPABASE_SERVICE_ROLE_KEY is missing.");
    console.error("[API Cleanup] Supabase admin client NOT initialized due to missing URL or Service Key.");
  }
} catch (e: any) {
    console.error("[API Cleanup] Critical error initializing Supabase admin client at module level:", e.message, e.stack);
}

export async function POST(request: NextRequest) {
  console.log("[API Cleanup] Received POST request.");
  try {
    const { cleanupType, lojaId, senha } = await request.json();
    console.log(`[API Cleanup] Request body: cleanupType=${cleanupType}, lojaId=${lojaId}, senha_present=${!!senha}`);

    if (!process.env.ADMIN_PASSWORD) {
      console.error("[API Cleanup] ADMIN_PASSWORD environment variable is not set on the server.");
      return NextResponse.json({ error: 'Erro de configuração crítica do servidor: Senha de administrador mestre não configurada.' }, { status: 500 });
    }
    if (senha !== process.env.ADMIN_PASSWORD) {
      console.warn("[API Cleanup] Unauthorized attempt: Incorrect admin password provided.");
      return NextResponse.json({ error: 'Não autorizado: Senha incorreta.' }, { status: 401 });
    }
    console.log("[API Cleanup] Admin password verified successfully.");

    if (!supabaseAdmin) {
      console.error("[API Cleanup] Supabase admin client is not initialized. This is a critical server configuration issue. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return NextResponse.json({ error: 'Erro crítico de configuração do servidor: Cliente Supabase Admin não operacional.' }, { status: 500 });
    }
    console.log("[API Cleanup] Supabase admin client seems initialized.");

    let countInventoryBefore = 0;
    let countTransitBefore = 0;
    const improbableIntegerValue = -999999; // Usar um inteiro improvável

    console.log("[API Cleanup] Fetching counts before deletion...");
    if (cleanupType === "custom" && lojaId && lojaId !== "all") {
        const { count: invCountFiltered, error: invCountFilteredError } = await supabaseAdmin
            .from('contagens')
            .select('id', { count: 'exact', head: true })
            .eq('loja', lojaId);
        if (invCountFilteredError) {
          console.error("[API Cleanup] Error fetching filtered inventory count:", invCountFilteredError);
          throw invCountFilteredError;
        }
        countInventoryBefore = invCountFiltered || 0;
        console.log(`[API Cleanup] Inventory count for loja ${lojaId} before: ${countInventoryBefore}`);

        const { count: transitCountFiltered, error: transitCountFilteredError } = await supabaseAdmin
            .from('contagens_transito')
            .select('id', { count: 'exact', head: true })
            .eq('loja', lojaId);
        if (transitCountFilteredError) {
          console.error("[API Cleanup] Error fetching filtered transit count:", transitCountFilteredError);
          throw transitCountFilteredError;
        }
        countTransitBefore = transitCountFiltered || 0;
        console.log(`[API Cleanup] Transit count for loja ${lojaId} before: ${countTransitBefore}`);

    } else {
        if (cleanupType === "all" || cleanupType === "inventory" || (cleanupType === "custom" && lojaId === "all")) {
            const { count: invCountGlobal, error: invCountGlobalError } = await supabaseAdmin
                .from('contagens')
                .select('id', { count: 'exact', head: true });
            if (invCountGlobalError) {
              console.error("[API Cleanup] Error fetching global inventory count:", invCountGlobalError);
              throw invCountGlobalError;
            }
            countInventoryBefore = invCountGlobal || 0;
            console.log(`[API Cleanup] Global inventory count before: ${countInventoryBefore}`);
        }
        if (cleanupType === "all" || cleanupType === "transit" || (cleanupType === "custom" && lojaId === "all")) {
            const { count: transitCountGlobal, error: transitCountGlobalError } = await supabaseAdmin
                .from('contagens_transito')
                .select('id', { count: 'exact', head: true });
            if (transitCountGlobalError) {
              console.error("[API Cleanup] Error fetching global transit count:", transitCountGlobalError);
              throw transitCountGlobalError;
            }
            countTransitBefore = transitCountGlobal || 0;
            console.log(`[API Cleanup] Global transit count before: ${countTransitBefore}`);
        }
    }
    console.log(`[API Cleanup] Total records before deletion (inventory: ${countInventoryBefore}, transit: ${countTransitBefore})`);

    const results = {
      deletedInventory: 0,
      deletedTransit: 0,
      totalDeleted: 0,
      totalBefore: countInventoryBefore + countTransitBefore,
    };

    console.log(`[API Cleanup] Performing cleanup. Type: ${cleanupType}, Loja ID: ${lojaId}`);

    // Handle 'contagens' table
    if (cleanupType === "all" || cleanupType === "inventory" || (cleanupType === "custom" && lojaId)) {
      let inventoryQuery = supabaseAdmin.from('contagens').delete();
      if (cleanupType === "custom" && lojaId && lojaId !== "all") {
        inventoryQuery = inventoryQuery.eq('loja', lojaId);
        console.log(`[API Cleanup] Deleting inventory for loja ${lojaId}`);
      } else if (cleanupType === "inventory" || cleanupType === "all" || (cleanupType === "custom" && lojaId === "all")) {
        inventoryQuery = inventoryQuery.neq('id', improbableIntegerValue); // Usar valor inteiro improvável
        console.log("[API Cleanup] Deleting all inventory records (or for all stores in custom mode).");
      }
      
      const { error, count } = await inventoryQuery;
      if (error) {
        console.error("[API Cleanup] Error deleting inventory records:", error);
        throw error;
      }
      results.deletedInventory = count || 0;
      console.log(`[API Cleanup] Deleted ${results.deletedInventory} inventory records.`);
    }

    // Handle 'contagens_transito' table
    if (cleanupType === "all" || cleanupType === "transit" || (cleanupType === "custom" && lojaId)) {
      let transitQuery = supabaseAdmin.from('contagens_transito').delete();
      if (cleanupType === "custom" && lojaId && lojaId !== "all") {
        transitQuery = transitQuery.eq('loja', lojaId);
        console.log(`[API Cleanup] Deleting transit for loja ${lojaId}`);
      } else if (cleanupType === "transit" || cleanupType === "all" || (cleanupType === "custom" && lojaId === "all")) {
        transitQuery = transitQuery.neq('id', improbableIntegerValue); // Usar valor inteiro improvável
        console.log("[API Cleanup] Deleting all transit records (or for all stores in custom mode).");
      }

      const { error: transitError, count: transitCount } = await transitQuery;
      if (transitError) {
        console.error("[API Cleanup] Error deleting transit records:", transitError);
        throw transitError;
      }
      results.deletedTransit = transitCount || 0;
      console.log(`[API Cleanup] Deleted ${results.deletedTransit} transit records.`);
    }

    results.totalDeleted = results.deletedInventory + results.deletedTransit;
    const responseMessage = `Limpeza concluída: ${results.totalDeleted} registros removidos. Contagens de inventário antes: ${countInventoryBefore}, Contagens de trânsito antes: ${countTransitBefore}. Removidos do Inventário: ${results.deletedInventory}, Removidos do Trânsito: ${results.deletedTransit}. Tipo: ${cleanupType}, Loja: ${lojaId || 'Todas'}`;
    console.log(`[API Cleanup] ${responseMessage}`);
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      results
    });

  } catch (error: any) {
    console.error('[API Cleanup] Critical error in POST handler:', error.message, error.stack);
    return NextResponse.json(
      { error: `Erro crítico ao limpar registros: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  console.log("[API Cleanup] Received OPTIONS request.");
  return NextResponse.json({}, { status: 200 });
}