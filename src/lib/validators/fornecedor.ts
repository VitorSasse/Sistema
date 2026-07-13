import { z } from "zod";
import { isValidCnpj, normalizeDocument } from "@/lib/utils/document";

export const fornecedorSchema = z
  .object({
    razaoSocial: z
      .string()
      .trim()
      .min(1, "O campo Razao Social e obrigatorio.")
      .min(3, "A Razao Social deve possuir pelo menos 3 caracteres.")
      .max(160, "A Razao Social deve possuir no maximo 160 caracteres."),
    nomeFantasia: z.string().trim().max(160, "O Nome Fantasia deve possuir no maximo 160 caracteres.").optional().or(z.literal("")),
    cnpj: z.string().trim().max(20, "O CNPJ possui um formato invalido.").optional().or(z.literal("")),
    inscricaoEstadual: z.string().trim().max(30, "A Inscricao Estadual deve possuir no maximo 30 caracteres.").optional().or(z.literal("")),
    telefone: z.string().trim().max(20, "O campo Telefone esta em formato invalido.").optional().or(z.literal("")),
    email: z
      .string()
      .trim()
      .email("O campo E-mail possui um formato invalido.")
      .max(160, "O campo E-mail deve possuir no maximo 160 caracteres.")
      .optional()
      .or(z.literal("")),
    enderecoLinha1: z.string().trim().max(160, "O Endereco Principal deve possuir no maximo 160 caracteres.").optional().or(z.literal("")),
    enderecoNumero: z.string().trim().max(20, "O Numero deve possuir no maximo 20 caracteres.").optional().or(z.literal("")),
    enderecoLinha2: z.string().trim().max(160, "O Complemento deve possuir no maximo 160 caracteres.").optional().or(z.literal("")),
    bairro: z.string().trim().max(80, "O Bairro deve possuir no maximo 80 caracteres.").optional().or(z.literal("")),
    cidade: z.string().trim().max(80, "A Cidade deve possuir no maximo 80 caracteres.").optional().or(z.literal("")),
    uf: z
      .string()
      .trim()
      .refine((value) => value === "" || value.length === 2, "Informe uma UF valida com 2 letras."),
    cep: z.string().trim().max(12, "O campo CEP esta em formato invalido.").optional().or(z.literal("")),
    observacao: z.string().trim().max(500, "A Observacao deve possuir no maximo 500 caracteres.").optional().or(z.literal("")),
    status: z.enum(["ATIVO", "INATIVO"]).default("ATIVO")
  })
  .superRefine((data, ctx) => {
    const cnpj = normalizeDocument(data.cnpj || "");
    const telefone = normalizeDocument(data.telefone || "");
    const cep = normalizeDocument(data.cep || "");

    if (cnpj && !isValidCnpj(cnpj)) {
      ctx.addIssue({
        code: "custom",
        path: ["cnpj"],
        message: "Informe um CNPJ valido."
      });
    }

    if (telefone && ![10, 11].includes(telefone.length)) {
      ctx.addIssue({
        code: "custom",
        path: ["telefone"],
        message: "O campo Telefone esta em formato invalido."
      });
    }

    if (cep && cep.length !== 8) {
      ctx.addIssue({
        code: "custom",
        path: ["cep"],
        message: "Informe um CEP valido com 8 digitos."
      });
    }
  });

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
