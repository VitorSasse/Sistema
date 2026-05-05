import { RoleCodigo, StatusCadastro } from "@prisma/client";
import { z } from "zod";

const rolesSchema = z
  .array(z.nativeEnum(RoleCodigo))
  .min(1, "Selecione ao menos um perfil de acesso.");

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
  roles: rolesSchema
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
  roles: rolesSchema
});
