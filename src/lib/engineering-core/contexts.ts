export const CONTEXTOS_DE_CALCULO = [
  "ORCAMENTO",
  "PLANEJAMENTO_EXECUTIVO",
  "EXECUCAO",
  "SIMULACAO"
] as const;

export type ContextoDeCalculo = (typeof CONTEXTOS_DE_CALCULO)[number];

export function isContextoDeCalculo(value: unknown): value is ContextoDeCalculo {
  return typeof value === "string" && CONTEXTOS_DE_CALCULO.includes(value as ContextoDeCalculo);
}
