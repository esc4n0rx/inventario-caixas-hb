"use client"

import { useState, useEffect } from "react"
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
import AdminDashboard from "@/components/AdminDashboard"


const formSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
})

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [contagensData, setContagensData] = useState<any[]>([])
  const [contagensTransitoData, setContagensTransitoData] = useState<any[]>([])
  interface SystemConfig {
    bloqueado: boolean;
    modo: "automatico" | "manual";
    dataInicio: string;
    horaInicio: string;
    dataFim: string;
    horaFim: string;
  }
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const APP_VERSION = "1.2.0";
  
  const router = useRouter()
  const { toast } = useToast()
  const { setIsBlocked } = useStore()
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  })


  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemData()
    }
  }, [isAuthenticated])


  const fetchSystemData = async () => {
    setIsLoading(true)
    
    try {

      const { data: configData, error: configError } = await supabase
        .from('configuracao_sistema')
        .select('*')
      
      if (configError) throw configError


    // const { data: integrationData, error: integrationError } = await supabase
    //   .from('integracao_config')
    //   .select('*')
    //   .single();
    
    // if (integrationError) {
    //   // Se o erro for que o registro não existe, não é um problema crítico
    //   if (integrationError.code !== 'PGRST116') {
    //     console.error('Erro ao buscar configuração de integração:', integrationError);
    //   }
      
    //   // Definir configuração padrão (desativada)
    //   setIntegrationConfig({
    //     enabled: false,
    //     token: '',
    //     expiration: '',
    //   });
    // } else {
    //   setIntegrationConfig(integrationData);
    // }
      

      const configMap: { [key: string]: string } = {}
      configData.forEach(item => {
        configMap[item.chave] = item.valor
      })
      
      const parsedConfig = {
        bloqueado: configMap['sistema_bloqueado'] === 'true',
        modo: (configMap['sistema_modo'] || 'manual') as 'automatico' | 'manual',
        dataInicio: configMap['data_inicio'] || '',
        horaInicio: configMap['hora_inicio'] || '',
        dataFim: configMap['data_fim'] || '',
        horaFim: configMap['hora_fim'] || ''
      }
      
      setSystemConfig(parsedConfig)
      setIsBlocked(parsedConfig.bloqueado)
      
  
      await fetchContagens()
      

      await fetchContagensTransito()
      
    } catch (error) {
      console.error('Erro ao buscar dados do sistema:', error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar todas as informações do sistema.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  const fetchContagens = async () => {
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
        description: "Não foi possível carregar as contagens",
        variant: "destructive",
      })
    }
  }


  const fetchContagensTransito = async () => {
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
        description: "Não foi possível carregar as contagens de trânsito",
        variant: "destructive",
      })
    }
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
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
        setIsAuthenticated(true)
        toast({
          title: "Autenticado com sucesso",
          description: "Bem-vindo à área administrativa",
        })
      } else {
        toast({
          title: "Senha incorreta",
          description: "Por favor, tente novamente",
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
  }


  const handleUpdateSchedule = async (scheduleData:any) => {
    try {

      await supabase
        .from('configuracao_sistema')
        .upsert({ 
          chave: 'sistema_modo', 
          valor: scheduleData.modo,
          data_modificacao: new Date().toISOString() 
        })
      
      if (scheduleData.modo === 'automatico') {

        await supabase
          .from('configuracao_sistema')
          .upsert({ 
            chave: 'data_inicio', 
            valor: scheduleData.dataInicio,
            data_modificacao: new Date().toISOString() 
          })
        
        await supabase
          .from('configuracao_sistema')
          .upsert({ 
            chave: 'hora_inicio', 
            valor: scheduleData.horaInicio,
            data_modificacao: new Date().toISOString() 
          })
        
        await supabase
          .from('configuracao_sistema')
          .upsert({ 
            chave: 'data_fim', 
            valor: scheduleData.dataFim,
            data_modificacao: new Date().toISOString() 
          })
        

        await supabase
          .from('configuracao_sistema')
          .upsert({ 
            chave: 'hora_fim', 
            valor: scheduleData.horaFim,
            data_modificacao: new Date().toISOString() 
          })
      }
      
      if (scheduleData.modo === 'automatico') {
        const agora = new Date()
        const dataInicio = new Date(`${scheduleData.dataInicio}T${scheduleData.horaInicio}`)
        const dataFim = new Date(`${scheduleData.dataFim}T${scheduleData.horaFim}`)
        
        const deveBloqueado = !(agora >= dataInicio && agora <= dataFim)
        
        await handleToggleSystem(!deveBloqueado, false) 
      }
      
      toast({
        title: "Configurações salvas",
        description: "As configurações de agendamento foram atualizadas com sucesso",
      })
      

      await fetchSystemData()
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações de agendamento",
        variant: "destructive",
      })
    }
  }


  const handleToggleSystem = async (ativar:any, showToast = true) => {
    try {
      await supabase
        .from('configuracao_sistema')
        .update({ 
          valor: ativar ? 'false' : 'true',
          data_modificacao: new Date().toISOString()
        })
        .eq('chave', 'sistema_bloqueado')
      

      setSystemConfig(prev => prev ? {
        ...prev,
        bloqueado: !ativar
      } : null)
      
      setIsBlocked(!ativar)
      
      if (showToast) {
        toast({
          title: ativar ? "Sistema ativado" : "Sistema desativado",
          description: ativar 
            ? "O sistema está aberto para contagens" 
            : "O sistema está bloqueado para contagens",
        })
      }
    } catch (error) {
      console.error('Erro ao atualizar estado do sistema:', error)
      if (showToast) {
        toast({
          title: "Erro",
          description: "Não foi possível alterar o estado do sistema",
          variant: "destructive",
        })
      }
    }
  }

  const handleRemoveContagem = async (id: any) => {
    try {
      const { error } = await supabase
        .from('contagens')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Contagem removida",
        description: "A contagem foi removida com sucesso",
      })
      
      await fetchContagens()
    } catch (error) {
      console.error('Erro ao remover contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível remover a contagem",
        variant: "destructive",
      })
    }
  }

  const handleEditContagem = async (id: any, quantidade: any) => {
    try {
      const { error } = await supabase
        .from('contagens')
        .update({ 
          quantidade,
          data_modificacao: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) throw error
      
      toast({
        title: "Contagem atualizada",
        description: "A contagem foi atualizada com sucesso",
      })
      
      await fetchContagens()
    } catch (error) {
      console.error('Erro ao editar contagem:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a contagem",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/fundo-login.png')",
          opacity: 0.2,
        }}
      />

      {!isAuthenticated ? (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="z-10 w-full max-w-md"
            //className="z-10 w-full max-w-md absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
          <Card className="bg-[#2C2C2C] text-white border-none shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="space-y-3 pt-8 pb-6 px-8">
              <div className="flex justify-center mb-3">
                <div className="p-4 bg-zinc-800/80 rounded-full">
                  <ShieldAlert className="h-16 w-16 text-[#F4C95D]" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-center">Área Administrativa</CardTitle>
              <CardDescription className="text-zinc-400 text-lg text-center">
                Digite a senha para acessar o painel administrativo
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  onClick={() => router.push("/")}
                  className="text-zinc-500 hover:text-white hover:bg-zinc-800"
                >
                  Voltar para a página inicial
                </Button>
              </div>
            </CardContent>
            <div className="px-8 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-center">
              <p className="text-zinc-500 text-sm">ColheitaCerta v{APP_VERSION} - Painel Administrativo</p>
            </div>
          </Card>
        </motion.div>
      ) : (
        <div className="z-10 relative w-full h-screen overflow-hidden">
          <div className="container mx-auto p-6 h-full overflow-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
                className="border-zinc-700 text-white hover:bg-zinc-800 h-9 mr-4"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar para Início
              </Button>
            </div>
            

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
      )}
    </div>
  )
}