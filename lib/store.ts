// lib/store.ts (versão completa)
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from './supabase'

type UserData = {
  loja: string
  lojaName: string
  email: string
}

type Contagem = {
  [key: string]: number
}

type Store = {
  userData: UserData
  contagem: Contagem
  contagemTransito: Contagem
  isBlocked: boolean
  isLojaBlocked: boolean
  transitoCompleted: boolean
  countType: "estoque" | "transito" | null
  setUserData: (data: UserData) => void
  setContagem: (id: string, quantidade: number) => void
  setContagemTransito: (id: string, quantidade: number) => void
  resetContagem: () => void
  resetContagemTransito: () => void
  setIsBlocked: (blocked: boolean) => void
  setIsLojaBlocked: (blocked: boolean) => void
  setTransitoCompleted: (completed: boolean) => void
  setCountType: (type: "estoque" | "transito" | null) => void
  checkSystemStatus: () => Promise<void>
  checkLojaStatus: (lojaId: string) => Promise<boolean>
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      userData: {
        loja: "",
        lojaName: "",
        email: "",
      },
      contagem: {},
      contagemTransito: {},
      isBlocked: false,
      isLojaBlocked: false,
      transitoCompleted: false,
      countType: null,
      
      setUserData: (data) => set({ userData: data }),
      
      setContagem: (id, quantidade) =>
        set((state) => ({
          contagem: { ...state.contagem, [id]: quantidade },
        })),
        
      setContagemTransito: (id, quantidade) =>
        set((state) => ({
          contagemTransito: { ...state.contagemTransito, [id]: quantidade },
        })),
        
      resetContagem: () => set({ contagem: {} }),
      
      resetContagemTransito: () => set({ contagemTransito: {} }),
      
      setIsBlocked: (blocked) => set({ isBlocked: blocked }),
      
      setIsLojaBlocked: (blocked) => set({ isLojaBlocked: blocked }),
      
      setTransitoCompleted: (completed) => set({ transitoCompleted: completed }),
      
      setCountType: (type) => set({ countType: type }),
      
      checkSystemStatus: async () => {
        try {
          const { data, error } = await supabase
            .from('configuracao_sistema')
            .select('valor')
            .eq('chave', 'sistema_bloqueado')
            .single();
          
          if (error) throw error;
          
          set({ isBlocked: data.valor === 'true' });
        } catch (error) {
          console.error('Erro ao verificar status do sistema:', error);
        }
      },
      
      checkLojaStatus: async (lojaId: string) => {
        try {
          if (!lojaId) return false;
          
          // Verificar se a loja já fez contagem
          const { data, error, count } = await supabase
            .from('contagens')
            .select('id', { count: 'exact' })
            .eq('loja', lojaId)
            .limit(1);
          
          if (error) throw error;
          
          const isBlocked = count !== null && count > 0;
          set({ isLojaBlocked: isBlocked });
          return isBlocked;
        } catch (error) {
          console.error('Erro ao verificar status da loja:', error);
          return false;
        }
      }
    }),
    {
      name: "inventario-caixas-hb-storage",
    },
  ),
)