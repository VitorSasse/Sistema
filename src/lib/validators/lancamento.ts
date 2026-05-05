import { z } from "zod";

const unidadeApontadaSchema = z.enum(["CARGA", "HORA", "M3"]);
const unidadeFaturadaSchema = z.enum(["CARGA", "HORA", "M3", "DIARIA"]);

export const lancamentoSchema = z.object({
  data: z.string().trim().min(1),
  fichaNumero: z.string().trim().min(1).max(40),
  clienteId: z.string().uuid(),
  obraId: z.string().uuid().optional().nullable(),
  servicoId: z.string().uuid(),
  materialId: z.string().uuid().optional().nullable(),
  equipamentoId: z.string().uuid(),
  colaboradorId: z.string().uuid(),
  quantidadeApontada: z.union([z.number().positive(), z.string().trim().min(1)]),
  unidadeApontada: unidadeApontadaSchema,
  quantidadeFaturada: z.union([z.number().positive(), z.string().trim().min(1)]),
  unidadeFaturada: unidadeFaturadaSchema,
  horimetroInformado: z.union([z.number().nonnegative(), z.null()]).optional(),
  kmInformado: z.union([z.number().nonnegative(), z.null()]).optional(),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  fichaObservacao: z.string().trim().max(500).optional().or(z.literal(""))
});

export type LancamentoInput = z.infer<typeof lancamentoSchema>;
