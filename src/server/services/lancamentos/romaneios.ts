import { Prisma } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient;

export async function substituirRomaneiosDaFicha(
  tx: PrismaTx,
  fichaId: string,
  numeros: string[]
) {
  await tx.fichaRomaneio.deleteMany({
    where: { fichaId }
  });

  if (numeros.length === 0) {
    return;
  }

  await tx.fichaRomaneio.createMany({
    data: numeros.map((numero) => ({
      fichaId,
      numero
    }))
  });
}

export async function adicionarRomaneiosNaFichaSeAusentes(
  tx: PrismaTx,
  fichaId: string,
  numeros: string[]
) {
  if (numeros.length === 0) {
    return;
  }

  const existentes = await tx.fichaRomaneio.findMany({
    where: { fichaId },
    select: { numero: true }
  });

  const usados = new Set(existentes.map((item) => item.numero));
  const novos = numeros.filter((numero) => !usados.has(numero));

  if (novos.length === 0) {
    return;
  }

  await tx.fichaRomaneio.createMany({
    data: novos.map((numero) => ({
      fichaId,
      numero
    }))
  });
}
