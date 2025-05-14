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



export function verificarHorarioProgramado(
  dataInicio: string,
  horaInicio: string,
  dataFim: string,
  horaFim: string
): boolean {
  console.log("verificarHorarioProgramado - Parâmetros recebidos:", {
    dataInicio,
    horaInicio,
    dataFim,
    horaFim
  });
  
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    console.log("verificarHorarioProgramado - Parâmetros incompletos, retornando false");
    return false;
  }
  
  try {
    const agora = new Date();
    console.log(`verificarHorarioProgramado - Horário atual: ${agora.toISOString()}`);
    
    // Parse start and end times
    const inicio = new Date(`${dataInicio}T${horaInicio}`);
    const fim = new Date(`${dataFim}T${horaFim}`);
    
    console.log(`verificarHorarioProgramado - Início: ${inicio.toISOString()}`);
    console.log(`verificarHorarioProgramado - Fim: ${fim.toISOString()}`);
    
    // Check for valid dates
    if (isNaN(inicio.getTime())) {
      console.error(`verificarHorarioProgramado - Data de início inválida: ${dataInicio}T${horaInicio}`);
      return false;
    }
    
    if (isNaN(fim.getTime())) {
      console.error(`verificarHorarioProgramado - Data de fim inválida: ${dataFim}T${horaFim}`);
      return false;
    }
    
    // Current time is within the range if it's after or equal to start
    // and before or equal to end
    const agoraTimestamp = agora.getTime();
    const inicioTimestamp = inicio.getTime();
    const fimTimestamp = fim.getTime();
    
    console.log(`verificarHorarioProgramado - Timestamp atual: ${agoraTimestamp}`);
    console.log(`verificarHorarioProgramado - Timestamp início: ${inicioTimestamp}`);
    console.log(`verificarHorarioProgramado - Timestamp fim: ${fimTimestamp}`);
    
    const maiorQueInicio = agoraTimestamp >= inicioTimestamp;
    const menorQueFim = agoraTimestamp <= fimTimestamp;
    const isWithinRange = maiorQueInicio && menorQueFim;
    
    console.log(`verificarHorarioProgramado - É maior que início? ${maiorQueInicio}`);
    console.log(`verificarHorarioProgramado - É menor que fim? ${menorQueFim}`);
    console.log(`verificarHorarioProgramado - Está dentro do intervalo? ${isWithinRange}`);
    
    return isWithinRange;
  } catch (error) {
    console.error('verificarHorarioProgramado - Erro ao verificar horário:', error);
    return false; // In case of any date parsing errors, return false
  }
}