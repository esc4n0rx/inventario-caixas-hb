"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Edit2, CheckCircle, Package2 } from "lucide-react"

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
import { SelectCdCountType } from "@/components/SelectCdCountType"
import { TransitoCountForm } from "@/components/TransitoCountForm"

const formSchema = z.object({
  quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa"),
})

export default function Contagem() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCdTypeModal, setShowCdTypeModal] = useState(false)
  const [showTransitoCount, setShowTransitoCount] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { 
    userData, 
    contagem, 
    setContagem, 
    resetContagem, 
    isBlocked, 
    checkSystemStatus, 
    checkLojaStatus,
    countType,
    setCountType,
    transitoCompleted,
    setTransitoCompleted
  } = useStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantidade: contagem[ativos[currentStep]?.id] || 0,
    },
  })

  const isCdLocation = userData?.lojaName === "CD ES" || userData?.lojaName === "CD SP"
  console.log("isCdLocation:", isCdLocation)
  const APP_VERSION = "1.2.0"; // Versão do sistema

  useEffect(() => {
    checkSystemStatus();
    

    if (!userData.loja || !userData.email) {
      router.push("/")
      return
    }

    if (isBlocked) {
      toast({
        title: "Sistema bloqueado",
        description: "O sistema está temporariamente bloqueado para contagens",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    const verificarLoja = async () => {
      const lojaJaContou = await checkLojaStatus(userData.loja);
      if (lojaJaContou) {
        toast({
          title: "Loja já realizou contagem",
          description: "Esta loja já enviou uma contagem e não pode enviar novamente",
          variant: "destructive",
        });
        router.push("/");
        return;
      }
    };
    verificarLoja();

    if (isCdLocation && !countType && !transitoCompleted) {
      setShowCdTypeModal(true);
    }

    if (ativos[currentStep]) {
      form.setValue("quantidade", contagem[ativos[currentStep].id] || 0);
    }
  }, [currentStep, userData, router, form, contagem, isBlocked, checkSystemStatus, toast, countType, isCdLocation, transitoCompleted])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setContagem(ativos[currentStep].id, values.quantidade)

    if (currentStep === ativos.length - 1) {
      
      setShowReview(true)
    } else {

      setCurrentStep(currentStep + 1)
    }
  }

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
  
    try {
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
  
      const { data: contagemData, count } = await supabase
        .from('contagens')
        .select('id', { count: 'exact' })
        .eq('loja', userData.loja)
        .limit(1);
      
      if (count !== null && count > 0) {
        toast({
          title: "Loja já realizou contagem",
          description: "Esta loja já enviou uma contagem e não pode enviar novamente",
          variant: "destructive",
        });
        setIsSubmitting(false);
        router.push("/");
        return;
      }
      
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
      
      const registros = ativos.map(ativo => ({
        email: userData.email,
        loja: userData.loja,
        loja_nome: loja.nome,
        ativo: ativo.id,
        ativo_nome: ativo.nome,
        quantidade: contagem[ativo.id] || 0
      }));
      
      // Inserir contagem principal
      const { error } = await supabase
        .from('contagens')
        .insert(registros);
      
      if (error) throw error;
      
      setShowReview(false);
  
      // Para CD SP ou CD ES, verificar se precisa fazer contagem de trânsito
      if (isCdLocation && countType === "estoque" && !transitoCompleted) {
        setShowTransitoCount(true);
        setIsSubmitting(false);
        return;
      }
  
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
  }

  const updateReviewItem = (id: string, value: number) => {
    setContagem(id, value);
  }

  const handleCdTypeSelection = (type: "estoque" | "transito") => {
    setCountType(type);
    setShowCdTypeModal(false);

    if (type === "transito") {
      setShowTransitoCount(true);
    }
  };

  const handleTransitoComplete = () => {
    setShowTransitoCount(false);
    setTransitoCompleted(true);
  };

  if (showTransitoCount) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage: "url('/fundo-login.png')",
            opacity: 0.2,
          }}
        />
        <div className="z-10 w-full max-w-xl">
          <TransitoCountForm 
            onComplete={handleTransitoComplete} 
            onSkip={handleTransitoComplete}
          />
        </div>
      </div>
    );
  }

  const ProgressBar = () => {
    const progress = ((currentStep + 1) / ativos.length) * 100;
    return (
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
        <div 
          className="h-full bg-[#F4C95D]" 
          style={{ width: `${progress}%` }}
        />
      </div>
    );
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="z-10 w-full max-w-xl"
        >
          <Card className="bg-[#2C2C2C] text-white border-none shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="space-y-2 pb-6 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <Package2 className="h-7 w-7 text-[#F4C95D]" />
                <CardTitle className="text-2xl font-bold">
                  {isCdLocation && (
                    <div className="mb-1 text-[#F4C95D] text-base font-medium">
                      {countType === "estoque" ? "Contagem de Estoque do CD" : ""}
                      {transitoCompleted && countType === "transito" ? "Contagem de Estoque do CD" : ""}
                    </div>
                  )}
                  Contagem de Caixas
                </CardTitle>
              </div>
              <CardDescription className="text-zinc-400 text-base">
                {userData.lojaName} - {userData.email}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-8 pb-8">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-medium">
                    Quantas caixas de {ativos[currentStep]?.nome} você possui na sua loja?
                  </h3>
                </div>

                <div className="flex justify-center mb-8">
                  <div className="relative h-52 w-52 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shadow-md border border-zinc-700/30">
                    {ativos[currentStep] && (
                      <Image
                        src={`/${ativos[currentStep].imagem}`}
                        alt={ativos[currentStep].nome}
                        width={200}
                        height={200}
                        className="object-contain"
                      />
                    )}
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="quantidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Quantidade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              className="bg-zinc-800 border-zinc-700 text-center text-xl font-medium h-14"
                            />
                          </FormControl>
                          <FormMessage className="text-base" />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-14 text-lg font-medium"
                    >
                      {currentStep === ativos.length - 1 ? "Finalizar" : "Próximo"}
                      {currentStep === ativos.length - 1 ? (
                        <CheckCircle className="ml-2 h-5 w-5" />
                      ) : (
                        <ArrowRight className="ml-2 h-5 w-5" />
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col px-8 py-4 bg-zinc-900/50 border-t border-zinc-800">
              <div className="w-full flex justify-between items-center mb-2">
                <div className="text-base font-medium text-white">
                  Etapa {currentStep + 1} de {ativos.length}
                </div>
                <div className="text-zinc-400">
                  {Math.round(((currentStep + 1) / ativos.length) * 100)}%
                </div>
              </div>
              <ProgressBar />
              <div className="w-full flex justify-center mt-3">
                <p className="text-zinc-500 text-xs">ColheitaCerta v{APP_VERSION}</p>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl">Revisão da Contagem</DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Verifique se todas as quantidades estão corretas antes de enviar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {ativos.map((ativo) => (
              <div key={ativo.id} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-800/80 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-600/50">
                    <Image
                      src={`/${ativo.imagem}`}
                      alt={ativo.nome}
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-lg">{ativo.nome}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Input
                    type="number"
                    value={contagem[ativo.id] || 0}
                    onChange={(e) => updateReviewItem(ativo.id, Number.parseInt(e.target.value) || 0)}
                    className="w-24 h-12 bg-zinc-700 border-zinc-600 text-center text-lg font-medium"
                  />
                  <Button variant="ghost" size="icon" className="text-zinc-400 h-10 w-10 rounded-full hover:bg-zinc-700">
                    <Edit2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setShowReview(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800 h-12"
            >
              Editar
            </Button>
            <Button
              onClick={handleSubmitFinal}
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black h-12 px-6 text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar Contagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SelectCdCountType
        open={showCdTypeModal}
        onOpenChange={setShowCdTypeModal}
        onSelectType={handleCdTypeSelection}
      />
    </div>
  )
}