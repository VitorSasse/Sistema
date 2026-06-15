import { StatusCadastro, TipoCatalogoCompra } from "@prisma/client";
import { z } from "zod";

export const catalogoCompraSchema = z.object({
  tipo: z.nativeEnum(TipoCatalogoCompra),
  descricao: z.string().trim().min(3).max(200),
  unidadePadrao: z.string().trim().min(1).max(20),
  observacao: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.nativeEnum(StatusCadastro).default(StatusCadastro.ATIVO)
});

export type CatalogoCompraInput = z.infer<typeof catalogoCompraSchema>;
