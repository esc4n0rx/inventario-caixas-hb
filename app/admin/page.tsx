"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Unlock, ShieldAlert, FileText, Home, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/store"
import { supabase } from '@/lib/supabase'

const formSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
})

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { isBlocked, setIsBlocked } = useStore()
  const APP_VERSION = "1.2.0"; // Versão do sistema

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  })

  // Verificar o estado atual do sistema quando a página carrega
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracao_sistema')
          .select('valor')
          .eq('chave', 'sistema_bloqueado')
          .single();
        
        if (error) throw error;
        
        setIsBlocked(data.valor === 'true');
      } catch (error) {
        console.error('Erro ao verificar status do sistema:', error);
        toast({
          title: "Erro ao verificar status",
          description: "Não foi possível verificar o estado atual do sistema",
          variant: "destructive",
        });
      }
    };
    
    checkSystemStatus();
  }, [setIsBlocked, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await fetch('/api/admin/verificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senha: values.password }),
      });
      
      const data = await response.json();
      
      if (data.autorizado) {
        setIsAuthenticated(true);
        toast({
          title: "Autenticado com sucesso",
          description: "Bem-vindo à área administrativa",
        });
      } else {
        toast({
          title: "Senha incorreta",
          description: "Por favor, tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      toast({
        title: "Erro de autenticação",
        description: "Ocorreu um erro ao verificar a senha. Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const handleToggleBlock = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('configuracao_sistema')
        .update({ 
          valor: !isBlocked ? 'true' : 'false',
          data_modificacao: new Date().toISOString()
        })
        .eq('chave', 'sistema_bloqueado');
      
      if (error) throw error;
      
      // Atualizar estado local
      setIsBlocked(!isBlocked);
      toast({
        title: isBlocked ? "Contagem desbloqueada" : "Contagem bloqueada",
        description: isBlocked
          ? "Os usuários agora podem realizar contagens"
          : "Os usuários não poderão iniciar novas contagens",
      });
    } catch (error) {
      console.error('Erro ao atualizar estado do sistema:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o sistema. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/fundo-login.png')",
          opacity: 0.2,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-xl"
      >
        <Card className="bg-[#2C2C2C] text-white border-none shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="space-y-3 pt-8 pb-6 px-8">
            <div className="flex justify-center mb-2">
              <div className="p-4 bg-zinc-800/80 rounded-full">
                <ShieldAlert className="h-16 w-16 text-[#F4C95D]" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center">Área Administrativa</CardTitle>
            <CardDescription className="text-zinc-400 text-center text-lg">
              {isAuthenticated ? "Gerencie as configurações do sistema" : "Faça login para acessar as configurações"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {!isAuthenticated ? (
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
                    <Settings className="mr-2 h-5 w-5" />
                    Acessar Painel
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-8">
                <div className="bg-zinc-900/60 rounded-xl p-6 border border-zinc-800/80">
                  <h2 className="text-xl font-medium mb-4 flex items-center">
                    <Settings className="h-6 w-6 text-[#F4C95D] mr-2" />
                    Configurações do Sistema
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-5 bg-zinc-800 rounded-lg shadow-md border border-zinc-700/30 hover:bg-zinc-800/80 transition-colors">
                      <div className="space-y-1">
                        <h3 className="font-medium text-lg">Bloquear Contagem</h3>
                        <p className="text-base text-zinc-400">
                          {isBlocked
                            ? "A contagem está bloqueada para todos os usuários"
                            : "A contagem está liberada para todos os usuários"}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {isBlocked ? (
                          <div className="flex items-center justify-center bg-red-900/20 p-2 rounded-lg mr-4">
                            <Lock className="h-6 w-6 text-red-400" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center bg-green-900/20 p-2 rounded-lg mr-4">
                            <Unlock className="h-6 w-6 text-green-400" />
                          </div>
                        )}
                        <Switch 
                          checked={isBlocked} 
                          onCheckedChange={handleToggleBlock} 
                          disabled={isUpdating}
                          className="scale-125"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => router.push("/admin/contagens")}
                    className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-14 text-base font-medium"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Ver Histórico de Contagens
                  </Button>

                  <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="border-zinc-700 text-white hover:bg-zinc-800 h-14 text-base font-medium"
                  >
                    <Home className="mr-2 h-5 w-5" />
                    Voltar para a Página Inicial
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="px-8 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-center">
            <p className="text-zinc-500 text-sm">ColheitaCerta v{APP_VERSION} - Painel Administrativo</p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}