import { lojas } from "@/data/lojas";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata uma data em formato ISO para o formato brasileiro com hora
 * @param data - Data no formato ISO ou objeto Date
 * @returns String formatada dd/mm/aaaa hh:mm
 */
export function formatarData(data: string | Date): string {
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

/**
 * Calcula o progresso das contagens de inventário
 * @param lojasComContagem - Número de lojas que já realizaram contagem
 * @param totalLojas - Número total de lojas
 * @returns Percentual de conclusão
 */
export function calcularProgressoInventario(lojasComContagem: number, totalLojas: number): number {
  if (totalLojas === 0) return 0;
  return (lojasComContagem / totalLojas) * 100;
}

/**
 * Calcula a média de contagens por hora em um período
 * @param contagens - Array de contagens com data_registro
 * @param horasAtras - Número de horas para considerar (padrão: 24)
 * @returns Média de contagens por hora
 */
export function calcularMediaPorHora(contagens: any[], horasAtras: number = 24): number {
  // Se não há contagens, retorna 0
  if (!contagens.length) return 0;
  
  // Filtrar contagens no período
  const agora = new Date();
  const dataLimite = new Date(agora);
  dataLimite.setHours(agora.getHours() - horasAtras);
  
  // Filtrar contagens recentes
  const contagensRecentes = contagens.filter(c => {
    const dataContagem = new Date(c.data_registro);
    return dataContagem > dataLimite;
  });
  
  if (!contagensRecentes.length) return 0;
  
  // Agrupar por hora
  const contagensPorHora: Record<number, number> = {};
  
  contagensRecentes.forEach(c => {
    const data = new Date(c.data_registro);
    const hora = data.getHours();
    
    if (!contagensPorHora[hora]) {
      contagensPorHora[hora] = 0;
    }
    
    contagensPorHora[hora]++;
  });
  
  // Calcular média
  const horas = Object.keys(contagensPorHora).length;
  const totalContagens = Object.values(contagensPorHora).reduce((a, b) => a + b, 0);
  
  return totalContagens / (horas || 1);
}

/**
 * Verifica se um horário está entre início e fim
 * @param dataInicio - Data de início (YYYY-MM-DD)
 * @param horaInicio - Hora de início (HH:MM)
 * @param dataFim - Data de fim (YYYY-MM-DD)
 * @param horaFim - Hora de fim (HH:MM)
 * @returns true se o horário atual está dentro do período
 */

/**
+ * Gera um número aleatório inteiro entre min e max (inclusivos)
+ * @param min - Valor mínimo
+ * @param max - Valor máximo
+ * @returns Número aleatório
+ */
export function gerarNumeroAleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gera uma data aleatória a partir de uma data de início
 * @param dataInicio - Data de início (timestamp ou objeto Date)
 * @returns Data aleatória
 */

export function gerarDataAleatoria(dataInicio: number | Date): Date {
  const inicio = typeof dataInicio === "number" ? new Date(dataInicio) : dataInicio;
  const agora = Date.now();
  const diff = agora - inicio.getTime();
  const aleatorio = Math.floor(Math.random() * diff);
  return new Date(inicio.getTime() + aleatorio);
}

/**
+ * Gera um e-mail fictício para testes baseado no ID da loja
+ * @param lojaId - ID da loja
+ * @param dominio - Domínio do e-mail (padrão: hortifruti.com.br)
+ * @returns E-mail fictício
+ */
export function gerarEmailTeste(lojaId: string, dominio: string = "hortifruti.com.br"): string {
  const prefixos = ["teste", "contagem", "inventario", "admin", "sistema"];
  const prefixo = prefixos[Math.floor(Math.random() * prefixos.length)];
  return `${prefixo}.${lojaId}@${dominio}`;
}
/**
+ * Retorna o nome da loja a partir do ID
+ */
export function getNomeLoja(lojaId: string): string {
  return lojas.find(l => l.id === lojaId)?.nome || `Loja ${lojaId}`;
 }


 /**
 * Helper function for system scheduling
 * 
 * Checks if the current time is within the scheduled time window
 * Fixed version of verificarHorarioProgramado that correctly handles date and time comparison
 */
export function verificarHorarioProgramado(
  dataInicio: string,
  horaInicio: string,
  dataFim: string,
  horaFim: string
): boolean {
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    return false;
  }
  
  try {
    const agora = new Date();
    const inicio = new Date(`${dataInicio}T${horaInicio}`);
    const fim = new Date(`${dataFim}T${horaFim}`);
    
    // Current time is within the range if it's greater than or equal to start
    // and less than or equal to end
    return agora >= inicio && agora <= fim;
  } catch (error) {
    console.error('Erro ao verificar horário programado:', error);
    return false; // In case of any date parsing errors, return false
  }
}

/**
 * Check if system should be automatically blocked or unblocked based on schedule
 * 
 * This function is used by system status checker to periodically update system state
 */
export async function verificarEAtualizarBloqueioAutomatico(supabase: any) {
  try {
    // Get current system configuration
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*');
    
    if (error) throw error;
    
    // Convert array of config items to a simple object
    const config: { [key: string]: string } = {};
    data.forEach((item: { chave: string; valor: string }) => {
      config[item.chave] = item.valor;
    });
    
    // If system is not in automatic mode, do nothing
    if (config['sistema_modo'] !== 'automatico') {
      return {
        success: true,
        message: 'Sistema em modo manual, nenhuma ação tomada',
        status: 'manual'
      };
    }
    
    // Check if current time is within the scheduled window
    const dentroDoHorario = verificarHorarioProgramado(
      config['data_inicio'],
      config['hora_inicio'],
      config['data_fim'],
      config['hora_fim']
    );
    
    // Should be blocked if NOT within the scheduled window
    const deveBloqueado = !dentroDoHorario;
    const statusAtual = config['sistema_bloqueado'] === 'true';
    
    // If current status doesn't match what it should be, update it
    if (statusAtual !== deveBloqueado) {
      const { error: updateError } = await supabase
        .from('configuracao_sistema')
        .update({ 
          valor: deveBloqueado.toString(),
          data_modificacao: new Date().toISOString()
        })
        .eq('chave', 'sistema_bloqueado');
      
      if (updateError) throw updateError;
      
      return { 
        success: true, 
        message: `Sistema ${deveBloqueado ? 'bloqueado' : 'desbloqueado'} automaticamente`,
        status: deveBloqueado ? 'blocked' : 'unblocked',
        schedule: {
          dataInicio: config['data_inicio'],
          horaInicio: config['hora_inicio'],
          dataFim: config['data_fim'],
          horaFim: config['hora_fim'],
          dentroDoHorario
        }
      };
    }
    
    // Status is already correct, no need to update
    return { 
      success: true, 
      message: 'Status já está correto, nenhuma ação necessária',
      status: deveBloqueado ? 'blocked' : 'unblocked',
      schedule: {
        dataInicio: config['data_inicio'],
        horaInicio: config['hora_inicio'],
        dataFim: config['data_fim'],
        horaFim: config['hora_fim'],
        dentroDoHorario
      }
    };
  } catch (error) {
    console.error('Erro ao verificar e atualizar status do sistema:', error);
    return { 
      success: false,
      error: 'Erro ao verificar e atualizar status do sistema'
    };
  }
}