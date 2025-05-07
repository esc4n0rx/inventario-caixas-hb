"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { lojas } from "@/data/lojas"

// Função auxiliar para formatar a data
function formatarData(data: string | Date): string {
  const dataObj = new Date(data);
  
  // Função para adicionar zero à esquerda
  const padZero = (num: number) => num.toString().padStart(2, '0');
  
  const dia = padZero(dataObj.getDate());
  const mes = padZero(dataObj.getMonth() + 1);
  const ano = dataObj.getFullYear();
  const hora = padZero(dataObj.getHours());
  const minuto = padZero(dataObj.getMinutes());
  
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

export default function Contagens() {
  const [contagens, setContagens] = useState<any[]>([]);
  const [lojaFilter, setLojaFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchContagens();
  }, [lojaFilter]);

  const fetchContagens = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('contagens')
        .select('*')
        .order('data_registro', { ascending: false });
      
      if (lojaFilter) {
        query = query.eq('loja', lojaFilter);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setContagens(data || []);
    } catch (error) {
      console.error('Erro ao buscar contagens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="bg-[#2C2C2C] text-white border-none shadow-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex justify-between items-center">
            <span>Histórico de Contagens</span>
            <Button 
              variant="outline" 
              onClick={() => router.push("/admin")}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Voltar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <div className="w-64">
              <Select value={lojaFilter} onValueChange={setLojaFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Filtrar por loja" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="">Todas as lojas</SelectItem>
                  {lojas.map((loja) => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-8">
              <p>Carregando...</p>
            </div>
          ) : (
            <div className="rounded-md border border-zinc-700">
              <Table>
                <TableCaption>Lista das últimas contagens registradas</TableCaption>
                <TableHeader>
                  <TableRow className="border-zinc-700 hover:bg-zinc-800">
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contagens.map((registro) => (
                    <TableRow key={registro.id} className="border-zinc-700 hover:bg-zinc-800">
                      <TableCell className="font-medium">
                        {formatarData(registro.data_registro)}
                      </TableCell>
                      <TableCell>{registro.loja_nome}</TableCell>
                      <TableCell>{registro.email}</TableCell>
                      <TableCell>{registro.ativo_nome}</TableCell>
                      <TableCell className="text-right">{registro.quantidade}</TableCell>
                    </TableRow>
                  ))}
                  {contagens.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Nenhuma contagem encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}