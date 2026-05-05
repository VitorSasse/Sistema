import { OrigemLeituraEquipamento, Prisma } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient;

type SyncFromLancamentoInput = {
  equipamentoId: string;
  lancamentoDiarioId: string;
  usuarioId: string;
  dataLeitura: Date;
  horimetroInformado?: number | null;
  kmInformado?: number | null;
  observacao?: string | null;
};

export async function recalcularAcumuladoEquipamento(tx: PrismaTx, equipamentoId: string) {
  const ultimaLeitura = await tx.leituraEquipamento.findFirst({
    where: { equipamentoId },
    orderBy: [{ dataLeitura: "desc" }, { createdAt: "desc" }]
  });

  await tx.equipamento.update({
    where: { id: equipamentoId },
    data: {
      horimetroAtual: ultimaLeitura?.horimetroValor ?? null,
      kmAtual: ultimaLeitura?.kmValor ?? null
    }
  });
}

export async function sincronizarLeituraPorLancamento(
  tx: PrismaTx,
  input: SyncFromLancamentoInput
) {
  if (input.horimetroInformado == null && input.kmInformado == null) {
    await tx.leituraEquipamento.deleteMany({
      where: { lancamentoDiarioId: input.lancamentoDiarioId }
    });
    await recalcularAcumuladoEquipamento(tx, input.equipamentoId);
    return;
  }

  const leituraAnterior = await tx.leituraEquipamento.findFirst({
    where: {
      equipamentoId: input.equipamentoId,
      lancamentoDiarioId: { not: input.lancamentoDiarioId }
    },
    orderBy: [{ dataLeitura: "desc" }, { createdAt: "desc" }]
  });

  if (
    input.horimetroInformado != null &&
    leituraAnterior?.horimetroValor != null &&
    input.horimetroInformado < Number(leituraAnterior.horimetroValor)
  ) {
    throw new Error("Leitura de horimetro inconsistente. O valor nao pode regredir.");
  }

  if (
    input.kmInformado != null &&
    leituraAnterior?.kmValor != null &&
    input.kmInformado < Number(leituraAnterior.kmValor)
  ) {
    throw new Error("Leitura de quilometragem inconsistente. O valor nao pode regredir.");
  }

  await tx.leituraEquipamento.upsert({
    where: { lancamentoDiarioId: input.lancamentoDiarioId },
    update: {
      equipamentoId: input.equipamentoId,
      dataLeitura: input.dataLeitura,
      horimetroValor: input.horimetroInformado ?? null,
      kmValor: input.kmInformado ?? null,
      origem: OrigemLeituraEquipamento.LANCAMENTO_DIARIO,
      usuarioId: input.usuarioId,
      observacao: input.observacao ?? null
    },
    create: {
      equipamentoId: input.equipamentoId,
      lancamentoDiarioId: input.lancamentoDiarioId,
      dataLeitura: input.dataLeitura,
      horimetroValor: input.horimetroInformado ?? null,
      kmValor: input.kmInformado ?? null,
      origem: OrigemLeituraEquipamento.LANCAMENTO_DIARIO,
      usuarioId: input.usuarioId,
      observacao: input.observacao ?? null
    }
  });

  await recalcularAcumuladoEquipamento(tx, input.equipamentoId);
}

export async function removerLeituraPorCancelamento(
  tx: PrismaTx,
  equipamentoId: string,
  lancamentoDiarioId: string
) {
  await tx.leituraEquipamento.deleteMany({
    where: { lancamentoDiarioId }
  });

  await recalcularAcumuladoEquipamento(tx, equipamentoId);
}
