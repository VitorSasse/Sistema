import { StatusCadastro, TipoCliente } from "@prisma/client";
import { z } from "zod";
import { isValidCnpj, isValidCpf, normalizeDocument } from "@/lib/utils/document";

export const clienteSchema = z
  .object({
  tipoCliente: z.nativeEnum(TipoCliente),
  nome: z.string().trim().min(3).max(160),
  nomeFantasia: z.string().trim().max(160).optional().or(z.literal("")),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")),
  inscricaoEstadual: z.string().trim().max(30).optional().or(z.literal("")),
  contatoNome: z.string().trim().max(120).optional().or(z.literal("")),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  enderecoLinha1: z.string().trim().max(160).optional().or(z.literal("")),
  enderecoLinha2: z.string().trim().max(160).optional().or(z.literal("")),
  bairro: z.string().trim().max(80).optional().or(z.literal("")),
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  uf: z.string().trim().length(2).optional().or(z.literal("")),
  cep: z.string().trim().max(12).optional().or(z.literal("")),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
  })
  .superRefine((data, ctx) => {
    if (data.tipoCliente === "CPF") {
      const cpf = normalizeDocument(data.cpf || "");
      if (!cpf) {
        ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF e obrigatorio." });
      } else if (!isValidCpf(cpf)) {
        ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF invalido." });
      }
    }

    if (data.tipoCliente === "CNPJ") {
      const cnpj = normalizeDocument(data.cnpj || "");
      if (!cnpj) {
        ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ e obrigatorio." });
      } else if (!isValidCnpj(cnpj)) {
        ctx.addIssue({ code: "custom", path: ["cnpj"], message: "CNPJ invalido." });
      }
    }
  });

export type ClienteInput = z.infer<typeof clienteSchema>;
