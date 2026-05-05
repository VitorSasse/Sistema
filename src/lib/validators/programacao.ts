import { StatusAgendaProgramacao, TurnoAgendaProgramacao } from "@prisma/client";
import { z } from "zod";

export const programacaoSchema = z
  .object({
    equipamentoId: z.string().trim().uuid(),
    obraId: z.string().trim().uuid().optional().or(z.literal("")),
    local: z.string().trim().max(160).optional().or(z.literal("")),
    dataInicio: z.string().trim().min(10),
    dataFim: z.string().trim().min(10),
    turno: z.nativeEnum(TurnoAgendaProgramacao).optional().nullable(),
    status: z.nativeEnum(StatusAgendaProgramacao).default(StatusAgendaProgramacao.PROGRAMADO),
    observacoes: z.string().trim().max(500).optional().or(z.literal(""))
  })
  .superRefine((input, ctx) => {
    if (!input.obraId && !input.local) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione uma obra ou informe o local da programacao.",
        path: ["obraId"]
      });
    }

    if (input.dataFim < input.dataInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A data final nao pode ser menor que a data inicial.",
        path: ["dataFim"]
      });
    }
  });

export type ProgramacaoInput = z.infer<typeof programacaoSchema>;
