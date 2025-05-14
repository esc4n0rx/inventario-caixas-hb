import { useState } from "react";
import { Trash2, DatabaseBackup, AlertTriangle, Archive, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CleanupCard from "@/components/CleanupCard";

interface SystemMaintenanceCardProps {
  systemConfig: any;
  contagensData: any[];
  onRefresh: () => Promise<void>;
}

export default function SystemMaintenanceCard({ 
  systemConfig, 
  contagensData,
  onRefresh 
}: SystemMaintenanceCardProps) {
  const [activeTab, setActiveTab] = useState<"cleanup" | "backup">("cleanup");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const isSystemBlocked = systemConfig?.bloqueado || false;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Create a formatted date string for the filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      
      // Fetch inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('contagens')
        .select('*');
      
      if (inventoryError) throw inventoryError;
      
      // Fetch transit data
      const { data: transitData, error: transitError } = await supabase
        .from('contagens_transito')
        .select('*');
      
      if (transitError) throw transitError;
      
      // Prepare the export data
      const exportData = {
        exportDate: now.toISOString(),
        systemConfig,
        inventoryCount: inventoryData?.length || 0,
        transitCount: transitData?.length || 0,
        inventory: inventoryData || [],
        transit: transitData || []
      };
      
      // Convert to JSON string
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Create a blob and download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario-caixas-hb-${dateStr}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso.",
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Get count of inventory records
  const totalInventoryRecords = contagensData?.length || 0;
  
  return (
    <Card className="bg-zinc-800/50 border-zinc-700/50 col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DatabaseBackup className="h-5 w-5 text-[#F4C95D]" />
          <CardTitle className="text-lg font-medium">Manutenção do Sistema</CardTitle>
        </div>
        <CardDescription>
          Ferramentas para limpeza, backup e restauração do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cleanup" value={activeTab} onValueChange={(value) => setActiveTab(value as "cleanup" | "backup")}>
          <TabsList className="mb-4 bg-zinc-800 p-1">
            <TabsTrigger value="cleanup" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
              Limpeza de Dados
            </TabsTrigger>
            <TabsTrigger value="backup" className="data-[state=active]:bg-[#F4C95D] data-[state=active]:text-black">
              Backup e Exportação
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cleanup" className="mt-0 space-y-4">
            <CleanupCard systemConfig={systemConfig} onRefresh={onRefresh} />
          </TabsContent>
          
          <TabsContent value="backup" className="mt-0 space-y-4">
            <Card className="bg-zinc-800/50 border-zinc-700/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-400" />
                  <CardTitle className="text-lg font-medium">Exportar Dados</CardTitle>
                </div>
                <CardDescription>
                  Faça backup dos dados do inventário em formato JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
                      <div className="text-sm text-zinc-400">Registros de Inventário</div>
                      <div className="mt-1 text-xl font-medium">{totalInventoryRecords}</div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-zinc-700/20 border border-zinc-700/30">
                      <div className="text-sm text-zinc-400">Estado do Sistema</div>
                      <div className="mt-1">
                        {isSystemBlocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-green-700">Ativo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setShowExportDialog(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Exportar Dados do Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Dialog de exportação */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Exportar Dados do Sistema</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Esta ação exportará todos os dados atuais do sistema em formato JSON.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="bg-blue-900/20 border-blue-800/30 text-blue-400">
              <Download className="h-4 w-4" />
              <AlertTitle>Informações sobre a exportação</AlertTitle>
              <AlertDescription>
                <p className="mb-2">O arquivo exportado conterá:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Configurações atuais do sistema</li>
                  <li>Todos os registros de inventário ({totalInventoryRecords} registros)</li>
                  <li>Todos os registros de trânsito</li>
                  <li>Data e hora da exportação</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              disabled={isExporting}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isExporting ? "Exportando..." : "Confirmar Exportação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}