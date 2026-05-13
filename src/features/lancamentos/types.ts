import type { OperationalOption } from "@/lib/client/operational-options";

export type LancamentoStatus =
  | "VALIDO"
  | "PENDENTE_OBRA"
  | "PENDENTE_PRECO"
  | "DIVERGENTE"
  | "MEDIDO"
  | "CANCELADO";

export type LancamentoItem = {
  id: string;
  data: string;
  quantidadeApontada: string;
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
  horimetroInformado: string | null;
  kmInformado: string | null;
  statusValidacao: LancamentoStatus;
  observacao: string | null;
  ficha: { numero: string };
  cliente: { nome: string };
  obra: { nome: string } | null;
  servico: { tipoServico: string };
  material: { descricao: string } | null;
  equipamento: { descricao: string; placaOuTag: string };
  colaborador: { nome: string };
};

export type LancamentoFormState = {
  data: string;
  fichaNumero: string;
  fichaObservacao: string;
  clienteId: string;
  obraId: string;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  colaboradorId: string;
  quantidadeApontada: string;
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
  horimetroInformado: string;
  kmInformado: string;
  observacao: string;
};

export type HorarioApontamentoState = {
  inicioServico: string;
  saidaAlmoco: string;
  retornoAlmoco: string;
  fimServico: string;
};

export type HorarioApontamentoFeedback = {
  tone: "idle" | "success" | "error";
  message: string;
};

export type LancamentoOptionsState = {
  clientes: OperationalOption[];
  obras: OperationalOption[];
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
};
