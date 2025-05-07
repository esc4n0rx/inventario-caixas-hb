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
  setUserData: (data: UserData) => void
  setContagem: (id: string, quantidade: number) => void
  resetContagem: () => void
  setIsBlocked: (blocked: boolean) => void
  checkSystemStatus: () => Promise<void>
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      userData: {
        loja: "",
        lojaName: "",
        email: "",
      },
      contagem: {},
      isBlocked: false,
      setUserData: (data) => set({ userData: data }),
      setContagem: (id, quantidade) =>
        set((state) => ({
          contagem: { ...state.contagem, [id]: quantidade },
        })),
      resetContagem: () => set({ contagem: {} }),
      setIsBlocked: (blocked) => set({ isBlocked: blocked }),
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
      }
    }),
    {
      name: "inventario-caixas-hb-storage",
    },
  ),
)