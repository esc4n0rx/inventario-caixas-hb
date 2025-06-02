"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/store"
import { supabase } from '@/lib/supabase'
import AdminDashboard, { SystemConfig as AdminSystemConfig } from "@/components/AdminDashboard"


const APP_VERSION = "1.2.0"
const ADMIN_PASSWORD_KEY = process.env.ADMIN_PASSWORD || "admin_password"
const formSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
})

interface ContagemData {
  id: string
  quantidade: number
  data_registro: string
  loja: string
  loja_nome: string
  email: string
  ativo: string
  ativo_nome: string
}

interface ContagemTransitoData {
  id: string
  data_registro: string
  loja: string
  loja_nome: string
  email: string
  ativo: string
  ativo_nome: string
  quantidade: number
}

interface ConfigData {
  chave: string
  valor: string
}

export default function Admin() {
  // Estados do componente organizados por categoria
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados de dados
  const [contagensData, setContagensData] = useState<ContagemData[]>([])
  const [contagensTransitoData, setContagensTransitoData] = useState<ContagemTransitoData[]>([])
  const [systemConfig, setSystemConfig] = useState<AdminSystemConfig | null>(null)
  
  // Hooks
  const router = useRouter()
  const { toast } = useToast()
  const { setIsBlocked } = useStore()
  
  // Configuração do formulário com React Hook Form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  })

  // Função utilitária para obter senha do localStorage de forma segura
  const getStoredPassword = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_PASSWORD_KEY) || '' : ''
  }, [])

  // Parser de configuração do sistema - memoizado para evitar recálculos
  const parseSystemConfig = useCallback((configData: ConfigData[]): AdminSystemConfig => {
    const configMap = configData.reduce((acc, item) => {
      acc[item.chave] = item.valor
      return acc
    }, {} as Record<string, string>)
    
    return {
      bloqueado: configMap['sistema_bloqueado'] === 'true',
      modo: (configMap['sistema_modo'] || 'manual') as 'automatico' | 'manual',
      dataInicio: configMap['data_inicio'] || '',
      horaInicio: configMap['hora_inicio'] || '',
      dataFim: configMap['data_fim'] || '',
      horaFim: configMap['hora_fim'] || ''
    }
  }, [])

  // Função para buscar contagens - otimizada com useCallback
  const fetchContagens = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('contagens')
        .select('*')
        .order('data_registro', { ascending: false })
      
      if (error) throw error
      
      setContagensData(data || [])
    } catch (error) {
      console.error('Erro ao buscar contagens:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contagens.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Função para buscar contagens de trânsito - otimizada com useCallback
  const fetchContagensTransito = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('contagens_transito')
        .select('*')
        .order('data_registro', { ascending: false })
      
      if (error) throw error
      
      setContagensTransitoData(data || [])
    } catch (error) {
      console.error('Erro ao buscar contagens de trânsito:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contagens de trânsito.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Função principal para buscar dados do sistema - otimizada
  const fetchSystemData = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    console.log("AdminPage: fetchSystemData iniciado")
    
    try {
      // Busca configuração do sistema
      const { data: configData, error: configError } = await supabase
        .from('configuracao_sistema')
        .select('*')
      
      if (configError) {
        console.error("AdminPage: Erro ao buscar configData do Supabase:", configError)
        throw configError
      }
      
      console.log("AdminPage: Dados de configuração obtidos:", configData)

      // Parse da configuração usando a função memoizada
      const parsedConfig = parseSystemConfig(configData || [])
      console.log("AdminPage: Configuração do sistema parseada:", parsedConfig)
      
      // Atualiza estados
      setSystemConfig(parsedConfig)
      setIsBlocked(parsedConfig.bloqueado)
      
      // Busca dados de contagens em paralelo para melhor performance
      await Promise.all([
        fetchContagens(),
        fetchContagensTransito()
      ])
      
    } catch (error) {
      console.error('AdminPage: Erro ao buscar dados do sistema:', error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar todas as informações do sistema.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("AdminPage: fetchSystemData finalizado")
    }
  }, [parseSystemConfig, fetchContagens, fetchContagensTransito, setIsBlocked, toast])

  // Effect para carregar dados quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemData()
    }
  }, [isAuthenticated, fetchSystemData])

  // Função de login - otimizada com tratamento de erro aprimorado
  const onSubmitLogin = useCallback(async (values: z.infer<typeof formSchema>): Promise<void> => {
    try {
      const response = await fetch('/api/admin/verificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha: values.password }),
      })
      
      const data = await response.json()
      
      if (data.autorizado) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, values.password)
        setIsAuthenticated(true)
        toast({
          title: "Autenticado com sucesso",
          description: "Bem-vindo à área administrativa.",
        })
      } else {
        toast({
          title: "Senha incorreta",
          description: "Por favor, tente novamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error)
      toast({
        title: "Erro de autenticação",
        description: "Ocorreu um erro ao verificar a senha. Tente novamente.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Função para atualizar agendamento - otimizada
  const handleUpdateSchedule = useCallback(async (newScheduleData: Partial<AdminSystemConfig>): Promise<void> => {
    try {
      console.log("AdminPage: handleUpdateSchedule chamado com:", newScheduleData)
      
      const currentConfig = systemConfig || { 
        modo: 'manual' as const, 
        bloqueado: true,
        dataInicio: '',
        horaInicio: '',
        dataFim: '',
        horaFim: ''
      }
      
      // Merge dos dados novos com configuração atual
      const payload: Partial<AdminSystemConfig> = {
        modo: newScheduleData.modo ?? currentConfig.modo,
        dataInicio: newScheduleData.dataInicio ?? currentConfig.dataInicio,
        horaInicio: newScheduleData.horaInicio ?? currentConfig.horaInicio,
        dataFim: newScheduleData.dataFim ?? currentConfig.dataFim,
        horaFim: newScheduleData.horaFim ?? currentConfig.horaFim,
      }
      
      console.log("AdminPage: Payload para /api/sistema/config:", payload)

      const response = await fetch('/api/sistema/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: payload, 
          senha: getStoredPassword()
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("AdminPage: Erro na resposta de /api/sistema/config:", errorData)
        throw new Error(errorData.error || 'Erro ao atualizar configurações de agendamento')
      }
      
      const data = await response.json()
      console.log("AdminPage: Resposta de sucesso de /api/sistema/config:", data)
      
      toast({
        title: "Configurações salvas",
        description: "As configurações de agendamento foram atualizadas com sucesso.",
      })
      
      // Re-fetch para obter o estado mais recente
      await fetchSystemData()
      
    } catch (error) {
      console.error('AdminPage: Erro ao atualizar configurações de agendamento:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações de agendamento.",
        variant: "destructive",
      })
    }
  }, [systemConfig, getStoredPassword, toast, fetchSystemData])

  // Função para alternar estado do sistema - otimizada
  const handleToggleSystem = useCallback(async (ativar: boolean, showToast = true): Promise<void> => {
    console.log(`AdminPage: handleToggleSystem chamado com ativar=${ativar}`)
    
    try {
      const response = await fetch('/api/sistema/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bloqueado: !ativar,
          senha: getStoredPassword()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("AdminPage: Erro na resposta de /api/sistema/atualizar:", errorData)
        throw new Error(errorData.error || 'Erro ao alterar estado do sistema')
      }
      
      const data = await response.json()
      console.log("AdminPage: Resposta de sucesso de /api/sistema/atualizar:", data)

      // Atualização otimista do estado local
      setSystemConfig(prev => {
        if (!prev) return null
        return {
          ...prev,
          bloqueado: !ativar,
          modo: 'manual' as const
        }
      })
      
      setIsBlocked(!ativar)
      
      if (showToast) {
        toast({
          title: ativar ? "Sistema Ligado (Manual)" : "Sistema Desligado (Manual)",
          description: ativar 
            ? "O sistema está aberto para contagens." 
            : "O sistema está bloqueado para contagens.",
        })
      }
      
      // Re-fetch para garantir sincronização
      await fetchSystemData()

    } catch (error) {
      console.error('AdminPage: Erro ao alterar estado do sistema:', error)
      if (showToast) {
        toast({
          title: "Erro",
          description: "Não foi possível alterar o estado do sistema.",
          variant: "destructive",
        })
      }
    }
  }, [getStoredPassword, setIsBlocked, toast, fetchSystemData])

  // Função para remover contagem - otimizada
  const handleRemoveContagem = useCallback(async (id: string | number): Promise<void> => {
    try {
      const response = await fetch(`/api/contagens/manage?id=${id}&senha=${getStoredPassword()}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao remover contagem')
      }
      
      toast({
        title: "Contagem removida",
        description: "A contagem foi removida com sucesso.",
      })
      
      await fetchContagens()
    } catch (error) {
      console.error('Erro ao remover contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover a contagem.",
        variant: "destructive",
      })
    }
  }, [getStoredPassword, toast, fetchContagens])

  // Função para editar contagem - otimizada
  const handleEditContagem = useCallback(async (id: string | number, quantidade: number): Promise<void> => {
    try {
      const response = await fetch('/api/contagens/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          quantidade, 
          senha: getStoredPassword()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar contagem')
      }
      
      toast({
        title: "Contagem atualizada",
        description: "A contagem foi atualizada com sucesso.",
      })
      
      await fetchContagens()
    } catch (error) {
      console.error('Erro ao editar contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a contagem.",
        variant: "destructive",
      })
    }
  }, [getStoredPassword, toast, fetchContagens])

  // Função para voltar à página inicial - memoizada
  const handleGoBack = useCallback(() => {
    router.push("/")
  }, [router])

  // Estilos do background memoizados para evitar recriação
  const backgroundStyle = useMemo(() => ({
    backgroundImage: "url('/fundo-login.png')",
    opacity: 0.1,
  }), [])

  // Renderização do formulário de login
  const renderLoginForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="z-10 w-full max-w-md"
    >
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="space-y-3 pt-8 pb-6 px-8">
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-zinc-800/80 rounded-full">
              <ShieldAlert className="h-16 w-16 text-[#F4C95D]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-center">
            Área Administrativa
          </CardTitle>
          <CardDescription className="text-zinc-400 text-lg text-center">
            Digite a senha para acessar o painel administrativo.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitLogin)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite a senha de administrador"
                        {...field}
                        className="bg-zinc-800 border-zinc-700 h-12 text-base"
                      />
                    </FormControl>
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-14 text-lg font-medium mt-6"
              >
                Acessar Dashboard
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="text-zinc-500 hover:text-white hover:bg-zinc-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              Voltar para a página inicial
            </Button>
          </div>
        </CardContent>
        
        <div className="px-8 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-center">
          <p className="text-zinc-500 text-sm">
            ColheitaCerta v{APP_VERSION} - Painel Administrativo
          </p>
        </div>
      </Card>
    </motion.div>
  )

  // Renderização do dashboard administrativo
  const renderDashboard = () => (
    <div className="z-10 relative w-full h-screen overflow-hidden flex flex-col">
      <div className="container mx-auto p-4 sm:p-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-800">
        <AdminDashboard
          contagensData={contagensData}
          contagensTransitoData={contagensTransitoData}
          systemConfig={systemConfig}
          isLoading={isLoading}
          onRefresh={fetchSystemData}
          onUpdateSchedule={handleUpdateSchedule}
          onToggleSystem={handleToggleSystem}
          onRemoveContagem={handleRemoveContagem}
          onEditContagem={handleEditContagem}
        />
      </div>
    </div>
  )

  // Renderização principal
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-zinc-900 text-white">
      {/* Background com imagem */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={backgroundStyle}
      />

      {/* Conteúdo condicional baseado no estado de autenticação */}
      {!isAuthenticated ? renderLoginForm() : renderDashboard()}
    </div>
  )
}