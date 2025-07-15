// app/admin/page.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldAlert, ArrowLeft, Settings, Database, Webhook, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/store"
import { supabase } from '@/lib/supabase'
import AdminDashboard, { SystemConfig as AdminSystemConfig } from "@/components/AdminDashboard"
import { WebhookConfiguration } from "@/components/WebhookConfiguration"
import BatchGenerator from "@/components/BatchGenerator"

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
    return typeof window !== 'undefined' ? 
      (localStorage.getItem(ADMIN_PASSWORD_KEY) || '') : ''
  }, [])

  // Função para buscar dados do sistema
  const fetchSystemData = useCallback(async () => {
    try {
      console.log("AdminPage: fetchSystemData iniciado")
      setIsLoading(true)
      
      // Buscar configurações do sistema
      const configResponse = await fetch('/api/sistema/config')
      const configData = await configResponse.json()
      
      if (configData.success) {
        setSystemConfig(configData.config)
        console.log("AdminPage: Sistema config carregado:", configData.config)
      } else {
        console.error("AdminPage: Erro ao carregar config do sistema:", configData.error)
      }
      
      // Buscar contagens
      const { data: contagens, error: contagensError } = await supabase
        .from('contagens')
        .select('*')
        .order('data_registro', { ascending: false })
      
      if (contagensError) {
        console.error("AdminPage: Erro ao buscar contagens:", contagensError)
        throw contagensError
      }
      
      setContagensData(contagens || [])
      console.log("AdminPage: Contagens carregadas:", contagens?.length || 0)
      
      // Buscar contagens de trânsito
      const { data: contagensTransito, error: transitoError } = await supabase
        .from('contagens_transito')
        .select('*')
        .order('data_registro', { ascending: false })
      
      if (transitoError) {
        console.error("AdminPage: Erro ao buscar contagens de trânsito:", transitoError)
        throw transitoError
      }
      
      setContagensTransitoData(contagensTransito || [])
      console.log("AdminPage: Contagens de trânsito carregadas:", contagensTransito?.length || 0)
      
    } catch (error) {
      console.error('AdminPage: Erro ao buscar dados do sistema:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do sistema.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const storedPassword = getStoredPassword()
      if (storedPassword) {
        try {
          const response = await fetch('/api/sistema/atualizar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bloqueado: false, senha: storedPassword }),
          })
          
          if (response.ok) {
            setIsAuthenticated(true)
            await fetchSystemData()
          } else {
            localStorage.removeItem(ADMIN_PASSWORD_KEY)
            setIsLoading(false)
          }
        } catch (error) {
          console.error('Erro na verificação de autenticação:', error)
          localStorage.removeItem(ADMIN_PASSWORD_KEY)
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [getStoredPassword, fetchSystemData])

  // Função para ir para a página inicial
  const handleGoBack = useCallback(() => {
    router.push("/")
  }, [router])

  // Função para fazer login
  const onSubmitLogin = useCallback(async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/sistema/atualizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bloqueado: false, senha: values.password }),
      })

      if (response.ok) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, values.password)
        setIsAuthenticated(true)
        await fetchSystemData()
        toast({
          title: "Autenticado com sucesso",
          description: "Bem-vindo ao painel administrativo.",
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
  }, [fetchSystemData, toast])

  // Função para atualizar agendamento
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

  // Função para alternar sistema
  const handleToggleSystem = useCallback(async (bloqueado: boolean) => {
    try {
      const response = await fetch('/api/sistema/atualizar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bloqueado, senha: getStoredPassword() }),
      })
      
      if (response.ok) {
        setIsBlocked(bloqueado)
        await fetchSystemData()
        toast({
          title: bloqueado ? "Sistema bloqueado" : "Sistema desbloqueado",
          description: bloqueado 
            ? "O sistema foi bloqueado para contagens" 
            : "O sistema foi desbloqueado para contagens",
        })
      } else {
        throw new Error('Erro ao atualizar sistema')
      }
    } catch (error) {
      console.error('Erro ao alternar sistema:', error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o estado do sistema.",
        variant: "destructive",
      })
    }
  }, [getStoredPassword, setIsBlocked, fetchSystemData, toast])

  // Função para remover contagem
  const handleRemoveContagem = useCallback(async (id: string, tipo: 'contagem' | 'transito') => {
    try {
      const tabela = tipo === 'contagem' ? 'contagens' : 'contagens_transito'
      const { error } = await supabase
        .from(tabela)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await fetchSystemData()
      toast({
        title: "Contagem removida",
        description: "A contagem foi removida com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao remover contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover a contagem.",
        variant: "destructive",
      })
    }
  }, [fetchSystemData, toast])

  // Função para editar contagem
  const handleEditContagem = useCallback(async (id: string, novaQuantidade: number, tipo: 'contagem' | 'transito') => {
    try {
      const tabela = tipo === 'contagem' ? 'contagens' : 'contagens_transito'
      const { error } = await supabase
        .from(tabela)
        .update({ quantidade: novaQuantidade })
        .eq('id', id)
      
      if (error) throw error
      
      await fetchSystemData()
      toast({
        title: "Contagem atualizada",
        description: "A quantidade foi atualizada com sucesso.",
      })
    } catch (error) {
      console.error('Erro ao editar contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a contagem.",
        variant: "destructive",
      })
    }
  }, [fetchSystemData, toast])

  // Adapte para contagem normal
  const handleRemoveContagemWrapper = useCallback(
    (id: string) => handleRemoveContagem(id, "contagem"),
    [handleRemoveContagem]
  );

  const handleEditContagemWrapper = useCallback(
    (id: string, quantidade: number) => handleEditContagem(id, quantidade, "contagem"),
    [handleEditContagem]
  );

  // Estilo do background
  const backgroundStyle = useMemo(() => ({
    backgroundImage: "url('/fundo-login.png')",
    opacity: 0.3,
  }), [])

  // Renderização do formulário de login
  const renderLoginForm = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="z-10 w-full max-w-md mx-auto"
    >
      <Card className="bg-[#232323] text-white border-none shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 items-center text-center pb-6 pt-8">
          <div className="flex items-center justify-center mb-4">
            <ShieldAlert className="h-10 w-10 text-[#F4C95D]" />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso Administrativo</CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            Digite a senha para acessar o painel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-8 pb-8">
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
                        className="bg-zinc-800 border-zinc-700 h-12 text-base focus:ring-2 focus:ring-[#F4C95D] focus:border-[#F4C95D]"
                      />
                    </FormControl>
                    <FormMessage className="text-base" />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-14 text-lg font-medium mt-6 rounded-lg shadow-md transition-all"
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
        <div className="px-4 sm:px-8 py-3 bg-zinc-900/60 border-t border-zinc-800 flex justify-center">
          <p className="text-zinc-500 text-sm">
            ColheitaCerta v{APP_VERSION} - Painel Administrativo
          </p>
        </div>
      </Card>
    </motion.div>
  )

  // Renderização do dashboard administrativo
  const renderDashboard = () => (
    <div className="z-10 relative w-full max-w-7xl mx-auto flex flex-col min-h-[80vh] pb-8">
      <div className="w-full px-2 sm:px-4 md:px-8 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center sm:text-left">Painel Administrativo</h1>
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="border-zinc-700 text-white hover:bg-zinc-800"
          >
            Voltar ao Sistema
          </Button>
        </div>
        <Tabs defaultValue="sistema" className="space-y-6 w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-zinc-800 border-zinc-700 rounded-lg overflow-hidden">
            <TabsTrigger 
              value="sistema" 
              className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black"
            >
              <Settings className="h-4 w-4 mr-2" />
              Sistema
            </TabsTrigger>
            <TabsTrigger 
              value="webhook" 
              className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black"
            >
              <Webhook className="h-4 w-4 mr-2" />
              Webhook
            </TabsTrigger>
            <TabsTrigger 
              value="lote" 
              className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black"
            >
              <Zap className="h-4 w-4 mr-2" />
              Lote
            </TabsTrigger>
          </TabsList>
          <div className="w-full min-h-[400px] bg-zinc-900/70 rounded-b-xl rounded-tr-xl shadow-lg p-2 sm:p-6 mt-0">
            <TabsContent value="sistema">
              <AdminDashboard
                contagensData={contagensData}
                contagensTransitoData={contagensTransitoData}
                systemConfig={systemConfig}
                isLoading={isLoading}
                onRefresh={fetchSystemData}
                onUpdateSchedule={handleUpdateSchedule}
                onToggleSystem={handleToggleSystem}
                onRemoveContagem={handleRemoveContagemWrapper}
                onEditContagem={handleEditContagemWrapper}
              />
            </TabsContent>
            <TabsContent value="webhook">
              <WebhookConfiguration adminPassword={getStoredPassword()} />
            </TabsContent>
            <TabsContent value="lote">
              <BatchGenerator 
                systemConfig={systemConfig}
                onRefresh={fetchSystemData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )

  // Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </div>
    )
  }

  // Renderização principal
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white overflow-x-hidden">
      {/* Background com imagem */}
      <div
        className="fixed inset-0 bg-cover bg-center z-0 pointer-events-none"
        style={backgroundStyle}
        aria-hidden="true"
      />

      {/* Conteúdo condicional baseado no estado de autenticação */}
      <main className="relative flex-1 flex flex-col items-center justify-center z-10 px-2 py-6 sm:px-4 md:px-8 lg:px-0 w-full max-w-full min-h-screen overflow-y-auto">
        {!isAuthenticated ? renderLoginForm() : renderDashboard()}
      </main>
    </div>
  )
}