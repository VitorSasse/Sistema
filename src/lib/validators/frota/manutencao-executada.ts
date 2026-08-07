import { TipoItemManutencaoExecutada } from "@prisma/client";
import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const itemManutencaoExecutadaSchema = z
  .object({
    tipo: z.nativeEnum(TipoItemManutencaoExecutada),
    descricao: z.string().trim().min(2).max(180),
    quantidade: z.union([z.number().nonnegative().max(999999), z.null()]).optional(),
    unidade: optionalText(30),
    observacao: optionalText(500)
  })
  .transform((item) => ({
    ...item,
    unidade: item.tipo === TipoItemManutencaoExecutada.SERVICO ? null : item.unidade?.trim() || null,
    observacao: item.observacao?.trim() || null,
    quantidade: item.tipo === TipoItemManutencaoExecutada.SERVICO ? null : item.quantidade ?? null
  }));

export const manutencaoExecutadaSchema = z.object({
  equipamentoId: z.string().uuid(),
  planoId: z.string().uuid().optional().nullable(),
  agendaId: z.string().uuid().optional().nullable(),
  dataExecucao: z.string().trim().min(10),
  tipoManutencao: z.string().trim().min(2).max(120),
  descricaoServico: z.string().trim().min(2).max(500),
  horimetroMomento: z.union([z.number().nonnegative(), z.null()]).optional(),
  kmMomento: z.union([z.number().nonnegative(), z.null()]).optional(),
  fornecedorOficina: optionalText(160),
  custo: z.union([z.number().nonnegative(), z.null()]).optional(),
  observacao: optionalText(1000),
  executadoPorId: z.string().uuid().optional().nullable(),
  itensServicos: z.array(itemManutencaoExecutadaSchema).default([])
});

export type ManutencaoExecutadaInput = z.input<typeof manutencaoExecutadaSchema>;
export type ManutencaoExecutadaParsed = z.output<typeof manutencaoExecutadaSchema>;
