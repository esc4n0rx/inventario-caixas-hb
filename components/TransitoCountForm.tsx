import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Send, Truck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ativos } from "@/data/ativos";
import { supabase } from '@/lib/supabase';
import { useStore } from "@/lib/store";

/*
 * 🚚 TransitoCountForm
 *
 * Resumo: Componente de várias etapas pra contar caixas em trânsito.
 *        Se o usuário disser que não tem trânsito, pula tudo e marca como concluído.
 *        Se tiver, exibe um wizard que percorre cada ativo, coleta quantidades,
 *        valida com Zod, e no final envia tudo pro Supabase, com toast pra feedback.
 *        (Sim, esse troço é enorme — culpa do produto que quis tudo em um só file 😅)
 */

interface TransitoCountFormProps {
  onComplete: () => void;
  onSkip: () => void;
}


export function TransitoCountForm({ onComplete, onSkip }: TransitoCountFormProps) {
  // controla se o user clicou no "Sim, possuo trânsito"
  const [hasTransito, setHasTransito] = useState(false);
  // etapa atual do loop de ativos (wizard dev edition)
  const [currentStep, setCurrentStep] = useState(0);
  // trava o botão Finalizar enquanto o supabase tá respondendo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  // pegando dados globais: user info, contagem armazenada, setters e flags
  const { 
    userData, 
    contagemTransito, 
    setContagemTransito, 
    resetContagemTransito,
    setTransitoCompleted
  } = useStore();

  // schema Zod forçando número >= 0 (nada de quantidades negativas, por favor)
  const formSchema = z.object({
    quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa"),
  });

  // react-hook-form + zod pra validar na veia
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      // preenche com valor existente ou 0
      quantidade: contagemTransito[ativos[currentStep]?.id] || 0,
    },
  });

  // passo 1: perguntar se tem trânsito
  if (!hasTransito) {
    return (
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-6 w-6 text-[#F4C95D]" />
            <CardTitle className="text-xl font-bold">Contagem de Trânsito</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            {userData.lojaName} - {userData.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <h3 className="text-lg mb-6">Possui alguma caixa em trânsito?</h3>
          <div className="flex justify-center gap-4">
            {/* sim: começa o wizard */}
            <Button 
              onClick={() => setHasTransito(true)} 
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
            >
              Sim, possuo
            </Button>
            {/* não: reseta tudo e manda pular */}
            <Button 
              onClick={() => {
                resetContagemTransito();
                setTransitoCompleted(true);
                onSkip();
              }} 
              variant="outline" 
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Não possuo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // passo 2: para cada ativo, exibe imagem e input
  if (currentStep < ativos.length) {
    // quando o user clica em Próximo/Finalizar
    const handleSubmitStep = (values: z.infer<typeof formSchema>) => {
      // salvando no store local (Zustand) antes de avançar
      setContagemTransito(ativos[currentStep].id, values.quantidade);

      // se for o último ativo, manda finalizar
      if (currentStep === ativos.length - 1) {
        handleSubmitFinal();
      } else {
        // senão, vai pro próximo passo e ajusta o input
        setCurrentStep(currentStep + 1);
        form.setValue("quantidade", contagemTransito[ativos[currentStep + 1]?.id] || 0);
      }
    };

    return (
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-6 w-6 text-[#F4C95D]" />
            <CardTitle className="text-xl font-bold">Contagem de Trânsito</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            {userData.lojaName} - {userData.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">
                Quantas caixas de {ativos[currentStep].nome} estão em trânsito?
              </h3>
            </div>

            {/* imagem do ativo atual */}
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

            {/* formulário de quantidade */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmitStep)} className="space-y-4">
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
                <Button type="submit" disabled={isSubmitting} className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black">
                  {currentStep === ativos.length - 1 ? "Finalizar" : "Próximo"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
        {/* indicativo de progresso — porque dev também gosta de saber onde tá */}
        <CardFooter className="flex justify-between pt-2">
          <div className="text-sm text-zinc-500">
            Etapa {currentStep + 1} de {ativos.length}
          </div>
        </CardFooter>
      </Card>
    );
  }

  // função que manda de vez pro Supabase
  async function handleSubmitFinal() {
    // ativa loading state
    setIsSubmitting(true);

    try {
      // buscando config do sistema para checar bloqueio (porque ninguém é perfeito)
      const { data: configData, error: configError } = await supabase
        .from('configuracao_sistema')
        .select('valor')
        .eq('chave', 'sistema_bloqueado')
        .single();

      if (configError) throw configError;

      // se o sistema tá bloqueado, avisa e sai do fluxo
      if (configData.valor === 'true') {
        toast({
          title: "Sistema bloqueado",
          description: "O sistema está temporariamente bloqueado para contagens",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // monta registros pra inserir — lista de objetos feia, mas faz o job
      const registros = ativos.map(ativo => ({
        email: userData.email,
        loja: userData.loja,
        loja_nome: userData.lojaName,
        ativo: ativo.id,
        ativo_nome: ativo.nome,
        quantidade: contagemTransito[ativo.id] || 0
      }));

      // grava no Supabase
      const { error } = await supabase
        .from('contagens_transito')
        .insert(registros);

      if (error) throw error;

      // marca como concluído e avisa o usuário
      setTransitoCompleted(true);
      toast({
        title: "Contagem de trânsito registrada!",
        description: "Agora vamos para a contagem de estoque.",
      });

      onComplete();
    } catch (error) {
      // loga no console (pra dev olhar no inspect) e mostra toast de erro
      console.error('Erro ao registrar contagem de trânsito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a contagem de trânsito. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      // independente do que rolou, libera o botão de novo
      setIsSubmitting(false);
    }
  }

  // esse componente não renderiza nada quando tudo termina — só roda nos bastidores mesmo
  return null;
}
