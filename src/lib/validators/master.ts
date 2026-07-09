import { RoleCodigo, RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const empresaMasterSchema = z.object({
  nomeFantasia: z.string().trim().min(2, "Informe o nome fantasia da empresa."),
  razaoSocial: optionalText,
  cnpj: optionalText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.string().email().safeParse(value).success, "Informe um e-mail valido."),
  telefone: optionalText,
  endereco: optionalText,
  cidade: optionalText,
  estado: optionalText,
  cep: optionalText,
  logoUrl: optionalText,
  corPrimaria: optionalText,
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  plano: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "PADRAO")
});

export const usuarioEmpresaMasterCreateSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um e-mail valido."),
  senha: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula.")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula.")
    .regex(/[0-9]/, "A senha deve conter ao menos um numero."),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  roleEmpresa: z.enum([
    RoleUsuarioEmpresa.ADMIN_EMPRESA,
    RoleUsuarioEmpresa.GERENTE,
    RoleUsuarioEmpresa.OPERADOR,
    RoleUsuarioEmpresa.FINANCEIRO,
    RoleUsuarioEmpresa.VISUALIZADOR
  ])
});

export const usuarioEmpresaMasterUpdateSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do usuario.").optional(),
  email: z.string().trim().email("Informe um e-mail valido.").optional(),
  senha: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) =>
        value === undefined ||
        (/^.{8,}$/.test(value) && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value)),
      "A nova senha deve ter 8 caracteres, incluindo maiuscula, minuscula e numero."
    ),
  status: z.nativeEnum(StatusCadastro).optional(),
  roleEmpresa: z
    .enum([
      RoleUsuarioEmpresa.ADMIN_EMPRESA,
      RoleUsuarioEmpresa.GERENTE,
      RoleUsuarioEmpresa.OPERADOR,
      RoleUsuarioEmpresa.FINANCEIRO,
      RoleUsuarioEmpresa.VISUALIZADOR
    ])
    .optional()
});

export function roleLegadaPorRoleEmpresa(roleEmpresa: RoleUsuarioEmpresa): RoleCodigo {
  const mapa: Record<RoleUsuarioEmpresa, RoleCodigo> = {
    MASTER: RoleCodigo.ADMIN,
    ADMIN_EMPRESA: RoleCodigo.ADMIN,
    GERENTE: RoleCodigo.GESTOR,
    OPERADOR: RoleCodigo.OPERACIONAL,
    FINANCEIRO: RoleCodigo.FINANCEIRO,
    VISUALIZADOR: RoleCodigo.CONSULTA
  };

  return mapa[roleEmpresa];
}
