export type FormaPagamentoOrdemCompra = {
  valor: string;
  rotulo: string;
  permiteParcelamento: boolean;
  liquidacaoImediata: boolean;
  prazoEmDias?: number;
};

export const FORMAS_PAGAMENTO_ORDEM_COMPRA: FormaPagamentoOrdemCompra[] = [
  {
    valor: "PIX",
    rotulo: "PIX",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "DINHEIRO",
    rotulo: "Dinheiro",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "TRANSFERENCIA",
    rotulo: "Transferencia",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "CARTAO_DEBITO",
    rotulo: "Cartao de debito",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "CARTAO_CREDITO_1X",
    rotulo: "Cartao de credito 1x",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 30
  },
  {
    valor: "CARTAO_CREDITO_PARCELADO",
    rotulo: "Cartao de credito parcelado",
    permiteParcelamento: true,
    liquidacaoImediata: false
  },
  {
    valor: "BOLETO_A_VISTA",
    rotulo: "Boleto a vista",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "BOLETO_15_DIAS",
    rotulo: "Boleto 15 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 15
  },
  {
    valor: "BOLETO_28_DIAS",
    rotulo: "Boleto 28 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 28
  },
  {
    valor: "BOLETO_30_DIAS",
    rotulo: "Boleto 30 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 30
  },
  {
    valor: "BOLETO_PARCELADO",
    rotulo: "Boleto parcelado",
    permiteParcelamento: true,
    liquidacaoImediata: false
  },
  {
    valor: "FATURADO_15_DIAS",
    rotulo: "Faturado 15 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 15
  },
  {
    valor: "FATURADO_28_DIAS",
    rotulo: "Faturado 28 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 28
  },
  {
    valor: "FATURADO_30_DIAS",
    rotulo: "Faturado 30 dias",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 30
  },
  {
    valor: "FATURADO_PARCELADO",
    rotulo: "Faturado parcelado",
    permiteParcelamento: true,
    liquidacaoImediata: false
  },
  {
    valor: "CHEQUE_A_VISTA",
    rotulo: "Cheque a vista",
    permiteParcelamento: false,
    liquidacaoImediata: true
  },
  {
    valor: "CHEQUE_PRE_DATADO",
    rotulo: "Cheque pre-datado",
    permiteParcelamento: false,
    liquidacaoImediata: false,
    prazoEmDias: 30
  },
  {
    valor: "OUTROS",
    rotulo: "Outros",
    permiteParcelamento: true,
    liquidacaoImediata: false
  }
];

export function obterFormaPagamentoOrdemCompra(formaPagamento?: string | null) {
  if (!formaPagamento) {
    return null;
  }

  return (
    FORMAS_PAGAMENTO_ORDEM_COMPRA.find(
      (forma) => forma.valor === formaPagamento
    ) ?? null
  );
}

function adicionarDias(dataBase: Date, dias: number) {
  const data = new Date(dataBase);
  data.setDate(data.getDate() + dias);
  return data;
}

export function normalizarPagamentoOrdemCompra(input: {
  formaPagamento?: string | null;
  numeroParcelas: number;
  dataEmissao: Date;
  primeiroVencimento?: Date | null;
}) {
  const formaPagamento = obterFormaPagamentoOrdemCompra(input.formaPagamento);
  const permiteParcelamento = formaPagamento?.permiteParcelamento ?? true;
  const numeroParcelas = permiteParcelamento
    ? Math.max(1, Math.trunc(input.numeroParcelas || 1))
    : 1;

  let primeiroVencimento = input.primeiroVencimento
    ? new Date(input.primeiroVencimento)
    : new Date(input.dataEmissao);

  if (formaPagamento?.liquidacaoImediata) {
    primeiroVencimento = new Date(input.dataEmissao);
  } else if (typeof formaPagamento?.prazoEmDias === "number") {
    primeiroVencimento = adicionarDias(input.dataEmissao, formaPagamento.prazoEmDias);
  }

  return {
    formaPagamento,
    permiteParcelamento,
    numeroParcelas,
    primeiroVencimento
  };
}
