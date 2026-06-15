import { StatusCadastro } from "@prisma/client";
import { z } from "zod";

export const centroCustoCompraSchema = z.object({
  nome: z.string().trim().min(3).max(160),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type CentroCustoCompraInput = z.infer<typeof centroCustoCompraSchema>;
