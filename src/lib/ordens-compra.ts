export type OrdemCompraItemCalculo = {
  quantidade: number;
  valorUnitario: number;
};

export type ParcelaGerada = {
  numeroParcela: number;
  dataVencimento: Date;
  valorParcela: number;
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function calcularSubtotalItem(input: OrdemCompraItemCalculo) {
  return roundCurrency(input.quantidade * input.valorUnitario);
}

export function calcularTotalOrdem(
  items: Array<OrdemCompraItemCalculo>,
) {
  return roundCurrency(
    items.reduce((total, item) => total + calcularSubtotalItem(item), 0),
  );
}

export function gerarParcelasOrdemCompra(input: {
  valorTotal: number;
  numeroParcelas: number;
  dataBase: Date;
}) {
  const numeroParcelas = Math.max(1, Math.trunc(input.numeroParcelas || 1));
  const valorTotal = roundCurrency(input.valorTotal);

  if (valorTotal <= 0) {
    return [] as ParcelaGerada[];
  }

  const valorBase = roundCurrency(valorTotal / numeroParcelas);
  let acumulado = 0;

  return Array.from({ length: numeroParcelas }, (_, index) => {
    const dataVencimento = new Date(input.dataBase);
    dataVencimento.setMonth(dataVencimento.getMonth() + index);

    const ultimoItem = index === numeroParcelas - 1;
    const valorParcela = ultimoItem
      ? roundCurrency(valorTotal - acumulado)
      : valorBase;

    acumulado = roundCurrency(acumulado + valorParcela);

    return {
      numeroParcela: index + 1,
      dataVencimento,
      valorParcela,
    };
  });
}
