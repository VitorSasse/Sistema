import { z } from "zod";

export const medicaoPreviewSchema = z.object({
  periodoInicial: z.string().trim().min(1),
  periodoFinal: z.string().trim().min(1),
  clienteId: z.string().uuid(),
  obraId: z.string().uuid().optional().nullable(),
  tipoMedicao: z.enum(["UNICA", "SEMANAL", "QUINZENAL", "MENSAL"]),
  observacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export const medicaoCreateSchema = medicaoPreviewSchema.extend({
  itens: z
    .array(
      z.object({
        lancamentoId: z.string().uuid(),
        valorUnitario: z.number().min(0)
      })
    )
    .min(1)
});

export const medicaoStatusSchema = z.object({
  status: z.enum([
    "EM_ABERTO",
    "ENVIADA_AO_CLIENTE",
    "ENVIADA_PARA_FATURAMENTO",
    "CONCLUIDA"
  ])
});

export type MedicaoPreviewInput = z.infer<typeof medicaoPreviewSchema>;
export type MedicaoCreateInput = z.infer<typeof medicaoCreateSchema>;
