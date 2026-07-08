import { StatusCadastro } from "@prisma/client";
import { z } from "zod";
import { isValidCnpj, normalizeDocument } from "@/lib/utils/document";

export const fornecedorSchema = z
  .object({
    razaoSocial: z.string().trim().min(3).max(160),
    nomeFantasia: z.string().trim().max(160).optional().or(z.literal("")),
    cnpj: z.string().trim().max(20).optional().or(z.literal("")),
    inscricaoEstadual: z.string().trim().max(30).optional().or(z.literal("")),
    telefone: z.string().trim().max(20).optional().or(z.literal("")),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    enderecoLinha1: z.string().trim().max(160).optional().or(z.literal("")),
    enderecoNumero: z.string().trim().max(20).optional().or(z.literal("")),
    enderecoLinha2: z.string().trim().max(160).optional().or(z.literal("")),
    bairro: z.string().trim().max(80).optional().or(z.literal("")),
    cidade: z.string().trim().max(80).optional().or(z.literal("")),
    uf: z.string().trim().length(2).optional().or(z.literal("")),
    cep: z.string().trim().max(12).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
    status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
  })
  .superRefine((data, ctx) => {
    const cnpj = normalizeDocument(data.cnpj || "");

    if (cnpj && !isValidCnpj(cnpj)) {
      ctx.addIssue({
        code: "custom",
        path: ["cnpj"],
        message: "CNPJ invalido."
      });
    }
  });

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
