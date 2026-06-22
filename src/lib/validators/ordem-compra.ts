import { StatusOrdemCompra, TipoCatalogoCompra, TipoCentroCustoOrdemCompra } from "@prisma/client";
import { z } from "zod";
import { obterFormaPagamentoOrdemCompra } from "@/lib/ordens-compra-pagamento";

const ordemCompraItemSchema = z.object({
  catalogoCompraId: z.string().uuid().optional().nullable().or(z.literal("")),
  item: z.string().trim().min(1).max(80),
  codigo: z.string().trim().max(60).optional().or(z.literal("")),
  descricao: z.string().trim().min(3).max(240),
  unidade: z.string().trim().min(1).max(20),
  quantidade: z.number().positive().max(999999),
  valorUnitario: z.number().nonnegative().max(999999999),
  subtotal: z.number().nonnegative().max(999999999)
});

export const ordemCompraSchema = z
  .object({
    dataEmissao: z.string().trim().min(1),
    status: z.nativeEnum(StatusOrdemCompra).default(StatusOrdemCompra.ABERTA),
    tipoCompra: z.nativeEnum(TipoCatalogoCompra).default(TipoCatalogoCompra.PRODUTO),
    fornecedorId: z.string().uuid(),
    centroCustoId: z.string().uuid(),
    planoContaId: z.string().trim().min(1, "Selecione o plano de conta."),
    centroCustoTipo: z
      .nativeEnum(TipoCentroCustoOrdemCompra)
      .default(TipoCentroCustoOrdemCompra.SETOR),
    centroCustoNome: z.string().trim().min(2).max(160),
    formaPagamento: z.string().trim().min(1).max(80),
    numeroParcelas: z.number().int().positive().max(60).default(1),
    primeiroVencimento: z.string().trim().optional().or(z.literal("")),
    solicitanteNome: z.string().trim().max(160).optional().or(z.literal("")),
    observacaoFinanceira: z.string().trim().max(500).optional().or(z.literal("")),
    observacao: z.string().trim().max(500).optional().or(z.literal("")),
    motivoExclusao: z.string().trim().max(500).optional().or(z.literal("")),
    itens: z.array(ordemCompraItemSchema).min(1)
  })
  .superRefine((data, context) => {
    const formaPagamento = obterFormaPagamentoOrdemCompra(data.formaPagamento);

    if (!formaPagamento) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["formaPagamento"],
        message: "Selecione uma forma de pagamento valida."
      });
    }

    if (formaPagamento && !formaPagamento.permiteParcelamento && data.numeroParcelas > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeroParcelas"],
        message: "A forma de pagamento selecionada nao permite parcelamento."
      });
    }

    if (formaPagamento?.permiteParcelamento && !data.primeiroVencimento?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primeiroVencimento"],
        message: "Informe o primeiro vencimento para pagamentos parcelados."
      });
    }

    if (data.status === StatusOrdemCompra.CANCELADA && !data.motivoExclusao?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["motivoExclusao"],
        message: "Informe o motivo da exclusao para cancelar a ordem."
      });
    }
  });

export type OrdemCompraInput = z.infer<typeof ordemCompraSchema>;
