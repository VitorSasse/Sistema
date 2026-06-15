"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { calcularTotalOrdem, gerarParcelasOrdemCompra } from "@/lib/ordens-compra";
import {
  FORMAS_PAGAMENTO_ORDEM_COMPRA,
  normalizarPagamentoOrdemCompra,
  obterFormaPagamentoOrdemCompra
} from "@/lib/ordens-compra-pagamento";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { formatCurrency } from "@/lib/utils/formatters";

type StatusOrdemCompra =
  | "ABERTA"
  | "AGUARDANDO_APROVACAO"
  | "APROVADA"
  | "COMPRADA"
  | "RECEBIDA"
  | "CANCELADA";

type TipoCompra = "PRODUTO" | "SERVICO";

type Fornecedor = {
  id: string;
  codigo: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  enderecoLinha1: string | null;
  enderecoLinha2: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  status: "ATIVO" | "INATIVO";
};

type CentroCusto = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  status: "ATIVO" | "INATIVO";
};

type CatalogoCompra = {
  id: string;
  codigo: string;
  tipo: TipoCompra;
  descricao: string;
  unidadePadrao: string;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
};

type OrdemCompra = {
  id: string;
  numeroOrdem: string;
  dataEmissao: string;
  status: StatusOrdemCompra;
  tipoCompra: TipoCompra;
  centroCustoId: string | null;
  centroCustoNome: string;
  formaPagamento: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  observacaoFinanceira: string | null;
  observacao: string | null;
  motivoExclusao: string | null;
  excluidaEm: string | null;
  excluidaPorNome: string | null;
  valorTotal: string | number;
  fornecedor: Fornecedor;
  centroCusto: CentroCusto | null;
  criadoPor: {
    id: string;
    nome: string;
  };
  itens: Array<{
    id: string;
    catalogoCompraId: string | null;
    tipoItem: TipoCompra;
    item: string;
    codigo: string | null;
    descricao: string;
    unidade: string;
    quantidade: string | number;
    valorUnitario: string | number;
    subtotal: string | number;
    catalogoCompra: CatalogoCompra | null;
  }>;
  parcelas: Array<{
    id?: string;
    numeroParcela: number;
    dataVencimento: string;
    valorParcela: string | number;
  }>;
};

type FormItem = {
  item: string;
  catalogoCompraId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
};

type FormState = {
  id?: string;
  dataEmissao: string;
  status: StatusOrdemCompra;
  tipoCompra: TipoCompra;
  fornecedorId: string;
  centroCustoId: string;
  formaPagamento: string;
  numeroParcelas: string;
  primeiroVencimento: string;
  observacaoFinanceira: string;
  observacao: string;
  motivoExclusao: string;
  itens: FormItem[];
};

const STATUS_OPTIONS: Array<{ value: StatusOrdemCompra; label: string }> = [
  { value: "ABERTA", label: "Aberta" },
  { value: "AGUARDANDO_APROVACAO", label: "Aguardando aprovacao" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "COMPRADA", label: "Comprada" },
  { value: "RECEBIDA", label: "Recebida" },
  { value: "CANCELADA", label: "Cancelada" }
];

function formatDateInput(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function createEmptyItem(index: number): FormItem {
  return {
    item: `ITEM ${String(index).padStart(2, "0")}`,
    catalogoCompraId: "",
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    valorUnitario: "0"
  };
}

function createInitialForm(): FormState {
  const today = formatDateInput(new Date());

  return {
    dataEmissao: today,
    status: "ABERTA",
    tipoCompra: "PRODUTO",
    fornecedorId: "",
    centroCustoId: "",
    formaPagamento: "",
    numeroParcelas: "1",
    primeiroVencimento: today,
    observacaoFinanceira: "",
    observacao: "",
    motivoExclusao: "",
    itens: [createEmptyItem(1)]
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function toNumber(value: string) {
  const parsed = parseDecimalInput(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberToInput(value: number | string) {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
}

function getStatusBadgeClass(status: StatusOrdemCompra) {
  if (status === "RECEBIDA" || status === "COMPRADA") return "badge badge-success";
  if (status === "CANCELADA") return "badge badge-danger";
  return "badge badge-warn";
}

function formatTipoCompra(value: TipoCompra) {
  return value === "SERVICO" ? "Servico" : "Produto";
}

export function OrdensCompraManager() {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [catalogoCompra, setCatalogoCompra] = useState<CatalogoCompra[]>([]);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusOrdemCompra>("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadData() {
    const [ordensResponse, fornecedoresResponse, centrosResponse, catalogoResponse] =
      await Promise.all([
        fetch("/api/ordens-compra", { cache: "no-store" }),
        fetch("/api/fornecedores", { cache: "no-store" }),
        fetch("/api/centros-custo", { cache: "no-store" }),
        fetch("/api/catalogo-compras", { cache: "no-store" })
      ]);

    const ordensData = (await ordensResponse.json()) as { items: OrdemCompra[] };
    const fornecedoresData = (await fornecedoresResponse.json()) as { items: Fornecedor[] };
    const centrosData = (await centrosResponse.json()) as { items: CentroCusto[] };
    const catalogoData = (await catalogoResponse.json()) as { items: CatalogoCompra[] };

    setOrdens(ordensData.items);
    setFornecedores(fornecedoresData.items);
    setCentrosCusto(centrosData.items);
    setCatalogoCompra(catalogoData.items);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const fornecedoresDisponiveis = useMemo(() => {
    return fornecedores.filter(
      (fornecedor) => fornecedor.status === "ATIVO" || fornecedor.id === form.fornecedorId
    );
  }, [fornecedores, form.fornecedorId]);

  const centrosDisponiveis = useMemo(() => {
    return centrosCusto.filter(
      (centro) => centro.status === "ATIVO" || centro.id === form.centroCustoId
    );
  }, [centrosCusto, form.centroCustoId]);

  const catalogoDisponivel = useMemo(() => {
    return catalogoCompra
      .filter((item) => item.tipo === form.tipoCompra)
      .filter((item) => item.status === "ATIVO" || form.itens.some((linha) => linha.catalogoCompraId === item.id))
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [catalogoCompra, form.tipoCompra, form.itens]);

  const fornecedorSelecionado = useMemo(() => {
    return fornecedores.find((fornecedor) => fornecedor.id === form.fornecedorId) ?? null;
  }, [fornecedores, form.fornecedorId]);

  const centroSelecionado = useMemo(() => {
    return centrosCusto.find((centro) => centro.id === form.centroCustoId) ?? null;
  }, [centrosCusto, form.centroCustoId]);

  const configuracaoPagamento = useMemo(() => {
    return obterFormaPagamentoOrdemCompra(form.formaPagamento);
  }, [form.formaPagamento]);

  const pagamentoNormalizado = useMemo(() => {
    if (!form.dataEmissao) {
      return null;
    }

    return normalizarPagamentoOrdemCompra({
      formaPagamento: form.formaPagamento,
      numeroParcelas: Number(form.numeroParcelas || 1),
      dataEmissao: parseDateValue(form.dataEmissao),
      primeiroVencimento: form.primeiroVencimento ? parseDateValue(form.primeiroVencimento) : null
    });
  }, [form.dataEmissao, form.formaPagamento, form.numeroParcelas, form.primeiroVencimento]);

  const totalItens = useMemo(() => {
    return calcularTotalOrdem(
      form.itens.map((item) => ({
        quantidade: toNumber(item.quantidade),
        valorUnitario: toNumber(item.valorUnitario)
      }))
    );
  }, [form.itens]);

  const parcelasPreview = useMemo(() => {
    if (!pagamentoNormalizado || !form.formaPagamento) {
      return [];
    }

    return gerarParcelasOrdemCompra({
      valorTotal: totalItens,
      numeroParcelas: pagamentoNormalizado.numeroParcelas,
      dataBase: pagamentoNormalizado.primeiroVencimento
    });
  }, [form.formaPagamento, pagamentoNormalizado, totalItens]);

  const filteredOrdens = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return ordens.filter((ordem) => {
      const matchesStatus = statusFilter === "TODOS" || ordem.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          ordem.numeroOrdem,
          ordem.tipoCompra,
          ordem.fornecedor.codigo,
          ordem.fornecedor.razaoSocial,
          ordem.centroCustoNome
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [ordens, search, statusFilter]);

  useEffect(() => {
    if (!configuracaoPagamento || !pagamentoNormalizado) {
      return;
    }

    let nextNumeroParcelas = form.numeroParcelas;
    let nextPrimeiroVencimento = form.primeiroVencimento;
    let shouldUpdate = false;

    if (!configuracaoPagamento.permiteParcelamento && form.numeroParcelas !== "1") {
      nextNumeroParcelas = "1";
      shouldUpdate = true;
    }

    if (
      configuracaoPagamento.liquidacaoImediata ||
      typeof configuracaoPagamento.prazoEmDias === "number"
    ) {
      const vencimentoCalculado = formatDateInput(pagamentoNormalizado.primeiroVencimento);

      if (form.primeiroVencimento !== vencimentoCalculado) {
        nextPrimeiroVencimento = vencimentoCalculado;
        shouldUpdate = true;
      }
    } else if (configuracaoPagamento.permiteParcelamento && (!form.numeroParcelas || Number(form.numeroParcelas) < 1)) {
      nextNumeroParcelas = "1";
      shouldUpdate = true;
    } else if (configuracaoPagamento.permiteParcelamento && !form.primeiroVencimento) {
      nextPrimeiroVencimento = form.dataEmissao;
      shouldUpdate = true;
    }

    if (!shouldUpdate) {
      return;
    }

    setForm((current) => ({
      ...current,
      numeroParcelas: nextNumeroParcelas,
      primeiroVencimento: nextPrimeiroVencimento
    }));
  }, [
    configuracaoPagamento,
    form.dataEmissao,
    form.numeroParcelas,
    form.primeiroVencimento,
    pagamentoNormalizado
  ]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateItem(index: number, key: keyof FormItem, value: string) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  function handleTipoCompraChange(value: TipoCompra) {
    setForm((current) => ({
      ...current,
      tipoCompra: value,
      itens: current.itens.map((item) => ({
        ...item,
        catalogoCompraId: ""
      }))
    }));
  }

  function handleSelectCatalogo(index: number, catalogoId: string) {
    const catalogo = catalogoDisponivel.find((item) => item.id === catalogoId);

    setForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (!catalogo) {
          return {
            ...item,
            catalogoCompraId: ""
          };
        }

        return {
          ...item,
          catalogoCompraId: catalogo.id,
          codigo: catalogo.codigo,
          descricao: catalogo.descricao,
          unidade: catalogo.unidadePadrao
        };
      })
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, createEmptyItem(current.itens.length + 1)]
    }));
  }

  function removeItem(index: number) {
    setForm((current) => {
      if (current.itens.length === 1) {
        return current;
      }

      return {
        ...current,
        itens: current.itens.filter((_, itemIndex) => itemIndex !== index)
      };
    });
  }

  function buildPayload() {
    const numeroParcelas = pagamentoNormalizado?.numeroParcelas ?? Math.max(1, Number(form.numeroParcelas || 1));
    const primeiroVencimento = pagamentoNormalizado
      ? formatDateInput(pagamentoNormalizado.primeiroVencimento)
      : form.primeiroVencimento;

    return {
      dataEmissao: form.dataEmissao,
      status: form.status,
      tipoCompra: form.tipoCompra,
      fornecedorId: form.fornecedorId,
      centroCustoId: form.centroCustoId,
      centroCustoTipo: "SETOR",
      centroCustoNome: centroSelecionado?.nome ?? "",
      formaPagamento: form.formaPagamento,
      numeroParcelas,
      primeiroVencimento,
      observacaoFinanceira: form.observacaoFinanceira,
      observacao: form.observacao,
      motivoExclusao: form.motivoExclusao,
      itens: form.itens.map((item) => ({
        catalogoCompraId: item.catalogoCompraId,
        item: item.item,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: toNumber(item.quantidade),
        valorUnitario: toNumber(item.valorUnitario)
      }))
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/ordens-compra/${form.id}` : "/api/ordens-compra";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload())
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar a ordem de compra.");
        return;
      }

      setForm(createInitialForm());
      setMessage(
        form.id
          ? "Ordem de compra atualizada com sucesso."
          : "Ordem de compra cadastrada com sucesso."
      );
      await loadData();
    });
  }

  function handleEdit(ordem: OrdemCompra) {
    setForm({
      id: ordem.id,
      dataEmissao: formatDateInput(ordem.dataEmissao),
      status: ordem.status,
      tipoCompra: ordem.tipoCompra,
      fornecedorId: ordem.fornecedor.id,
      centroCustoId: ordem.centroCusto?.id ?? "",
      formaPagamento: ordem.formaPagamento ?? "",
      numeroParcelas: String(ordem.numeroParcelas),
      primeiroVencimento: formatDateInput(
        ordem.primeiroVencimento ?? ordem.parcelas[0]?.dataVencimento ?? ordem.dataEmissao
      ),
      observacaoFinanceira: ordem.observacaoFinanceira ?? "",
      observacao: ordem.observacao ?? "",
      motivoExclusao: ordem.motivoExclusao ?? "",
      itens: ordem.itens.map((item, index) => ({
        item: item.item || `ITEM ${String(index + 1).padStart(2, "0")}`,
        catalogoCompraId: item.catalogoCompraId ?? "",
        codigo: item.codigo ?? "",
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: numberToInput(item.quantidade),
        valorUnitario: numberToInput(item.valorUnitario)
      }))
    });

    setMessage(`Editando ${ordem.numeroOrdem}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setForm(createInitialForm());
    setMessage("");
  }

  function handleOpenPdf(ordemId: string) {
    window.open(`/api/ordens-compra/${ordemId}/pdf`, "_blank", "noopener,noreferrer");
  }

  function handleCancelar(ordem: OrdemCompra) {
    const motivo = window.prompt(
      `Informe o motivo da exclusao/cancelamento da ordem ${ordem.numeroOrdem}:`
    );

    if (motivo === null) {
      return;
    }

    const motivoNormalizado = motivo.trim();

    if (!motivoNormalizado) {
      setMessage("Informe o motivo da exclusao para cancelar a ordem.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/ordens-compra/${ordem.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivoExclusao: motivoNormalizado })
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel cancelar a ordem de compra.");
        return;
      }

      await loadData();

      if (form.id === ordem.id) {
        setForm(createInitialForm());
      }

      setMessage(`Ordem ${ordem.numeroOrdem} cancelada com sucesso.`);
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Ordem de compra</h1>
          <p className="page-copy">
            Fluxo financeiro com fornecedor, centro de custo, tipo da compra e itens do catalogo.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {form.id ? "Editar ordem de compra" : "Nova ordem de compra"}
            </h2>
            <p className="section-copy">
              Selecione o tipo da compra primeiro para carregar o catalogo correto.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Cabecalho da ordem
                </h3>
                <p className="section-copy">
                  Defina a natureza da compra e os dados principais do documento.
                </p>
              </div>
            </div>

            <div className="toolbar-actions" style={{ marginBottom: 18 }}>
              <button
                type="button"
                className={form.tipoCompra === "PRODUTO" ? "button-primary" : "button-secondary"}
                onClick={() => handleTipoCompraChange("PRODUTO")}
              >
                Compra de produto
              </button>
              <button
                type="button"
                className={form.tipoCompra === "SERVICO" ? "button-primary" : "button-secondary"}
                onClick={() => handleTipoCompraChange("SERVICO")}
              >
                Compra de servico
              </button>
            </div>

            <div className="form-grid-4">
              <Field label="Fornecedor">
                <select
                  className="field-control"
                  value={form.fornecedorId}
                  onChange={(event) => updateField("fornecedorId", event.target.value)}
                >
                  <option value="">Selecione o fornecedor</option>
                  {fornecedoresDisponiveis.map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.codigo} - {fornecedor.razaoSocial}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Centro de custo">
                <select
                  className="field-control"
                  value={form.centroCustoId}
                  onChange={(event) => updateField("centroCustoId", event.target.value)}
                >
                  <option value="">Selecione o centro de custo</option>
                  {centrosDisponiveis.map((centro) => (
                    <option key={centro.id} value={centro.id}>
                      {centro.codigo} - {centro.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data da emissao">
                <input
                  className="field-control"
                  type="date"
                  value={form.dataEmissao}
                  onChange={(event) => updateField("dataEmissao", event.target.value)}
                />
              </Field>
              <Field label="Status">
                <select
                  className="field-control"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value as StatusOrdemCompra)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {(fornecedorSelecionado || centroSelecionado) ? (
              <div
                className="surface"
                style={{
                  marginTop: 18,
                  padding: 18,
                  border: "1px solid var(--line-strong)"
                }}
              >
                {fornecedorSelecionado ? (
                  <>
                    <strong>
                      {fornecedorSelecionado.codigo} - {fornecedorSelecionado.razaoSocial}
                    </strong>
                    <p className="section-copy" style={{ marginTop: 8, marginBottom: 0 }}>
                      {fornecedorSelecionado.nomeFantasia ?? "-"} | CNPJ: {fornecedorSelecionado.cnpj ?? "-"} |{" "}
                      {fornecedorSelecionado.telefone ?? "-"} | {fornecedorSelecionado.email ?? "-"}
                    </p>
                  </>
                ) : null}
                {centroSelecionado ? (
                  <p className="section-copy" style={{ marginTop: 8, marginBottom: 0 }}>
                    Centro de custo: <strong>{centroSelecionado.codigo} - {centroSelecionado.nome}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}

            {form.status === "CANCELADA" ? (
              <Field label="Motivo da exclusao">
                <textarea
                  className="field-control textarea-lg"
                  placeholder="Descreva porque essa ordem de compra esta sendo cancelada"
                  value={form.motivoExclusao}
                  onChange={(event) => updateField("motivoExclusao", event.target.value)}
                />
              </Field>
            ) : null}
          </div>

          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Itens da compra
                </h3>
                <p className="section-copy">
                  O catalogo abaixo muda automaticamente conforme o tipo selecionado.
                </p>
              </div>
              <button type="button" className="button-secondary" onClick={addItem}>
                Adicionar item
              </button>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>{formatTipoCompra(form.tipoCompra)}</th>
                    <th>Codigo</th>
                    <th>Descricao</th>
                    <th>Unidade</th>
                    <th>Quantidade</th>
                    <th>Valor unitario</th>
                    <th>Subtotal</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {form.itens.map((item, index) => {
                    const subtotal = toNumber(item.quantidade) * toNumber(item.valorUnitario);

                    return (
                      <tr key={`${item.item}-${index}`}>
                        <td>
                          <input
                            className="field-control"
                            value={item.item}
                            onChange={(event) => updateItem(index, "item", event.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="field-control"
                            value={item.catalogoCompraId}
                            onChange={(event) => handleSelectCatalogo(index, event.target.value)}
                            style={{ minWidth: 240 }}
                          >
                            <option value="">Selecione do catalogo</option>
                            {catalogoDisponivel.map((catalogo) => (
                              <option key={catalogo.id} value={catalogo.id}>
                                {catalogo.codigo} - {catalogo.descricao}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="field-control"
                            value={item.codigo}
                            onChange={(event) => updateItem(index, "codigo", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="field-control"
                            value={item.descricao}
                            onChange={(event) => updateItem(index, "descricao", event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="field-control"
                            value={item.unidade}
                            onChange={(event) => updateItem(index, "unidade", event.target.value)}
                            style={{ minWidth: 84 }}
                          />
                        </td>
                        <td>
                          <input
                            className="field-control"
                            inputMode="decimal"
                            value={item.quantidade}
                            onChange={(event) => updateItem(index, "quantidade", event.target.value)}
                            style={{ minWidth: 110 }}
                          />
                        </td>
                        <td>
                          <input
                            className="field-control"
                            inputMode="decimal"
                            value={item.valorUnitario}
                            onChange={(event) => updateItem(index, "valorUnitario", event.target.value)}
                            style={{ minWidth: 120 }}
                          />
                        </td>
                        <td>{formatCurrency(subtotal)}</td>
                        <td>
                          <button
                            type="button"
                            className="button-danger"
                            onClick={() => removeItem(index)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="surface"
              style={{
                marginTop: 16,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                border: "1px solid var(--line-strong)"
              }}
            >
              <span className="section-copy" style={{ margin: 0 }}>
                Total consolidado da ordem.
              </span>
              <strong>{formatCurrency(totalItens)}</strong>
            </div>
          </div>

          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Pagamento e fechamento
                </h3>
                <p className="section-copy">
                  O sistema ajusta automaticamente vencimento e parcelamento conforme a forma de pagamento.
                </p>
              </div>
            </div>

            <div className="form-grid-4">
              <Field label="Forma de pagamento">
                <select
                  className="field-control"
                  value={form.formaPagamento}
                  onChange={(event) => updateField("formaPagamento", event.target.value)}
                >
                  <option value="">Selecione a forma de pagamento</option>
                  {FORMAS_PAGAMENTO_ORDEM_COMPRA.map((forma) => (
                    <option key={forma.valor} value={forma.valor}>
                      {forma.rotulo}
                    </option>
                  ))}
                </select>
              </Field>

              {!form.formaPagamento ? (
                <Field label="Parcelamento">
                  <input className="field-control" value="Selecione a forma de pagamento" readOnly />
                </Field>
              ) : configuracaoPagamento?.permiteParcelamento ? (
                <Field label="Numero de parcelas">
                  <input
                    className="field-control"
                    type="number"
                    min={1}
                    max={60}
                    value={form.numeroParcelas}
                    onChange={(event) => updateField("numeroParcelas", event.target.value)}
                  />
                </Field>
              ) : (
                <Field label="Parcelamento">
                  <input className="field-control" value="Parcela unica" readOnly />
                </Field>
              )}

              {!form.formaPagamento ? (
                <Field label="Primeiro vencimento">
                  <input className="field-control" value="Selecione a forma de pagamento" readOnly />
                </Field>
              ) : configuracaoPagamento?.liquidacaoImediata ? (
                <Field label="Data do pagamento">
                  <input className="field-control" type="date" value={form.dataEmissao} readOnly />
                </Field>
              ) : typeof configuracaoPagamento?.prazoEmDias === "number" ? (
                <Field label="Primeiro vencimento">
                  <input
                    className="field-control"
                    type="date"
                    value={
                      pagamentoNormalizado
                        ? formatDateInput(pagamentoNormalizado.primeiroVencimento)
                        : ""
                    }
                    readOnly
                  />
                </Field>
              ) : (
                <Field label="Primeiro vencimento">
                  <input
                    className="field-control"
                    type="date"
                    value={form.primeiroVencimento}
                    onChange={(event) => updateField("primeiroVencimento", event.target.value)}
                  />
                </Field>
              )}

              <Field
                label={
                  configuracaoPagamento?.permiteParcelamento
                    ? "Valor estimado da parcela"
                    : "Valor da parcela unica"
                }
              >
                <input
                  className="field-control"
                  value={
                    parcelasPreview[0]
                      ? formatCurrency(parcelasPreview[0].valorParcela)
                      : "R$ 0,00"
                  }
                  readOnly
                />
              </Field>
            </div>

            <Field label="Observacoes financeiras">
              <textarea
                className="field-control textarea-lg"
                placeholder="Condicoes de pagamento, aprovacao, observacoes do financeiro"
                value={form.observacaoFinanceira}
                onChange={(event) => updateField("observacaoFinanceira", event.target.value)}
              />
            </Field>

            <div className="data-table-wrap" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelasPreview.length === 0 ? (
                    <tr>
                      <td colSpan={3}>
                        {form.formaPagamento
                          ? "Nenhuma parcela gerada."
                          : "Selecione a forma de pagamento para calcular as parcelas."}
                      </td>
                    </tr>
                  ) : (
                    parcelasPreview.map((parcela) => (
                      <tr key={parcela.numeroParcela}>
                        <td>
                          {parcela.numeroParcela}/{pagamentoNormalizado?.numeroParcelas ?? Math.max(1, Number(form.numeroParcelas || 1))}
                        </td>
                        <td>{parcela.dataVencimento.toLocaleDateString("pt-BR")}</td>
                        <td>{formatCurrency(parcela.valorParcela)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Field label="Observacoes gerais">
            <textarea
              className="field-control textarea-lg"
              placeholder="Responsavel pela solicitacao, escopo, aplicacao do item ou observacoes gerais"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending
                ? "Salvando..."
                : form.id
                  ? "Atualizar ordem de compra"
                  : "Salvar ordem de compra"}
            </button>
            <button type="button" onClick={handleReset} className="button-ghost">
              Limpar formulario
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Ordens de compra emitidas</h2>
            <p className="section-copy">
              {filteredOrdens.length} registro(s) exibido(s) de {ordens.length}.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por numero, tipo, fornecedor ou centro de custo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 360, maxWidth: "100%" }}
            />
            <select
              className="field-control"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "TODOS" | StatusOrdemCompra)
              }
            >
              <option value="TODOS">Todos os status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Emissao</th>
                <th>Tipo</th>
                <th>Fornecedor</th>
                <th>Centro de custo</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrdens.map((ordem) => (
                <tr key={ordem.id}>
                  <td>
                    <div>{ordem.numeroOrdem}</div>
                    <div className="subtle">Criada por {ordem.criadoPor.nome}</div>
                    {ordem.motivoExclusao ? (
                      <div className="subtle">Motivo: {ordem.motivoExclusao}</div>
                    ) : null}
                  </td>
                  <td>{new Date(ordem.dataEmissao).toLocaleDateString("pt-BR")}</td>
                  <td>{formatTipoCompra(ordem.tipoCompra)}</td>
                  <td>
                    <div>{ordem.fornecedor.razaoSocial}</div>
                    <div className="subtle">{ordem.fornecedor.codigo}</div>
                  </td>
                  <td>{ordem.centroCustoNome}</td>
                  <td>{formatCurrency(ordem.valorTotal)}</td>
                  <td>
                    <span className={getStatusBadgeClass(ordem.status)}>
                      {STATUS_OPTIONS.find((status) => status.value === ordem.status)?.label ??
                        ordem.status}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => handleEdit(ordem)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => handleOpenPdf(ordem.id)}
                      >
                        PDF
                      </button>
                      {ordem.status !== "CANCELADA" ? (
                        <button
                          type="button"
                          className="button-danger"
                          onClick={() => handleCancelar(ordem)}
                        >
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
