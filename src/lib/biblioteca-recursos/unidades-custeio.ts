import type { PrismaClient } from "@prisma/client";

type UnidadeCusteioSeed = {
  codigo: string;
  rotulo: string;
  baseEconomica: string;
  sufixo: string;
};

// Catalogo inicial conhecido pelo sistema. A tabela permanece extensivel por empresa
// para novas unidades futuras sem alterar o contrato do Motor Operacional.
export const unidadesCusteioIniciais: UnidadeCusteioSeed[] = [
  { codigo: "CUSTO_FIXO", rotulo: "Custo fixo", baseEconomica: "CUSTO_FIXO", sufixo: "fixo" },
  { codigo: "DIA", rotulo: "R$/dia", baseEconomica: "DIA", sufixo: "dia" },
  { codigo: "HORA", rotulo: "R$/h", baseEconomica: "HORA", sufixo: "h" },
  { codigo: "KM", rotulo: "R$/km", baseEconomica: "KM", sufixo: "km" },
  { codigo: "CARGA", rotulo: "R$/carga", baseEconomica: "CARGA", sufixo: "carga" },
  { codigo: "VIAGEM", rotulo: "R$/viagem", baseEconomica: "VIAGEM", sufixo: "viagem" },
  { codigo: "M3", rotulo: "R$/m3", baseEconomica: "M3", sufixo: "m3" },
  { codigo: "M2", rotulo: "R$/m2", baseEconomica: "M2", sufixo: "m2" },
  { codigo: "TON", rotulo: "R$/t", baseEconomica: "TON", sufixo: "t" },
  { codigo: "MES", rotulo: "R$/mes", baseEconomica: "MES", sufixo: "mes" },
  { codigo: "UNIDADE", rotulo: "R$/unidade", baseEconomica: "UNIDADE", sufixo: "unidade" },
  { codigo: "VALOR_TOTAL", rotulo: "Valor total", baseEconomica: "VALOR_TOTAL", sufixo: "total" }
];

export async function ensureUnidadesCusteioIniciais(
  db: Pick<PrismaClient, "unidadeCusteio">,
  empresaId: string
) {
  const codigos = unidadesCusteioIniciais.map((unidade) => unidade.codigo);
  const existentes = await db.unidadeCusteio.findMany({
    where: {
      empresaId,
      codigo: { in: codigos }
    },
    select: { codigo: true }
  });
  const existentesSet = new Set(existentes.map((unidade) => unidade.codigo));
  const faltantes = unidadesCusteioIniciais.filter((unidade) => !existentesSet.has(unidade.codigo));

  if (!faltantes.length) return;

  await db.unidadeCusteio.createMany({
    data: faltantes.map((unidade) => ({
      empresaId,
      ...unidade
    })),
    skipDuplicates: true
  });
}
