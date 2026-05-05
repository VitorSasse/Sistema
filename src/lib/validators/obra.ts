import { StatusCadastro } from "@prisma/client";
import { z } from "zod";

export const obraSchema = z.object({
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(3).max(160),
  contratoNumero: z.string().trim().max(50).optional().or(z.literal("")),
  localidade: z.string().trim().max(120).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  uf: z.string().trim().length(2).optional().or(z.literal("")),
  dataInicio: z.string().trim().optional().or(z.literal("")),
  dataFim: z.string().trim().optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  liberadaParaLancamento: z.boolean().default(true)
});

export type ObraInput = z.infer<typeof obraSchema>;
