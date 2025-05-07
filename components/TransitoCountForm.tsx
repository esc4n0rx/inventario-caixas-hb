// components/TransitoCountForm.tsx (versão melhorada)
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

interface TransitoCountFormProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TransitoCountForm({ onComplete, onSkip }: TransitoCountFormProps) {
  const [hasTransito, setHasTransito] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { 
    userData, 
    contagemTransito, 
    setContagemTransito, 
    resetContagemTransito,
    setTransitoCompleted
  } = useStore();

  const formSchema = z.object({
    quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantidade: contagemTransito[ativos[currentStep]?.id] || 0,
    },
  });

  // Se o usuário não tem caixas em trânsito
  if (!hasTransito) {
    return (
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-6 w-6 text-[#F4C95D]" />
            <CardTitle className="text-xl font-bold">
              Contagem de Trânsito
            </CardTitle>
          </div>
          <CardDescription className="text-zinc-400">
            {userData.lojaName} - {userData.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <h3 className="text-lg mb-6">Possui alguma caixa em trânsito?</h3>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => setHasTransito(true)} 
              className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
            >
              Sim, possuo
            </Button>
            <Button 
              onClick={() => {
                // Marcar como completo mas sem contagem
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

  // Contagem item por item (usando a mesma abordagem da contagem principal)
  if (currentStep < ativos.length) {
    const handleSubmitStep = (values: z.infer<typeof formSchema>) => {
      // Salvar contagem do item atual
      setContagemTransito(ativos[currentStep].id, values.quantidade);
      
      if (currentStep === ativos.length - 1) {
        // Último item - enviar contagem
        handleSubmitFinal();
      } else {
        // Avançar para o próximo item
        setCurrentStep(currentStep + 1);
        // Atualizar form com o valor do próximo item
        form.setValue("quantidade", contagemTransito[ativos[currentStep + 1]?.id] || 0);
      }
    };

    return (
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-6 w-6 text-[#F4C95D]" />
            <CardTitle className="text-xl font-bold">
              Contagem de Trânsito
            </CardTitle>
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
                <Button type="submit" className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black">
                  {currentStep === ativos.length - 1 ? "Finalizar" : "Próximo"}
                  <ArrowRight className="ml-2 h-4 w-4" />
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
    );
  }

  async function handleSubmitFinal() {
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
        return;
      }
      
      // Preparar registros para inserção em batch
      const registros = ativos.map(ativo => ({
        email: userData.email,
        loja: userData.loja,
        loja_nome: userData.lojaName,
        ativo: ativo.id,
        ativo_nome: ativo.nome,
        quantidade: contagemTransito[ativo.id] || 0
      }));
      
      // Inserir todos os registros de uma vez
      const { error } = await supabase
        .from('contagens_transito')
        .insert(registros);
      
      if (error) throw error;
      
      setTransitoCompleted(true);
      toast({
        title: "Contagem de trânsito registrada!",
        description: "Agora vamos para a contagem de estoque.",
      });
      
      // Chamar callback de conclusão
      onComplete();
    } catch (error) {
      console.error('Erro ao registrar contagem de trânsito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a contagem de trânsito. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Esse retorno nunca deve ser alcançado se a lógica estiver correta
  return null;
}