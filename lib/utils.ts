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
export function verificarHorarioProgramado(
  dataInicio: string,
  horaInicio: string,
  dataFim: string,
  horaFim: string
): boolean {
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) {
    return false;
  }
  
  const agora = new Date();
  const inicio = new Date(`${dataInicio}T${horaInicio}`);
  const fim = new Date(`${dataFim}T${horaFim}`);
  
  return agora >= inicio && agora <= fim;
}