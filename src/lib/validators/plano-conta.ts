import { StatusCadastro, TipoPlanoConta } from "@prisma/client";
import { z } from "zod";

export const planoContaSchema = z.object({
  classificacao: z
    .string()
    .trim()
    .min(1, "Informe a classificacao da conta.")
    .max(40, "A classificacao deve ter no maximo 40 caracteres."),
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome do plano de contas.")
    .max(160, "O nome deve ter no maximo 160 caracteres."),
  tipo: z.nativeEnum(TipoPlanoConta).default(TipoPlanoConta.DESPESA),
  categoria: z.string().trim().max(120).optional().or(z.literal("")),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type PlanoContaInput = z.infer<typeof planoContaSchema>;
