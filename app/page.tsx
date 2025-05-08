"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Leaf, AlertTriangle, XCircle, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useStore } from "@/lib/store"
import { lojas } from "@/data/lojas"

const formSchema = z.object({
  loja: z.string({
    required_error: "Por favor selecione uma loja",
  }),
  email: z
    .string()
    .email("Email inválido")
    .refine((email) => email.endsWith("@hortifruti.com.br"), {
      message: "Email deve terminar com @hortifruti.com.br",
    }),
})

export default function Home() {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showLojaWarning, setShowLojaWarning] = useState(false)
  const [selectedLoja, setSelectedLoja] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { setUserData, isBlocked, checkSystemStatus, checkLojaStatus } = useStore()

  useEffect(() => {
    const loadSystemStatus = async () => {
      setLoading(true);
      await checkSystemStatus();
      setLoading(false);
    };
    
    loadSystemStatus();
  }, [checkSystemStatus]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loja: "",
      email: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isBlocked) {
      toast({
        title: "Sistema bloqueado",
        description: "O sistema está temporariamente bloqueado para contagens",
        variant: "destructive",
      });
      return;
    }

    const lojaJaContou = await checkLojaStatus(values.loja);
    if (lojaJaContou) {
      setSelectedLoja(values.loja);
      setShowLojaWarning(true);
      return;
    }
    
    setUserData({
      loja: values.loja,
      email: values.email,
      lojaName: lojas.find((l) => l.id === values.loja)?.nome || "",
    })
    setShowConfirmation(true)
  }

  const handleConfirm = async () => {
    if (isBlocked) {
      toast({
        title: "Sistema bloqueado",
        description: "O sistema está temporariamente bloqueado para contagens",
        variant: "destructive",
      });
      setShowConfirmation(false);
      return;
    }

    const lojaJaContou = await checkLojaStatus(form.getValues().loja);
    if (lojaJaContou) {
      setShowConfirmation(false);
      setSelectedLoja(form.getValues().loja);
      setShowLojaWarning(true);
      return;
    }
    
    setShowConfirmation(false)
    router.push("/contagem")
  }

  const APP_VERSION = "1.2.0"; 

  const getLojaName = (id: string | null) => {
    if (!id) return "";
    const loja = lojas.find(l => l.id === id);
    return loja ? loja.nome : "";
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: "url('/fundo-login.png')",
          opacity: 0.3,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-xl" 
      >
        <Card className="bg-[#2C2C2C] text-white border-none shadow-xl rounded-xl overflow-hidden"> 
          <CardHeader className="space-y-2 items-center text-center pb-6 pt-8"> 
            <div className="flex items-center justify-center mb-4"> 
              <div className="text-3xl font-bold flex items-center"> 
                <span className="text-white">Colheita</span>
                <span className="text-[#F4C95D]">Certa</span>
                <Leaf className="h-7 w-7 ml-1 text-[#6DC267] fill-[#6DC267]" /> 
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Inventário Caixas HB</CardTitle> 
            <CardDescription className="text-zinc-400 text-lg"> 
              Selecione sua loja e informe seu email para iniciar
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {loading ? (
              <div className="text-center p-8"> 
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent mx-auto mb-4"></div>
                <p className="text-white text-lg">Carregando...</p> 
              </div>
            ) : isBlocked ? (
              <div className="text-center p-6 bg-red-900/30 rounded-md"> 
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" /> 
                <p className="text-white font-medium text-xl mb-2">Contagem temporariamente desativada.</p>
                <p className="text-zinc-400 mt-2 text-base">O sistema está em manutenção. Por favor, tente novamente mais tarde.</p> 
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"> 
                  <FormField
                    control={form.control}
                    name="loja"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-base">Selecione a Loja</FormLabel> 
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 h-12 text-base">
                              <SelectValue placeholder="Selecione uma loja" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent position="item-aligned" sideOffset={4} className="bg-zinc-800 border-zinc-700">
                            {lojas.map((loja) => (
                              <SelectItem key={loja.id} value={loja.id}>
                                {loja.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-base" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel className="text-base">Email</FormLabel> 
                        <FormControl>
                          <Input
                            placeholder="seu.email@hortifruti.com.br"
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
                    className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-12 text-base font-medium mt-4" 
                  >
                    Iniciar Contagem
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter className="px-8 py-3 bg-zinc-900/50 border-t border-zinc-800 flex justify-center"> 
            <p className="text-zinc-500 text-sm">ColheitaCerta v{APP_VERSION}</p>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmar Informações</DialogTitle> 
            <DialogDescription className="text-zinc-400 text-base"> 
              Verifique se os dados estão corretos antes de prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4"> 
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">Loja</p>
              <p className="text-lg">{lojas.find((l) => l.id === form.getValues().loja)?.nome}</p> 
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">Email</p>
              <p className="text-lg">{form.getValues().email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800 h-11"
            >
              Editar
            </Button>
            <Button onClick={handleConfirm} className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-11"> 
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLojaWarning} onOpenChange={setShowLojaWarning}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 rounded-xl max-w-md">
          <DialogHeader className="space-y-3">
            <div className="mx-auto bg-amber-900/30 p-3 rounded-full">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <DialogTitle className="text-xl text-center">Contagem Já Realizada</DialogTitle>
            <DialogDescription className="text-zinc-400 text-base text-center">
              A loja <span className="text-amber-400 font-medium">{getLojaName(selectedLoja)}</span> já enviou uma contagem para este inventário.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 my-3">
            <p className="text-sm text-zinc-300">
              De acordo com as regras do inventário, cada loja pode enviar apenas uma contagem. Por favor, selecione outra loja ou entre em contato com o administrador caso precise atualizar dados.
            </p>
          </div>
          <DialogFooter className="flex justify-center">
            <Button 
              onClick={() => setShowLojaWarning(false)}
              className="bg-zinc-700 hover:bg-zinc-600 text-white h-11 px-8" 
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}