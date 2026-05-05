import { OrigemLeituraEquipamento } from "@prisma/client";
import { z } from "zod";

export const leituraEquipamentoSchema = z
  .object({
    equipamentoId: z.string().uuid(),
    dataLeitura: z.string().trim().min(10),
    horimetroValor: z.union([z.number().nonnegative().max(9999999), z.null()]).optional(),
    kmValor: z.union([z.number().nonnegative().max(99999999), z.null()]).optional(),
    origem: z.nativeEnum(OrigemLeituraEquipamento).default(OrigemLeituraEquipamento.MANUAL),
    observacao: z.string().trim().max(500).optional().or(z.literal(""))
  })
  .refine((data) => data.horimetroValor !== null || data.kmValor !== null, {
    message: "Informe ao menos horimetro ou quilometragem.",
    path: ["horimetroValor"]
  });

export type LeituraEquipamentoInput = z.infer<typeof leituraEquipamentoSchema>;
