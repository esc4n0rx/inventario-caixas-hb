// app/admin/contagens/page.tsx (versão atualizada)
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, FileText, Download, Truck, Home } from "lucide-react"
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { lojas } from "@/data/lojas"
import { useToast } from "@/components/ui/use-toast"

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
  const [contagensTransito, setContagensTransito] = useState<any[]>([]);
  const [lojaFilter, setLojaFilter] = useState("todas");
  const [activeTab, setActiveTab] = useState("estoque");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchContagens();
    if (activeTab === "transito") {
      fetchContagensTransito();
    }
  }, [lojaFilter, activeTab]);

  const fetchContagens = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('contagens')
        .select('*')
        .order('data_registro', { ascending: false });
      
      if (lojaFilter && lojaFilter !== "todas") {
        query = query.eq('loja', lojaFilter);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setContagens(data || []);
    } catch (error) {
      console.error('Erro ao buscar contagens:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contagens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContagensTransito = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('contagens_transito')
        .select('*')
        .order('data_registro', { ascending: false });
      
      if (lojaFilter && lojaFilter !== "todas") {
        query = query.eq('loja', lojaFilter);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      setContagensTransito(data || []);
    } catch (error) {
      console.error('Erro ao buscar contagens de trânsito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contagens de trânsito",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      
      // Determinar qual conjunto de dados exportar
      const dataToExport = activeTab === "estoque" ? contagens : contagensTransito;
      const filePrefix = activeTab === "estoque" ? "contagens" : "contagens_transito";
      
      // Preparar cabeçalhos do CSV
      const headers = ["ID", "Loja", "Email", "Ativo", "Quantidade", "Data"];
      
      // Preparar linhas de dados
      const rows = dataToExport.map(item => [
        item.id,
        item.loja_nome,
        item.email,
        item.ativo_nome,
        item.quantidade,
        formatarData(item.data_registro)
      ]);
      
      // Combinar tudo em uma string CSV
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");
      
      // Criar um objeto Blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Criar um link para download
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV foi baixado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
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

      <div className="z-10 w-full max-w-6xl">
        <Card className="bg-[#2C2C2C] text-white border-none shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center">
              <FileText className="h-6 w-6 mr-2 text-[#F4C95D]" />
              <CardTitle className="text-xl font-bold">
                Histórico de Contagens
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="border-zinc-700 text-white hover:bg-zinc-800"
                onClick={() => router.push("/admin")}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={exportToCSV}
                disabled={isExporting || 
                  (activeTab === "estoque" && contagens.length === 0) || 
                  (activeTab === "transito" && contagensTransito.length === 0)}
                className="bg-[#F4C95D] hover:bg-[#e5bb4e] text-black"
              >
                <Download className="mr-1 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="estoque" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList className="bg-zinc-800">
                  <TabsTrigger value="estoque" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
                    <Home className="mr-1 h-4 w-4" />
                    Contagens de Estoque
                  </TabsTrigger>
                  <TabsTrigger value="transito" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
                    <Truck className="mr-1 h-4 w-4" />
                    Contagens de Trânsito
                  </TabsTrigger>
                </TabsList>

                <div className="w-64">
                  <Select value={lojaFilter} onValueChange={setLojaFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Filtrar por loja" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="todas">Todas as lojas</SelectItem>
                      {lojas.map((loja) => (
                        <SelectItem key={loja.id} value={loja.id}>
                          {loja.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="estoque" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
                    <p className="ml-2">Carregando...</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-700 overflow-hidden">
                    <Table>
                      <TableCaption>Lista das últimas contagens de estoque registradas</TableCaption>
                      <TableHeader>
                        <TableRow className="border-zinc-700 hover:bg-zinc-800">
                          <TableHead className="text-zinc-400">Data</TableHead>
                          <TableHead className="text-zinc-400">Loja</TableHead>
                          <TableHead className="text-zinc-400">Email</TableHead>
                          <TableHead className="text-zinc-400">Ativo</TableHead>
                          <TableHead className="text-zinc-400 text-right">Quantidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contagens.map((registro) => (
                          <TableRow key={registro.id} className="border-zinc-700 hover:bg-zinc-800/50">
                            <TableCell className="font-medium">
                              {formatarData(registro.data_registro)}
                            </TableCell>
                            <TableCell>{registro.loja_nome}</TableCell>
                            <TableCell>{registro.email}</TableCell>
                            <TableCell>{registro.ativo_nome}</TableCell>
                            <TableCell className="text-right">
                              <span className="bg-zinc-800 px-2 py-1 rounded font-mono">
                                {registro.quantidade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {contagens.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-zinc-400">
                              Nenhuma contagem encontrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="transito" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#F4C95D] border-r-2 border-b-2 border-transparent"></div>
                    <p className="ml-2">Carregando...</p>
                  </div>
                ) : (
                  <div className="rounded-md border border-zinc-700 overflow-hidden">
                    <Table>
                      <TableCaption>Lista das últimas contagens de trânsito registradas</TableCaption>
                      <TableHeader>
                        <TableRow className="border-zinc-700 hover:bg-zinc-800">
                          <TableHead className="text-zinc-400">Data</TableHead>
                          <TableHead className="text-zinc-400">Loja</TableHead>
                          <TableHead className="text-zinc-400">Email</TableHead>
                          <TableHead className="text-zinc-400">Ativo</TableHead>
                          <TableHead className="text-zinc-400 text-right">Quantidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contagensTransito.map((registro) => (
                          <TableRow key={registro.id} className="border-zinc-700 hover:bg-zinc-800/50">
                            <TableCell className="font-medium">
                              {formatarData(registro.data_registro)}
                            </TableCell>
                            <TableCell>{registro.loja_nome}</TableCell>
                            <TableCell>{registro.email}</TableCell>
                            <TableCell>{registro.ativo_nome}</TableCell>
                            <TableCell className="text-right">
                              <span className="bg-zinc-800 px-2 py-1 rounded font-mono">
                                {registro.quantidade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {contagensTransito.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-zinc-400">
                              Nenhuma contagem de trânsito encontrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}