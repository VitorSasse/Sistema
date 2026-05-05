export type OperationalOption = {
  id: string;
  codigo?: string;
  codigoMaterial?: string;
  nome?: string;
  descricao?: string;
  tipoServico?: string;
  placaOuTag?: string;
  status: "ATIVO" | "INATIVO";
  clienteId?: string;
  liberadaParaLancamento?: boolean;
  exigeMaterial?: boolean;
};

export type OperationalOptionsPayload = {
  clientes: OperationalOption[];
  obras: OperationalOption[];
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
};

export async function loadOperationalOptions() {
  const response = await fetch("/api/opcoes/operacionais", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar as opcoes operacionais.");
  }

  return (await response.json()) as OperationalOptionsPayload;
}
