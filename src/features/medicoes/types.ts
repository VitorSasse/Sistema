import type { OperationalOption } from "@/lib/client/operational-options";

export type MedicaoTipo = "UNICA" | "SEMANAL" | "QUINZENAL" | "MENSAL";

export type MedicaoStatus =
  | "CRIADA"
  | "EM_ABERTO"
  | "ENVIADA_AO_CLIENTE"
  | "ENVIADA_PARA_FATURAMENTO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADA"
  | "PEDIDO_ANEXADO"
  | "NOTA_FISCAL_ANEXADA"
  | "CONCLUIDA"
  | "EM_ELABORACAO"
  | "ENVIADA"
  | "CANCELADA";

export type PreviewItem = {
  id: string;
  data: string;
  clienteId: string;
  obraId: string | null;
  servicoId: string;
  materialId: string | null;
  equipamentoId: string;
  colaboradorId: string;
  quantidadeApontada: string;
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
  observacao: string | null;
  horimetroInformado: string | null;
  kmInformado: string | null;
  ficha: { numero: string; observacao: string | null };
  obra: { nome: string } | null;
  servico: { tipoServico: string };
  material: { descricao: string } | null;
  equipamento: { descricao: string; placaOuTag: string };
  colaborador: { nome: string };
};

export type MedicaoListItem = {
  id: string;
  codigoMedicao: string;
  tipoMedicao: MedicaoTipo;
  status: MedicaoStatus;
  periodoInicial: string;
  periodoFinal: string;
  valorTotal: string;
  descontoValor: string;
  cliente: { id: string; codigo: string; nome: string };
  obra: { id: string; codigo: string; nome: string } | null;
  itens: Array<{ id: string }>;
  anexos: Array<{ id: string }>;
};

export type MedicaoDetail = {
  id: string;
  codigoMedicao: string;
  createdAt: string;
  tipoMedicao: MedicaoTipo;
  status: MedicaoStatus;
  periodoInicial: string;
  periodoFinal: string;
  valorTotal: string;
  descontoValor: string;
  observacao: string | null;
  observacaoInterna: string | null;
  fechadoEm: string | null;
  enviadaAoClienteEm: string | null;
  enviadaParaFaturamentoEm: string | null;
  aprovadaEm: string | null;
  pedidoAnexadoEm: string | null;
  notaFiscalAnexadaEm: string | null;
  cliente: {
    id: string;
    codigo: string;
    nome: string;
    cpf: string | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    cidade: string | null;
    uf: string | null;
  };
  obra: {
    id: string;
    codigo: string;
    nome: string;
    cidade: string | null;
    uf: string | null;
    localidade: string | null;
  } | null;
  itens: Array<{
    id: string;
    lancamentoId: string;
    data: string;
    ficha: string;
    placaOuTag: string;
    tipoServico: string;
    material: string | null;
    unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
    quantidadeFaturada: string;
    valorUnitario: string;
    valorTotalItem: string;
    lancamento: {
      id: string;
      clienteId: string;
      obraId: string | null;
      servicoId: string;
      materialId: string | null;
      equipamentoId: string;
      colaboradorId: string;
      quantidadeApontada: string;
      unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA";
      quantidadeFaturada: string;
      unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
      horimetroInformado: string | null;
      kmInformado: string | null;
      observacao: string | null;
      ficha: {
        numero: string;
        observacao: string | null;
      };
    };
  }>;
  anexos: Array<{
    id: string;
    tipo: "RELATORIO_MEDICAO" | "PEDIDO" | "NOTA_FISCAL" | "OUTRO";
    nomeArquivo: string;
    mimeType: string;
    urlArquivo: string;
    tamanhoBytes: number;
    createdAt: string;
  }>;
};

export type MedicaoFormState = {
  periodoInicial: string;
  periodoFinal: string;
  clienteId: string;
  obraId: string;
  tipoMedicao: MedicaoTipo;
  observacao: string;
};

export type MedicaoFilters = {
  clienteId: string;
  obraId: string;
  tipoMedicao: "" | MedicaoTipo;
  status: string;
  periodoInicial: string;
  periodoFinal: string;
};

export type MedicaoUploadState = {
  tipo: "RELATORIO_MEDICAO" | "PEDIDO" | "NOTA_FISCAL" | "OUTRO";
  file: File | null;
};

export type MedicaoEditState = {
  id: string;
  data: string;
  fichaNumero: string;
  fichaObservacao: string;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  colaboradorId: string;
  quantidadeApontada: string;
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
  observacao: string;
  horimetroInformado: string;
  kmInformado: string;
  motivoAlteracao: string;
};

export type MedicaoOptionsState = {
  clientes: OperationalOption[];
  obras: OperationalOption[];
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
};

export type MedicaoPreviewResumo = {
  totalLancamentos: number;
  quantidadeTotal: number;
  totaisPorUnidade: Partial<Record<"CARGA" | "HORA" | "M3" | "DIARIA", number>>;
};

export type MedicaoPreviewValueMap = Record<string, string>;
