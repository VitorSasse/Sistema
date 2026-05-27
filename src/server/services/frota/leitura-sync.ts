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
  const [horimetroMaximo, kmMaximo] = await Promise.all([
    tx.leituraEquipamento.aggregate({
      where: {
        equipamentoId,
        horimetroValor: { not: null }
      },
      _max: {
        horimetroValor: true
      }
    }),
    tx.leituraEquipamento.aggregate({
      where: {
        equipamentoId,
        kmValor: { not: null }
      },
      _max: {
        kmValor: true
      }
    })
  ]);

  await tx.equipamento.update({
    where: { id: equipamentoId },
    data: {
      horimetroAtual: horimetroMaximo._max.horimetroValor ?? null,
      kmAtual: kmMaximo._max.kmValor ?? null
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
