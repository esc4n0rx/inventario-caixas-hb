"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Unlock, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/store"

const formSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
})

// Senha fixa para testes
const ADMIN_PASSWORD = "admin123"

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { isBlocked, setIsBlocked } = useStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (values.password === ADMIN_PASSWORD) {
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
  }

  const handleToggleBlock = () => {
    setIsBlocked(!isBlocked)
    toast({
      title: isBlocked ? "Contagem desbloqueada" : "Contagem bloqueada",
      description: isBlocked
        ? "Os usuários agora podem realizar contagens"
        : "Os usuários não poderão iniciar novas contagens",
    })
  }

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
        className="z-10 w-full max-w-md"
      >
        <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <ShieldAlert className="h-12 w-12 text-[#F4C95D]" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Área Administrativa</CardTitle>
            <CardDescription className="text-zinc-400 text-center">
              {isAuthenticated ? "Gerencie as configurações do sistema" : "Faça login para acessar as configurações"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Digite a senha de administrador"
                            {...field}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black">
                    Acessar
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
                    <div className="space-y-0.5">
                      <h3 className="font-medium">Bloquear Contagem</h3>
                      <p className="text-sm text-zinc-400">
                        {isBlocked
                          ? "A contagem está bloqueada para todos os usuários"
                          : "A contagem está liberada para todos os usuários"}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {isBlocked ? (
                        <Lock className="mr-2 h-4 w-4 text-red-400" />
                      ) : (
                        <Unlock className="mr-2 h-4 w-4 text-green-400" />
                      )}
                      <Switch checked={isBlocked} onCheckedChange={handleToggleBlock} />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Voltar para a Página Inicial
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
