import type {
  MedicaoFilters,
  MedicaoFormState,
  MedicaoStatus,
  MedicaoTipo,
  MedicaoUploadState
} from "@/features/medicoes/types";

export const initialMedicaoForm: MedicaoFormState = {
  periodoInicial: "",
  periodoFinal: "",
  clienteId: "",
  obraId: "",
  tipoMedicao: "QUINZENAL",
  observacao: ""
};

export const initialMedicaoFilters: MedicaoFilters = {
  clienteId: "",
  obraId: "",
  tipoMedicao: "",
  status: "",
  periodoInicial: "",
  periodoFinal: "",
  numeroPedido: "",
  numeroNotaFiscal: ""
};

export const initialMedicaoUpload: MedicaoUploadState = {
  tipo: "RELATORIO_MEDICAO",
  file: null
};

export const medicaoStatusOptions: MedicaoStatus[] = [
  "CRIADA",
  "EM_ABERTO",
  "ENVIADA_AO_CLIENTE",
  "ENVIADA_PARA_FATURAMENTO",
  "CONCLUIDA"
];

export const medicaoStatusLabels: Record<MedicaoStatus, string> = {
  CRIADA: "Criada",
  EM_ABERTO: "Em aberto",
  ENVIADA_AO_CLIENTE: "Enviado para cliente",
  ENVIADA_PARA_FATURAMENTO: "Enviado para faturamento",
  AGUARDANDO_APROVACAO: "Enviado para cliente",
  APROVADA: "Enviado para faturamento",
  PEDIDO_ANEXADO: "Enviado para faturamento",
  NOTA_FISCAL_ANEXADA: "Enviado para faturamento",
  CONCLUIDA: "Concluida",
  EM_ELABORACAO: "Em aberto",
  ENVIADA: "Enviado para cliente",
  CANCELADA: "Cancelada"
};

export const medicaoStatusClasses: Record<MedicaoStatus, string> = {
  CRIADA: "badge badge-info",
  EM_ABERTO: "badge badge-warn",
  ENVIADA_AO_CLIENTE: "badge badge-info",
  ENVIADA_PARA_FATURAMENTO: "badge badge-neutral",
  AGUARDANDO_APROVACAO: "badge badge-neutral",
  APROVADA: "badge badge-neutral",
  PEDIDO_ANEXADO: "badge badge-neutral",
  NOTA_FISCAL_ANEXADA: "badge badge-neutral",
  CONCLUIDA: "badge badge-success",
  EM_ELABORACAO: "badge badge-warn",
  ENVIADA: "badge badge-info",
  CANCELADA: "badge badge-danger"
};

export const medicaoTipoLabels: Record<MedicaoTipo, string> = {
  UNICA: "Unica",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal"
};

export const medicaoTipoClasses: Record<MedicaoTipo, string> = {
  UNICA: "badge badge-neutral",
  SEMANAL: "badge badge-info",
  QUINZENAL: "badge badge-info",
  MENSAL: "badge badge-success"
};
