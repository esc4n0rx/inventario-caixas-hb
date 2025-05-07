// lib/store.ts - modificação
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
  isBlocked: boolean
  isLojaBlocked: boolean
  setUserData: (data: UserData) => void
  setContagem: (id: string, quantidade: number) => void
  resetContagem: () => void
  setIsBlocked: (blocked: boolean) => void
  setIsLojaBlocked: (blocked: boolean) => void
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
      isBlocked: false,
      isLojaBlocked: false,
      setUserData: (data) => set({ userData: data }),
      setContagem: (id, quantidade) =>
        set((state) => ({
          contagem: { ...state.contagem, [id]: quantidade },
        })),
      resetContagem: () => set({ contagem: {} }),
      setIsBlocked: (blocked) => set({ isBlocked: blocked }),
      setIsLojaBlocked: (blocked) => set({ isLojaBlocked: blocked }),
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