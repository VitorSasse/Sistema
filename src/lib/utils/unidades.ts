export type UnidadeApontada = "CARGA" | "HORA" | "M3";
export type UnidadeFaturada = UnidadeApontada | "DIARIA";

export const unidadeLabels: Record<UnidadeFaturada, string> = {
  CARGA: "Carga",
  HORA: "Hora",
  M3: "M3",
  DIARIA: "Diaria"
};

export function formatUnidade(unidade: UnidadeFaturada) {
  return unidadeLabels[unidade] ?? unidade;
}

export function formatQuantidadeComUnidade(
  quantidade: string | number,
  unidade: UnidadeFaturada
) {
  return `${quantidade} ${formatUnidade(unidade)}`;
}
