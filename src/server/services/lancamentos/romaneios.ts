import { Prisma } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient;

export async function substituirRomaneiosDoLancamento(
  tx: PrismaTx,
  lancamentoId: string,
  numeros: string[]
) {
  await tx.lancamentoRomaneio.deleteMany({
    where: { lancamentoId }
  });

  if (numeros.length === 0) {
    return;
  }

  await tx.lancamentoRomaneio.createMany({
    data: numeros.map((numero) => ({
      lancamentoId,
      numero
    }))
  });
}

export async function listarRomaneiosLegadosDaFicha(
  tx: PrismaTx,
  fichaId: string
) {
  return tx.fichaRomaneio.findMany({
    where: { fichaId, deletedAt: null },
    orderBy: { numero: "asc" },
    select: { numero: true }
  });
}
