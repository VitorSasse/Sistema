import type {
  HorarioApontamentoFeedback,
  HorarioApontamentoState,
  LancamentoFormState,
  LancamentoStatus
} from "@/features/lancamentos/types";

export const initialLancamentoForm: LancamentoFormState = {
  data: new Date().toISOString().slice(0, 10),
  fichaNumero: "",
  fichaObservacao: "",
  clienteId: "",
  obraId: "",
  servicoId: "",
  materialId: "",
  equipamentoId: "",
  colaboradorId: "",
  quantidadeApontada: "",
  unidadeApontada: "HORA",
  quantidadeFaturada: "",
  unidadeFaturada: "HORA",
  horimetroInformado: "",
  kmInformado: "",
  observacao: ""
};

export const unidadeApontadaOptions = [
  { value: "CARGA", label: "Carga" },
  { value: "HORA", label: "Hora" },
  { value: "M3", label: "M3" }
] as const;

export const unidadeFaturadaOptions = [
  { value: "CARGA", label: "Carga" },
  { value: "HORA", label: "Hora" },
  { value: "M3", label: "M3" },
  { value: "DIARIA", label: "Diaria" }
] as const;

export const lancamentoStatusConfig: Record<
  LancamentoStatus,
  { label: string; className: string }
> = {
  VALIDO: { label: "Valido", className: "badge badge-success" },
  PENDENTE_OBRA: { label: "Pendente obra", className: "badge badge-warn" },
  PENDENTE_PRECO: { label: "Pendente preco", className: "badge badge-danger" },
  DIVERGENTE: { label: "Divergente", className: "badge badge-danger" },
  MEDIDO: { label: "Medido", className: "badge badge-info" },
  CANCELADO: { label: "Cancelado", className: "badge badge-neutral" }
};

export const emptyLancamentoOptions = {
  clientes: [],
  obras: [],
  servicos: [],
  materiais: [],
  equipamentos: [],
  colaboradores: []
};

export const initialHorarioApontamentoState: HorarioApontamentoState = {
  inicioServico: "",
  saidaAlmoco: "",
  retornoAlmoco: "",
  fimServico: ""
};

export const emptyHorarioApontamentoFeedback: HorarioApontamentoFeedback = {
  tone: "idle",
  message: ""
};
