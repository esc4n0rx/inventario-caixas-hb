"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Leaf } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const router = useRouter()
  const { toast } = useToast()
  const { setUserData, isBlocked } = useStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loja: "",
      email: "",
    },
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setUserData({
      loja: values.loja,
      email: values.email,
      lojaName: lojas.find((l) => l.id === values.loja)?.nome || "",
    })
    setShowConfirmation(true)
  }

  const handleConfirm = () => {
    setShowConfirmation(false)
    router.push("/contagem")
  }

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
        className="z-10 w-full max-w-md"
      >
        <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
          <CardHeader className="space-y-1 items-center text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="text-2xl font-bold flex items-center">
                <span className="text-white">Colheita</span>
                <span className="text-[#F4C95D]">Certa</span>
                <Leaf className="h-6 w-6 ml-1 text-[#6DC267] fill-[#6DC267]" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Inventário Caixas HB</CardTitle>
            <CardDescription className="text-zinc-400">
              Selecione sua loja e informe seu email para iniciar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isBlocked ? (
              <div className="text-center p-4 bg-red-900/30 rounded-md">
                <p className="text-white font-medium">Contagem temporariamente desativada.</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="loja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecione a Loja</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue placeholder="Selecione uma loja" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {lojas.map((loja) => (
                              <SelectItem key={loja.id} value={loja.id}>
                                {loja.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu.email@hortifruti.com.br"
                            {...field}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
                    disabled={isBlocked}
                  >
                    Iniciar Contagem
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Confirmar Informações</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Verifique se os dados estão corretos antes de prosseguir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">Loja</p>
              <p>{lojas.find((l) => l.id === form.getValues().loja)?.nome}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-400">Email</p>
              <p>{form.getValues().email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Editar
            </Button>
            <Button onClick={handleConfirm} className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
