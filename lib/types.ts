export interface Inventario {
  id: string
  codigo: string
  data_inicio: string
  data_fim: string | null
  responsavel: string
  status: "ativo" | "finalizado"
  progresso: {
    lojas: number
    setores: number
    fornecedores: number
  }
  // Manter compatibilidade com código existente
  dataInicio?: string
  dataFim?: string
}

export interface Contagem {
  id: string
  inventarioId: string
  tipo: "loja" | "setor" | "fornecedor"
  origem: string
  destino?: string
  ativo: string
  quantidade: number
  dataContagem: string
  responsavel: string
  // Campos para contagem em trânsito diretamente na contagem principal
  // Usado quando a origem é CD SP ou CD ES
  transito_ativo?: string 
  transito_quantidade?: number
  transito_responsavel?: string
}

export interface DadosTransito {
  id: string
  inventarioId: string
  origem: string
  destino: string
  ativo: string
  quantidade: number
  dataEnvio: string
  dataRecebimento?: string
  status: "enviado" | "recebido" | "pendente"
}

export interface Fornecedor {
  id: string
  nome: string
  localizacao: string
  contato: string
}

export interface Relatorio {
  id: string
  inventarioId: string
  dataGeracao: string
  tipo: "atual" | "comparativo"
  dados: any
}
