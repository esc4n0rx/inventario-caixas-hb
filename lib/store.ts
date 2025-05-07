import { create } from "zustand"
import { persist } from "zustand/middleware"

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
    }),
    {
      name: "inventario-caixas-hb-storage",
    },
  ),
)
