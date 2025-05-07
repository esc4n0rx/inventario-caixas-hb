"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Edit2, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
import { ativos } from "@/data/ativos"
import { lojas } from "@/data/lojas"
import { supabase } from '@/lib/supabase'

const formSchema = z.object({
  quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa"),
})

export default function Contagem() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { userData, contagem, setContagem, resetContagem, isBlocked, checkSystemStatus } = useStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantidade: contagem[ativos[currentStep].id] || 0,
    },
  })

  useEffect(() => {
    // Verificar status do sistema
    checkSystemStatus();
    
    // Redirect if no user data
    if (!userData.loja || !userData.email) {
      router.push("/")
      return
    }

    // Redirecionar se o sistema estiver bloqueado
    if (isBlocked) {
      toast({
        title: "Sistema bloqueado",
        description: "O sistema está temporariamente bloqueado para contagens",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    // Update form when step changes
    form.setValue("quantidade", contagem[ativos[currentStep].id] || 0)
  }, [currentStep, userData, router, form, contagem, isBlocked, checkSystemStatus, toast])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Save current count
    setContagem(ativos[currentStep].id, values.quantidade)

    if (currentStep === ativos.length - 1) {
      // Last step - show review
      setShowReview(true)
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1)
    }
  }

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);

    try {
      // Verificar se o sistema está bloqueado
      const { data: configData, error: configError } = await supabase
        .from('configuracao_sistema')
        .select('valor')
        .eq('chave', 'sistema_bloqueado')
        .single();
      
      if (configError) throw configError;
      
      if (configData.valor === 'true') {
        toast({
          title: "Sistema bloqueado",
          description: "O sistema está temporariamente bloqueado para contagens",
          variant: "destructive",
        });
        setIsSubmitting(false);
        router.push("/");
        return;
      }
      
      // Encontrar nome da loja
      const loja = lojas.find(l => l.id === userData.loja);
      if (!loja) {
        toast({
          title: "Erro",
          description: "Loja não encontrada",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // Preparar registros para inserção em batch
      const registros = ativos.map(ativo => ({
        email: userData.email,
        loja: userData.loja,
        loja_nome: loja.nome,
        ativo: ativo.id,
        ativo_nome: ativo.nome,
        quantidade: contagem[ativo.id] || 0
      }));
      
      // Inserir todos os registros de uma vez
      const { error } = await supabase
        .from('contagens')
        .insert(registros);
      
      if (error) throw error;
      
      setShowReview(false);
      toast({
        title: "Contagem enviada com sucesso!",
        description: "Obrigado por completar o inventário.",
        variant: "default",
      });
      resetContagem();
      router.push("/");
    } catch (error) {
      console.error('Erro ao enviar contagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a contagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReviewItem = (id: string, value: number) => {
    setContagem(id, value)
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="z-10 w-full max-w-md"
        >
          <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold">
                Bem-vindo! Por favor, preencha as informações da loja:
              </CardTitle>
              <CardDescription className="text-zinc-400">
                {userData.lojaName} - {userData.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium">
                    Quantas caixas de {ativos[currentStep].nome} você possui na sua loja?
                  </h3>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="relative h-40 w-40 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={`/${ativos[currentStep].imagem}`}
                      alt={ativos[currentStep].nome}
                      width={160}
                      height={160}
                      className="object-contain"
                    />
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="quantidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="bg-zinc-800 border-zinc-700 text-center text-lg"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black">
                      {currentStep === ativos.length - 1 ? "Finalizar" : "Próximo"}
                      {currentStep === ativos.length - 1 ? (
                        <CheckCircle className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-sm text-zinc-500">
                Etapa {currentStep + 1} de {ativos.length}
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisão da Contagem</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Verifique se todas as quantidades estão corretas antes de enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ativos.map((ativo) => (
              <div key={ativo.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-zinc-700 rounded flex items-center justify-center overflow-hidden">
                    <Image
                      src={`/${ativo.imagem}`}
                      alt={ativo.nome}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{ativo.nome}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={contagem[ativo.id] || 0}
                    onChange={(e) => updateReviewItem(ativo.id, Number.parseInt(e.target.value) || 0)}
                    className="w-20 bg-zinc-700 border-zinc-600 text-center"
                  />
                  <Button variant="ghost" size="icon" className="text-zinc-400">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReview(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Editar
            </Button>
            <Button
              onClick={handleSubmitFinal}
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar Contagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}