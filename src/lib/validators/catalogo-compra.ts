import { StatusCadastro, TipoCatalogoCompra } from "@prisma/client";
import { z } from "zod";

const tipoCatalogoCompraSchema = z.union([
  z.literal(TipoCatalogoCompra.PRODUTO),
  z.literal(TipoCatalogoCompra.SERVICO)
]);

export const catalogoCompraSchema = z.object({
  tipo: tipoCatalogoCompraSchema,
  descricao: z.string().trim().min(3).max(200),
  unidadePadrao: z.string().trim().min(1).max(20),
  valorPadrao: z.number().nonnegative().max(999999999).default(0),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type CatalogoCompraInput = z.infer<typeof catalogoCompraSchema>;
