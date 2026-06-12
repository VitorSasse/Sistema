export const CENTROS_CUSTO_SETORIAIS = [
  "OFICINA",
  "ADMINISTRATIVO",
  "ALMOXARIFADO",
  "OPERACAO GERAL"
] as const;

export type CentroCustoSetorial = (typeof CENTROS_CUSTO_SETORIAIS)[number];
