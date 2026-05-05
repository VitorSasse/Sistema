import { FuncaoColaborador, StatusCadastro } from "@prisma/client";
import { z } from "zod";
import { isValidCpf, sanitizeCpf } from "@/lib/utils/cpf";

export const colaboradorSchema = z.object({
  nome: z.string().trim().min(3).max(160),
  apelido: z.string().trim().max(80).optional().or(z.literal("")),
  funcao: z.nativeEnum(FuncaoColaborador),
  documento: z.string().trim().max(20).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  dataAdmissao: z.string().trim().optional().or(z.literal("")),
  dataSaida: z.string().trim().optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
}).superRefine((value, ctx) => {
  if (value.documento) {
    const cpf = sanitizeCpf(value.documento);

    if (cpf.length !== 11 || !isValidCpf(cpf)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: "CPF invalido."
      });
    }
  }
});

export type ColaboradorInput = z.infer<typeof colaboradorSchema>;
