import { CriterioControleManutencao, StatusPlanoManutencao } from "@prisma/client";
import { z } from "zod";

export const planoManutencaoSchema = z.object({
  equipamentoId: z.string().uuid(),
  tipoManutencao: z.string().trim().min(3).max(120),
  criterioControle: z.nativeEnum(CriterioControleManutencao),
  periodicidadeValor: z.number().int().positive().max(999999),
  toleranciaValor: z.number().int().min(0).max(999999).default(0),
  ultimaExecucaoEm: z.string().trim().optional().or(z.literal("")),
  ultimaLeituraHorimetro: z.union([z.number().nonnegative(), z.null()]).optional(),
  ultimaLeituraKm: z.union([z.number().nonnegative(), z.null()]).optional(),
  responsavelId: z.string().uuid().optional().nullable(),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusPlanoManutencao).default(StatusPlanoManutencao.ATIVO)
});

export type PlanoManutencaoInput = z.infer<typeof planoManutencaoSchema>;
