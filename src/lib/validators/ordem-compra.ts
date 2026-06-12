import { StatusOrdemCompra, TipoCentroCustoOrdemCompra } from "@prisma/client";
import { z } from "zod";

const ordemCompraItemSchema = z.object({
  item: z.string().trim().min(1).max(80),
  codigo: z.string().trim().max(60).optional().or(z.literal("")),
  descricao: z.string().trim().min(3).max(240),
  unidade: z.string().trim().min(1).max(20),
  quantidade: z.number().positive().max(999999),
  valorUnitario: z.number().nonnegative().max(999999999)
});

export const ordemCompraSchema = z
  .object({
    dataEmissao: z.string().trim().min(1),
    status: z.nativeEnum(StatusOrdemCompra).default(StatusOrdemCompra.ABERTA),
    fornecedorId: z.string().uuid(),
    centroCustoTipo: z.nativeEnum(TipoCentroCustoOrdemCompra),
    centroCustoNome: z.string().trim().min(2).max(160),
    centroCustoEquipamentoId: z.string().uuid().optional().nullable().or(z.literal("")),
    formaPagamento: z.string().trim().max(80).optional().or(z.literal("")),
    numeroParcelas: z.number().int().positive().max(60).default(1),
    primeiroVencimento: z.string().trim().optional().or(z.literal("")),
    observacaoFinanceira: z.string().trim().max(500).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
    itens: z.array(ordemCompraItemSchema).min(1)
  })
  .superRefine((data, ctx) => {
    if (
      data.centroCustoTipo === TipoCentroCustoOrdemCompra.EQUIPAMENTO &&
      !data.centroCustoEquipamentoId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["centroCustoEquipamentoId"],
        message: "Selecione o equipamento do centro de custo."
      });
    }
  });

export type OrdemCompraInput = z.infer<typeof ordemCompraSchema>;
