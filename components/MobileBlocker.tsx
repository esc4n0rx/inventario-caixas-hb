// components/MobileBlocker.tsx
"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Computer, Smartphone } from "lucide-react"
import { useIsMobile } from "@/hooks/use-is-mobile"

export default function MobileBlocker() {
  const isMobile = useIsMobile()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Só renderiza no cliente para evitar erros de hidratação
  if (!isClient) return null

  // Se não for um dispositivo móvel, não renderiza nada
  if (!isMobile) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-red-900/30 rounded-full">
            <Smartphone className="h-12 w-12 text-red-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-white text-center mb-3">
          Acesso via Dispositivo Móvel Bloqueado
        </h2>
        
        <p className="text-zinc-300 text-center mb-6">
          Para garantir a precisão do inventário, este sistema deve ser acessado apenas através dos computadores da empresa.
        </p>
        
        <div className="flex items-center justify-center space-x-3 mb-4 text-center p-3 bg-zinc-800 rounded-lg">
          <Computer className="h-5 w-5 text-[#F4C95D]" />
          <p className="text-white">
            Use um computador desktop para acessar o sistema
          </p>
        </div>
        
        <div className="flex items-center text-zinc-500 text-xs mt-6 justify-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          <p>Este bloqueio não pode ser removido</p>
        </div>
      </div>
    </div>
  )
}