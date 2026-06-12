"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CENTROS_CUSTO_SETORIAIS } from "@/lib/constants/centros-custo";
import { calcularTotalOrdem, gerarParcelasOrdemCompra } from "@/lib/ordens-compra";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import { formatCurrency } from "@/lib/utils/formatters";

type StatusOrdemCompra =
  | "ABERTA"
  | "AGUARDANDO_APROVACAO"
  | "APROVADA"
  | "COMPRADA"
  | "RECEBIDA"
  | "CANCELADA";

type TipoCentroCusto = "EQUIPAMENTO" | "SETOR";
type CentroCustoModo = "EQUIPAMENTO" | "SETOR" | "MANUAL";

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

type Equipamento = {
  id: string;
  placaOuTag: string;
  descricao: string;
  status: "ATIVO" | "INATIVO";
};

type OrdemCompraItem = {
  id: string;
  item: string;
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  subtotal: string;
};

type OrdemCompraParcela = {
  id?: string;
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: string;
};

type OrdemCompra = {
  id: string;
  numeroOrdem: string;
  dataEmissao: string;
  status: StatusOrdemCompra;
  centroCustoTipo: TipoCentroCusto;
  centroCustoNome: string;
  centroCustoEquipamentoId: string | null;
  formaPagamento: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  observacaoFinanceira: string | null;
  observacao: string | null;
  valorTotal: string;
  fornecedorId: string;
  fornecedor: Fornecedor;
  centroCustoEquipamento: Equipamento | null;
  criadoPor: {
    id: string;
    nome: string;
  };
  itens: OrdemCompraItem[];
  parcelas: OrdemCompraParcela[];
};

type FormItem = {
  item: string;
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
  fornecedorId: string;
  centroCustoModo: CentroCustoModo;
  centroCustoSetor: string;
  centroCustoEquipamentoId: string;
  centroCustoManual: string;
  formaPagamento: string;
  numeroParcelas: string;
  primeiroVencimento: string;
  observacaoFinanceira: string;
  observacao: string;
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

const FORMAS_PAGAMENTO = [
  "PIX",
  "BOLETO",
  "TRANSFERENCIA",
  "CARTAO",
  "DINHEIRO",
  "FATURADO"
] as const;

function formatDateInput(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyItem(index: number): FormItem {
  return {
    item: `ITEM ${String(index).padStart(2, "0")}`,
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
    fornecedorId: "",
    centroCustoModo: "SETOR",
    centroCustoSetor: CENTROS_CUSTO_SETORIAIS[0],
    centroCustoEquipamentoId: "",
    centroCustoManual: "",
    formaPagamento: "",
    numeroParcelas: "1",
    primeiroVencimento: today,
    observacaoFinanceira: "",
    observacao: "",
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

export function OrdensCompraManager() {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | StatusOrdemCompra>("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadData() {
    const [ordensResponse, fornecedoresResponse, equipamentosResponse] = await Promise.all([
      fetch("/api/ordens-compra", { cache: "no-store" }),
      fetch("/api/fornecedores", { cache: "no-store" }),
      fetch("/api/equipamentos", { cache: "no-store" })
    ]);

    const ordensData = (await ordensResponse.json()) as { items: OrdemCompra[] };
    const fornecedoresData = (await fornecedoresResponse.json()) as { items: Fornecedor[] };
    const equipamentosData = (await equipamentosResponse.json()) as { items: Equipamento[] };

    setOrdens(ordensData.items);
    setFornecedores(fornecedoresData.items);
    setEquipamentos(equipamentosData.items);
  }

  useEffect(() => {
    void loadData();
  }, []);

  const fornecedoresDisponiveis = useMemo(() => {
    return fornecedores.filter(
      (fornecedor) => fornecedor.status === "ATIVO" || fornecedor.id === form.fornecedorId
    );
  }, [fornecedores, form.fornecedorId]);

  const equipamentosAtivos = useMemo(() => {
    return equipamentos
      .filter((equipamento) => equipamento.status === "ATIVO")
      .sort((a, b) =>
        `${a.placaOuTag} ${a.descricao}`.localeCompare(`${b.placaOuTag} ${b.descricao}`)
      );
  }, [equipamentos]);

  const fornecedorSelecionado = useMemo(() => {
    return fornecedores.find((fornecedor) => fornecedor.id === form.fornecedorId) ?? null;
  }, [fornecedores, form.fornecedorId]);

  const totalItens = useMemo(() => {
    return calcularTotalOrdem(
      form.itens.map((item) => ({
        quantidade: toNumber(item.quantidade),
        valorUnitario: toNumber(item.valorUnitario)
      }))
    );
  }, [form.itens]);

  const parcelasPreview = useMemo(() => {
    if (!form.primeiroVencimento) {
      return [];
    }

    return gerarParcelasOrdemCompra({
      valorTotal: totalItens,
      numeroParcelas: Math.max(1, Number(form.numeroParcelas || 1)),
      dataBase: new Date(form.primeiroVencimento)
    });
  }, [form.numeroParcelas, form.primeiroVencimento, totalItens]);

  const filteredOrdens = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return ordens.filter((ordem) => {
      const matchesStatus = statusFilter === "TODOS" || ordem.status === statusFilter;
      const matchesSearch =
        !normalized ||
        [
          ordem.numeroOrdem,
          ordem.fornecedor.codigo,
          ordem.fornecedor.razaoSocial,
          ordem.fornecedor.nomeFantasia ?? "",
          ordem.centroCustoNome
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesStatus && matchesSearch;
    });
  }, [ordens, search, statusFilter]);

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

      const itens = current.itens.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        itens: itens.map((item, itemIndex) => ({
          ...item,
          item: item.item || `ITEM ${String(itemIndex + 1).padStart(2, "0")}`
        }))
      };
    });
  }

  function buildPayload() {
    let centroCustoTipo: TipoCentroCusto = "SETOR";
    let centroCustoNome = form.centroCustoSetor;
    let centroCustoEquipamentoId = "";

    if (form.centroCustoModo === "EQUIPAMENTO") {
      centroCustoTipo = "EQUIPAMENTO";
      centroCustoEquipamentoId = form.centroCustoEquipamentoId;
      const equipamento = equipamentos.find((item) => item.id === form.centroCustoEquipamentoId);
      centroCustoNome = equipamento
        ? `${equipamento.placaOuTag} - ${equipamento.descricao}`
        : "";
    }

    if (form.centroCustoModo === "MANUAL") {
      centroCustoTipo = "SETOR";
      centroCustoNome = form.centroCustoManual;
    }

    return {
      dataEmissao: form.dataEmissao,
      status: form.status,
      fornecedorId: form.fornecedorId,
      centroCustoTipo,
      centroCustoNome,
      centroCustoEquipamentoId,
      formaPagamento: form.formaPagamento,
      numeroParcelas: Number(form.numeroParcelas || 1),
      primeiroVencimento: form.primeiroVencimento,
      observacaoFinanceira: form.observacaoFinanceira,
      observacao: form.observacao,
      itens: form.itens.map((item) => ({
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
    let centroCustoModo: CentroCustoModo = "MANUAL";
    let centroCustoSetor: string = CENTROS_CUSTO_SETORIAIS[0];
    let centroCustoManual = ordem.centroCustoNome;

    if (ordem.centroCustoTipo === "EQUIPAMENTO" && ordem.centroCustoEquipamento?.id) {
      centroCustoModo = "EQUIPAMENTO";
      centroCustoManual = "";
    } else if (
      CENTROS_CUSTO_SETORIAIS.includes(ordem.centroCustoNome as (typeof CENTROS_CUSTO_SETORIAIS)[number])
    ) {
      centroCustoModo = "SETOR";
      centroCustoSetor = ordem.centroCustoNome;
      centroCustoManual = "";
    }

    setForm({
      id: ordem.id,
      dataEmissao: formatDateInput(ordem.dataEmissao),
      status: ordem.status,
      fornecedorId: ordem.fornecedor.id,
      centroCustoModo,
      centroCustoSetor,
      centroCustoEquipamentoId: ordem.centroCustoEquipamento?.id ?? "",
      centroCustoManual,
      formaPagamento: ordem.formaPagamento ?? "",
      numeroParcelas: String(ordem.numeroParcelas),
      primeiroVencimento: formatDateInput(
        ordem.primeiroVencimento ?? ordem.parcelas[0]?.dataVencimento ?? ordem.dataEmissao
      ),
      observacaoFinanceira: ordem.observacaoFinanceira ?? "",
      observacao: ordem.observacao ?? "",
      itens: ordem.itens.map((item, index) => ({
        item: item.item || `ITEM ${String(index + 1).padStart(2, "0")}`,
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

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Ordem de compra</h1>
          <p className="page-copy">
            Controle compras por fornecedor, centro de custo, itens, parcelas e emissao de relatorio.
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
              O numero da ordem e gerado automaticamente no salvamento.
            </p>
          </div>
        </div>

        {fornecedoresDisponiveis.length === 0 ? (
          <p className="message-inline">
            Nenhum fornecedor ativo encontrado. Cadastre o fornecedor antes de emitir a ordem.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label="Data da emissao">
              <input
                className="field-control"
                type="date"
                value={form.dataEmissao}
                onChange={(event) => updateField("dataEmissao", event.target.value)}
              />
            </Field>
            <Field label="Status da ordem">
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
          </div>

          {fornecedorSelecionado ? (
            <div className="surface" style={{ padding: 18, border: "1px solid var(--line-strong)" }}>
              <strong>
                {fornecedorSelecionado.codigo} - {fornecedorSelecionado.razaoSocial}
              </strong>
              <p className="section-copy" style={{ marginTop: 8, marginBottom: 0 }}>
                {fornecedorSelecionado.nomeFantasia ?? "-"} | CNPJ: {fornecedorSelecionado.cnpj ?? "-"} |{" "}
                {fornecedorSelecionado.telefone ?? "-"} | {fornecedorSelecionado.email ?? "-"}
              </p>
              <p className="section-copy" style={{ marginTop: 6, marginBottom: 0 }}>
                {fornecedorSelecionado.enderecoLinha1 ?? "-"} {fornecedorSelecionado.enderecoLinha2 ?? ""} |{" "}
                {fornecedorSelecionado.bairro ?? "-"} | {fornecedorSelecionado.cidade ?? "-"} /{" "}
                {fornecedorSelecionado.uf ?? "-"}
              </p>
            </div>
          ) : null}

          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Centro de custo
                </h3>
                <p className="section-copy">Defina onde esta compra sera apropriada.</p>
              </div>
            </div>

            <div className="toolbar-actions" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={form.centroCustoModo === "EQUIPAMENTO" ? "button-primary" : "button-secondary"}
                onClick={() => updateField("centroCustoModo", "EQUIPAMENTO")}
              >
                Equipamento
              </button>
              <button
                type="button"
                className={form.centroCustoModo === "SETOR" ? "button-primary" : "button-secondary"}
                onClick={() => updateField("centroCustoModo", "SETOR")}
              >
                Setor
              </button>
              <button
                type="button"
                className={form.centroCustoModo === "MANUAL" ? "button-primary" : "button-secondary"}
                onClick={() => updateField("centroCustoModo", "MANUAL")}
              >
                Manual
              </button>
            </div>

            {form.centroCustoModo === "EQUIPAMENTO" ? (
              <Field label="Equipamento">
                <select
                  className="field-control"
                  value={form.centroCustoEquipamentoId}
                  onChange={(event) => updateField("centroCustoEquipamentoId", event.target.value)}
                >
                  <option value="">Selecione o equipamento</option>
                  {equipamentosAtivos.map((equipamento) => (
                    <option key={equipamento.id} value={equipamento.id}>
                      {equipamento.placaOuTag} - {equipamento.descricao}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {form.centroCustoModo === "SETOR" ? (
              <Field label="Centro de custo setorial">
                <select
                  className="field-control"
                  value={form.centroCustoSetor}
                  onChange={(event) => updateField("centroCustoSetor", event.target.value)}
                >
                  {CENTROS_CUSTO_SETORIAIS.map((centro) => (
                    <option key={centro} value={centro}>
                      {centro}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {form.centroCustoModo === "MANUAL" ? (
              <Field label="Centro de custo manual">
                <input
                  className="field-control"
                  placeholder="Ex.: OBRA GE08, OFICINA EXTERNA, APOIO OPERACIONAL"
                  value={form.centroCustoManual}
                  onChange={(event) => updateField("centroCustoManual", event.target.value)}
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
                <p className="section-copy">Inclua um ou mais itens para compor o total da ordem.</p>
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
                gap: 16,
                alignItems: "center",
                border: "1px solid var(--line-strong)"
              }}
            >
              <span className="section-copy" style={{ margin: 0 }}>
                Total calculado automaticamente pela soma dos subtotais.
              </span>
              <strong>{formatCurrency(totalItens)}</strong>
            </div>
          </div>

          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Dados do pagamento
                </h3>
                <p className="section-copy">
                  As parcelas sao geradas automaticamente conforme o total e a quantidade informada.
                </p>
              </div>
            </div>

            <div className="form-grid-4">
              <Field label="Forma de pagamento">
                <input
                  className="field-control"
                  list="formas-pagamento-ordem"
                  value={form.formaPagamento}
                  onChange={(event) => updateField("formaPagamento", event.target.value)}
                  placeholder="PIX, boleto, faturado"
                />
              </Field>
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
              <Field label="Primeiro vencimento">
                <input
                  className="field-control"
                  type="date"
                  value={form.primeiroVencimento}
                  onChange={(event) => updateField("primeiroVencimento", event.target.value)}
                />
              </Field>
              <Field label="Valor estimado da parcela">
                <input
                  className="field-control"
                  value={parcelasPreview[0] ? formatCurrency(parcelasPreview[0].valorParcela) : "R$ 0,00"}
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

            <datalist id="formas-pagamento-ordem">
              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma} value={forma} />
              ))}
            </datalist>

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
                      <td colSpan={3}>Nenhuma parcela gerada.</td>
                    </tr>
                  ) : (
                    parcelasPreview.map((parcela) => (
                      <tr key={parcela.numeroParcela}>
                        <td>
                          {parcela.numeroParcela}/{Math.max(1, Number(form.numeroParcelas || 1))}
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
              placeholder="Responsavel pela solicitacao, numero da obra, aplicacao do material, observacoes gerais"
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
              placeholder="Buscar por numero, fornecedor ou centro de custo"
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
                <th>Fornecedor</th>
                <th>Centro de custo</th>
                <th>Total</th>
                <th>Parcelas</th>
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
                  </td>
                  <td>{new Date(ordem.dataEmissao).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div>{ordem.fornecedor.razaoSocial}</div>
                    <div className="subtle">{ordem.fornecedor.codigo}</div>
                  </td>
                  <td>{ordem.centroCustoNome}</td>
                  <td>{formatCurrency(ordem.valorTotal)}</td>
                  <td>{ordem.parcelas.length}</td>
                  <td>
                    <span className={getStatusBadgeClass(ordem.status)}>
                      {STATUS_OPTIONS.find((status) => status.value === ordem.status)?.label ?? ordem.status}
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
