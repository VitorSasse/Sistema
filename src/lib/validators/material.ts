import { StatusCadastro } from "@prisma/client";
import { z } from "zod";

export const materialSchema = z.object({
  descricao: z.string().trim().min(3).max(160),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  unidadePadrao: z.string().trim().min(1).max(20),
  densidade: z.union([z.number().nonnegative().max(999999), z.null()]).optional(),
  origemMaterial: z.string().trim().max(120).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type MaterialInput = z.infer<typeof materialSchema>;
