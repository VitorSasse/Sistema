import { RoleCodigo, RoleUsuarioEmpresa, StatusCadastro } from "@prisma/client";
import { z } from "zod";
import { accessModules } from "@/lib/permissions";

const rolesSchema = z
  .array(z.nativeEnum(RoleCodigo))
  .min(1, "Selecione ao menos um perfil de acesso.");

const modulePermissionSchema = z.object({
  view: z.boolean().default(false),
  manage: z.boolean().default(false)
});

const permissoesAcessoSchema = z
  .record(z.enum(accessModules.map((module) => module.id) as [string, ...string[]]), modulePermissionSchema)
  .default({});

const roleEmpresaSchema = z.enum([
  RoleUsuarioEmpresa.ADMIN_EMPRESA,
  RoleUsuarioEmpresa.GERENTE,
  RoleUsuarioEmpresa.OPERADOR,
  RoleUsuarioEmpresa.FINANCEIRO,
  RoleUsuarioEmpresa.VISUALIZADOR
]);

const usuarioEmpresaAcessoSchema = z.object({
  empresaId: z.string().uuid("Selecione uma empresa valida."),
  roleEmpresa: roleEmpresaSchema.default(RoleUsuarioEmpresa.OPERADOR),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  padrao: z.boolean().default(false),
  modoSomenteLeitura: z.boolean().default(false),
  permissoesAcesso: permissoesAcessoSchema
});

const empresasAcessoSchema = z
  .array(usuarioEmpresaAcessoSchema)
  .optional()
  .default([])
  .superRefine((items, ctx) => {
    const empresas = new Set<string>();
    let padraoCount = 0;

    for (const [index, item] of items.entries()) {
      if (empresas.has(item.empresaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "empresaId"],
          message: "Esta empresa ja foi adicionada para o usuario."
        });
      }

      empresas.add(item.empresaId);

      if (item.padrao) {
        padraoCount += 1;
      }
    }

    if (items.length > 0 && padraoCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Defina exatamente uma empresa padrao."
      });
    }
  });

export const usuarioCreateSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um e-mail valido."),
  senha: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiuscula.")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minuscula.")
    .regex(/[0-9]/, "A senha deve conter ao menos um numero."),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO),
  roleEmpresa: roleEmpresaSchema.default(RoleUsuarioEmpresa.OPERADOR),
  roles: rolesSchema,
  modoSomenteLeitura: z.boolean().default(false),
  permissoesAcesso: permissoesAcessoSchema,
  empresasAcesso: empresasAcessoSchema
});

export const usuarioUpdateSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome do usuario."),
  email: z.string().trim().email("Informe um e-mail valido."),
  senha: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) =>
        value === undefined ||
        (/^.{8,}$/.test(value) &&
          /[A-Z]/.test(value) &&
          /[a-z]/.test(value) &&
          /[0-9]/.test(value)),
      "A nova senha deve ter 8 caracteres, incluindo maiuscula, minuscula e numero."
    ),
  status: z.nativeEnum(StatusCadastro),
  roleEmpresa: roleEmpresaSchema,
  roles: rolesSchema,
  modoSomenteLeitura: z.boolean().default(false),
  permissoesAcesso: permissoesAcessoSchema,
  empresasAcesso: empresasAcessoSchema
});
