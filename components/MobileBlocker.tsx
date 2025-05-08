"use client"

/*
 * 📵 MobileBlocker
 * 
 * Resumo: Esse componente chato serve pra barrar todo mundo que tenta acessar o sistema
 *        pelo celular. Só desktop têm vez aqui, porque inventário é coisa séria, meu amigo.
 */

import { useEffect, useState } from "react"
import { AlertTriangle, Computer, Smartphone } from "lucide-react"
import { useIsMobile } from "@/hooks/use-is-mobile"

export default function MobileBlocker() {
  // Papo reto: next.js nasce chorando no SSR, então a gente força a renderização client-side
  const isMobile = useIsMobile()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Gambiarra master: só marco como client após montar pra não quebrar no servidor
    setIsClient(true)
  }, [])

  // Se ainda não tá no client, não mostra nada (porque server e window são inimigos)
  if (!isClient) return null

  // Se não for mobile, tranquilo, deixa passar (só bloqueio em celular mesmo)
  if (!isMobile) return null

  // Agora sim: vamos ao blackout total e sem dó
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modalinho estiloso pra mandar o recado */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6 shadow-2xl">
        <div className="mb-6 flex justify-center">
          {/* Ícone do smartphone com vibe de “tá errado, brother” */}
          <div className="p-4 bg-red-900/30 rounded-full">
            <Smartphone className="h-12 w-12 text-red-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-white text-center mb-3">
          Acesso via Dispositivo Móvel Bloqueado
        </h2>
        
        <p className="text-zinc-300 text-center mb-6">
          Pra garantir a precisão do inventário, esse treco só funciona em computadores da firma.
        </p>
        
        {/* Sugestão de solução (porque a gente é gente boa) */}
        <div className="flex items-center justify-center space-x-3 mb-4 text-center p-3 bg-zinc-800 rounded-lg">
          <Computer className="h-5 w-5 text-[#F4C95D]" />
          <p className="text-white">
            Use um computador desktop pra acessar o sistema
          </p>
        </div>
        
        {/* Aviso final: sem choro, sem toque */}
        <div className="flex items-center text-zinc-500 text-xs mt-6 justify-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <p>Esse bloqueio não pode ser removido nem com reza brava</p>
        </div>
      </div>
    </div>
  )
}
