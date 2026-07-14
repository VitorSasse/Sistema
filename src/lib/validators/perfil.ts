import { z } from "zod";
import { onlyDigits } from "@/lib/utils/document";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function optionalText(max: number, message: string) {
  return z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .or(z.literal(""))
    .transform((value) => value || null);
}

function validateAvatar(value: string | null) {
  if (!value) {
    return true;
  }

  if (/^\/api\/perfil\/foto\?v=\d+$/.test(value)) {
    return true;
  }

  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i);

  if (!match || !ALLOWED_AVATAR_MIME_TYPES.has(match[1].toLowerCase())) {
    return false;
  }

  try {
    return Buffer.from(match[2], "base64").byteLength <= MAX_AVATAR_BYTES;
  } catch {
    return false;
  }
}

export const perfilUpdateSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo.")
      .max(120, "O nome deve ter no maximo 120 caracteres."),
    email: z.string().trim().email("Informe um e-mail valido."),
    telefone: optionalText(20, "O telefone deve ter no maximo 20 caracteres."),
    fotoPerfilUrl: z
      .string()
      .nullable()
      .refine(validateAvatar, "A foto deve ser PNG, JPG, GIF ou WebP e ter no maximo 2 MB.")
  })
  .superRefine((data, context) => {
    const telefone = onlyDigits(data.telefone ?? "");

    if (telefone && ![10, 11].includes(telefone.length)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefone"],
        message: "Informe um telefone valido com DDD."
      });
    }
  });

export const alterarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha: z
      .string()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
      .regex(/[A-Z]/, "A nova senha deve conter ao menos uma letra maiuscula.")
      .regex(/[a-z]/, "A nova senha deve conter ao menos uma letra minuscula.")
      .regex(/[0-9]/, "A nova senha deve conter ao menos um numero."),
    confirmarSenha: z.string().min(1, "Confirme a nova senha.")
  })
  .superRefine((data, context) => {
    if (data.novaSenha !== data.confirmarSenha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmarSenha"],
        message: "A confirmacao deve ser igual a nova senha."
      });
    }

    if (data.senhaAtual === data.novaSenha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["novaSenha"],
        message: "A nova senha deve ser diferente da senha atual."
      });
    }
  });

export const perfilAvatarMaxBytes = MAX_AVATAR_BYTES;
