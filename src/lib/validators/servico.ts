import { StatusCadastro } from "@prisma/client";
import { z } from "zod";

export const servicoSchema = z.object({
  tipoServico: z.string().trim().min(3).max(160),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  formaMedicao: z.string().trim().min(2).max(80),
  unidadeApontamento: z.string().trim().max(20).optional().or(z.literal("")),
  unidadeFaturamento: z.string().trim().min(1).max(20),
  exigeMaterial: z.boolean().default(false),
  ativoParaMedicao: z.boolean().default(true),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type ServicoInput = z.infer<typeof servicoSchema>;
