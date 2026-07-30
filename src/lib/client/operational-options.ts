import { performanceFetch } from "@/lib/performance/client";

export type OperationalOption = {
  id: string;
  codigo?: string;
  codigoMaterial?: string;
  nome?: string;
  descricao?: string;
  razaoSocial?: string;
  nomeFantasia?: string | null;
  tipoServico?: string;
  placaOuTag?: string;
  naturezaRecurso?: string;
  tipoRecurso?: string;
  classeOperacional?: string | null;
  descricaoOperacional?: string | null;
  capacidadeM3?: string | number | null;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: string | null;
  custoPadrao?: string | number | null;
  permitirEdicaoOrcamento?: boolean;
  caracteristicasTecnicas?: Record<string, unknown> | null;
  status: string;
  clienteId?: string;
  liberadaParaLancamento?: boolean;
  natureza?: string;
  usarEmOrcamentos?: boolean;
  usarEmFichas?: boolean;
  usarEmMedicoes?: boolean;
  usarEmFaturamento?: boolean;
  exigeMaterial?: boolean;
  servicoTecnico?: boolean;
  faturamentoFechado?: boolean;
  valorFechadoPadrao?: string | null;
  unidadeApontamento?: string | null;
  unidadeFaturamento?: string | null;
};

export type OperationalOptionsPayload = {
  clientes: OperationalOption[];
  obras: OperationalOption[];
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
  fornecedores?: OperationalOption[];
};

export async function loadOperationalOptions() {
  const response = await performanceFetch("loadOperationalOptions", "/api/opcoes/operacionais", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as opcoes operacionais.");
  }

  return (await response.json()) as OperationalOptionsPayload;
}
