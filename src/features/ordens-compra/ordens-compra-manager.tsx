"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchableSelect, type SearchableSelectOption } from "@/components/form/searchable-select";
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
type TipoAnexo = "RELATORIO_MEDICAO" | "PEDIDO" | "NOTA_FISCAL" | "OUTRO";

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
  valorPadrao: string | number;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
};

type PlanoConta = {
  id: string;
  classificacao: string;
  nome: string;
  tipo: "DESPESA" | "RECEITA";
  categoria: string | null;
  status: "ATIVO" | "INATIVO";
};

type OrdemCompraAnexo = {
  id: string;
  tipo: TipoAnexo;
  nomeArquivo: string;
  mimeType: string;
  urlArquivo: string;
  tamanhoBytes: number;
  createdAt: string;
};

type OrdemCompra = {
  id: string;
  numeroOrdem: string;
  dataEmissao: string;
  status: StatusOrdemCompra;
  tipoCompra: TipoCompra;
  centroCustoId: string | null;
  centroCustoNome: string;
  planoContaId: string | null;
  formaPagamento: string | null;
  numeroParcelas: number;
  primeiroVencimento: string | null;
  solicitanteNome: string | null;
  observacaoFinanceira: string | null;
  observacao: string | null;
  motivoExclusao: string | null;
  excluidaEm: string | null;
  excluidaPorNome: string | null;
  valorTotal: string | number;
  fornecedor: Fornecedor;
  centroCusto: CentroCusto | null;
  planoConta: PlanoConta | null;
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
  anexos: OrdemCompraAnexo[];
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
  planoContaId: string;
  formaPagamento: string;
  numeroParcelas: string;
  primeiroVencimento: string;
  solicitanteNome: string;
  observacaoFinanceira: string;
  observacao: string;
  motivoExclusao: string;
  itens: FormItem[];
};

type FiltrosConsultaState = {
  search: string;
  fornecedorId: string;
  centroCustoId: string;
  planoContaId: string;
  tipoCompra: "TODOS" | TipoCompra;
  status: "TODOS" | StatusOrdemCompra;
  dataInicial: string;
  dataFinal: string;
};

type StatusOrdemCompraVisivel = "ABERTA" | "COMPRADA" | "RECEBIDA" | "CANCELADA";

const STATUS_OPTIONS: Array<{ value: StatusOrdemCompraVisivel; label: string }> = [
  { value: "ABERTA", label: "Em aberto" },
  { value: "COMPRADA", label: "Em andamento" },
  { value: "RECEBIDA", label: "Confirmada" },
  { value: "CANCELADA", label: "Cancelada" }
];

function normalizarStatusOrdemCompra(status: StatusOrdemCompra): StatusOrdemCompraVisivel {
  if (status === "AGUARDANDO_APROVACAO" || status === "APROVADA") {
    return "COMPRADA";
  }

  return status as StatusOrdemCompraVisivel;
}

function formatStatusOrdemCompra(status: StatusOrdemCompra) {
  const normalizedStatus = normalizarStatusOrdemCompra(status);

  return (
    STATUS_OPTIONS.find((item) => item.value === normalizedStatus)?.label ??
    normalizedStatus
  );
}

const STATUS_BADGE_CLASS_BY_STATUS: Record<StatusOrdemCompraVisivel, string> = {
  ABERTA: "badge badge-warn",
  COMPRADA: "badge badge-info",
  RECEBIDA: "badge badge-success",
  CANCELADA: "badge badge-danger"
};

const TIPO_ANEXO_OPTIONS: Array<{ value: TipoAnexo; label: string }> = [
  { value: "PEDIDO", label: "Pedido" },
  { value: "NOTA_FISCAL", label: "Nota fiscal" },
  { value: "OUTRO", label: "Documento" }
];

function formatDateInput(value: string | Date) {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatDateDisplay(value: string | Date) {
  const normalized = formatDateInput(value);
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
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
    planoContaId: "",
    formaPagamento: "",
    numeroParcelas: "1",
    primeiroVencimento: today,
    solicitanteNome: "",
    observacaoFinanceira: "",
    observacao: "",
    motivoExclusao: "",
    itens: [createEmptyItem(1)]
  };
}

function createInitialFilters(): FiltrosConsultaState {
  return {
    search: "",
    fornecedorId: "",
    centroCustoId: "",
    planoContaId: "",
    tipoCompra: "TODOS",
    status: "TODOS",
    dataInicial: "",
    dataFinal: ""
  };
}

function createFormFromOrder(ordem: OrdemCompra): FormState {
  return {
    id: ordem.id,
    dataEmissao: formatDateInput(ordem.dataEmissao),
    status: normalizarStatusOrdemCompra(ordem.status),
    tipoCompra: ordem.tipoCompra,
    fornecedorId: ordem.fornecedor.id,
    centroCustoId: ordem.centroCusto?.id ?? "",
    planoContaId: ordem.planoConta?.id ?? "",
    formaPagamento: ordem.formaPagamento ?? "",
    numeroParcelas: String(ordem.numeroParcelas),
    primeiroVencimento: formatDateInput(
      ordem.primeiroVencimento ?? ordem.parcelas[0]?.dataVencimento ?? ordem.dataEmissao
    ),
    solicitanteNome: ordem.solicitanteNome ?? "",
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
  };
}

function buildOrdensQuery(filters: FiltrosConsultaState) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }

  if (filters.fornecedorId) {
    params.set("fornecedorId", filters.fornecedorId);
  }

  if (filters.centroCustoId) {
    params.set("centroCustoId", filters.centroCustoId);
  }

  if (filters.planoContaId) {
    params.set("planoContaId", filters.planoContaId);
  }

  if (filters.tipoCompra !== "TODOS") {
    params.set("tipoCompra", filters.tipoCompra);
  }

  if (filters.status !== "TODOS") {
    params.set("status", filters.status);
  }

  if (filters.dataInicial) {
    params.set("dataInicial", filters.dataInicial);
  }

  if (filters.dataFinal) {
    params.set("dataFinal", filters.dataFinal);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatFornecedorLabel(fornecedor: Fornecedor) {
  return fornecedor.nomeFantasia
    ? `${fornecedor.nomeFantasia} (${fornecedor.razaoSocial})`
    : fornecedor.razaoSocial;
}

function formatPlanoContaLabel(planoConta: PlanoConta) {
  return `${planoConta.classificacao} - ${planoConta.nome}`;
}

function formatCatalogoLabel(item: CatalogoCompra) {
  return item.codigo ? `${item.codigo} - ${item.descricao}` : item.descricao;
}

function formatTipoAnexo(tipo: TipoAnexo) {
  if (tipo === "PEDIDO") return "Pedido";
  if (tipo === "NOTA_FISCAL") return "Nota fiscal";
  if (tipo === "RELATORIO_MEDICAO") return "Relatorio";
  return "Documento";
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
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
  return STATUS_BADGE_CLASS_BY_STATUS[normalizarStatusOrdemCompra(status)];
}

function formatTipoCompra(value: TipoCompra) {
  return value === "SERVICO" ? "Servico" : "Produto";
}

function canCancelOrder(status: StatusOrdemCompra) {
  return status !== "RECEBIDA" && status !== "CANCELADA";
}

function isOrdemCompra(value: unknown): value is OrdemCompra {
  return typeof value === "object" && value !== null && "id" in value;
}

export function OrdensCompraManager() {
  const [ordens, setOrdens] = useState<OrdemCompra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [catalogoCompra, setCatalogoCompra] = useState<CatalogoCompra[]>([]);
  const [planosConta, setPlanosConta] = useState<PlanoConta[]>([]);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemCompra | null>(null);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [message, setMessage] = useState("");
  const [filtrosConsulta, setFiltrosConsulta] = useState<FiltrosConsultaState>(() =>
    createInitialFilters()
  );
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosConsultaState>(() =>
    createInitialFilters()
  );
  const [tipoAnexo, setTipoAnexo] = useState<TipoAnexo>("OUTRO");
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [mensagemAnexo, setMensagemAnexo] = useState("");
  const [erroAnexo, setErroAnexo] = useState(false);
  const [chaveInputAnexo, setChaveInputAnexo] = useState(0);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadCatalogData() {
    const [fornecedoresResponse, centrosResponse, catalogoResponse, planosContaResponse] = await Promise.all([
      fetch("/api/fornecedores", { cache: "no-store" }),
      fetch("/api/centros-custo", { cache: "no-store" }),
      fetch("/api/catalogo-compras", { cache: "no-store" }),
      fetch("/api/plano-contas", { cache: "no-store" })
    ]);

    const fornecedoresData = (await fornecedoresResponse.json()) as { items: Fornecedor[] };
    const centrosData = (await centrosResponse.json()) as { items: CentroCusto[] };
    const catalogoData = (await catalogoResponse.json()) as { items: CatalogoCompra[] };
    const planosContaData = (await planosContaResponse.json()) as { items: PlanoConta[] };

    setFornecedores(fornecedoresData.items);
    setCentrosCusto(centrosData.items);
    setCatalogoCompra(catalogoData.items);
    setPlanosConta(planosContaData.items);
  }

  async function loadOrdens(filters = filtrosAplicados) {
    const query = buildOrdensQuery(filters);
    const response = await fetch(`/api/ordens-compra${query}`, { cache: "no-store" });
    const data = (await response.json()) as { items: OrdemCompra[] };
    setOrdens(data.items);
    return data.items;
  }

  async function refreshSelectedOrder(ordemId: string) {
    const response = await fetch(`/api/ordens-compra/${ordemId}`, { cache: "no-store" });

    if (!response.ok) {
      setOrdemSelecionada(null);
      return null;
    }

    const data = (await response.json()) as OrdemCompra;
    setOrdemSelecionada(data);
    return data;
  }

  useEffect(() => {
    void loadCatalogData();
  }, []);

  useEffect(() => {
    void loadOrdens(filtrosAplicados);
  }, [filtrosAplicados]);

  useEffect(() => {
    if (!form.id) {
      setOrdemSelecionada(null);
      return;
    }

    const ordemAtual = ordens.find((ordem) => ordem.id === form.id);

    if (ordemAtual) {
      setOrdemSelecionada(ordemAtual);
    }
  }, [ordens, form.id]);

  const fornecedoresDisponiveis = useMemo(() => {
    return fornecedores
      .filter((fornecedor) => fornecedor.status === "ATIVO" || fornecedor.id === form.fornecedorId)
      .sort((a, b) => formatFornecedorLabel(a).localeCompare(formatFornecedorLabel(b)));
  }, [fornecedores, form.fornecedorId]);

  const centrosDisponiveis = useMemo(() => {
    return centrosCusto
      .filter((centro) => centro.status === "ATIVO" || centro.id === form.centroCustoId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [centrosCusto, form.centroCustoId]);

  const fornecedoresOpcoes = useMemo<SearchableSelectOption[]>(() => {
    return fornecedoresDisponiveis.map((fornecedor) => ({
      value: fornecedor.id,
      label: formatFornecedorLabel(fornecedor)
    }));
  }, [fornecedoresDisponiveis]);

  const centrosCustoOpcoes = useMemo<SearchableSelectOption[]>(() => {
    return centrosDisponiveis.map((centro) => ({
      value: centro.id,
      label: centro.nome
    }));
  }, [centrosDisponiveis]);

  const fornecedoresFiltro = useMemo(() => {
    return fornecedores
      .filter((fornecedor) => fornecedor.status === "ATIVO")
      .sort((a, b) => formatFornecedorLabel(a).localeCompare(formatFornecedorLabel(b)));
  }, [fornecedores]);

  const centrosFiltro = useMemo(() => {
    return centrosCusto
      .filter((centro) => centro.status === "ATIVO")
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [centrosCusto]);

  const catalogoDisponivel = useMemo(() => {
    return catalogoCompra
      .filter((item) => item.tipo === form.tipoCompra)
      .filter(
        (item) => item.status === "ATIVO" || form.itens.some((linha) => linha.catalogoCompraId === item.id)
      )
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [catalogoCompra, form.tipoCompra, form.itens]);

  const catalogoOpcoes = useMemo<SearchableSelectOption[]>(() => {
    return catalogoDisponivel.map((item) => ({
      value: item.id,
      label: formatCatalogoLabel(item)
    }));
  }, [catalogoDisponivel]);

  const planosContaDisponiveis = useMemo(() => {
    return planosConta
      .filter((planoConta) => planoConta.tipo === "DESPESA")
      .filter((planoConta) => planoConta.status === "ATIVO" || planoConta.id === form.planoContaId)
      .sort((a, b) => {
        const classificacao = a.classificacao.localeCompare(b.classificacao);
        return classificacao !== 0 ? classificacao : a.nome.localeCompare(b.nome);
      });
  }, [form.planoContaId, planosConta]);

  const planosContaOpcoes = useMemo<SearchableSelectOption[]>(() => {
    return planosContaDisponiveis.map((planoConta) => ({
      value: planoConta.id,
      label: `${planoConta.classificacao} - ${planoConta.nome}`
    }));
  }, [planosContaDisponiveis]);

  const formasPagamentoOpcoes = useMemo<SearchableSelectOption[]>(() => {
    return FORMAS_PAGAMENTO_ORDEM_COMPRA.map((forma) => ({
      value: forma.valor,
      label: forma.rotulo
    }));
  }, []);

  const fornecedorSelecionado = useMemo(() => {
    return fornecedores.find((fornecedor) => fornecedor.id === form.fornecedorId) ?? null;
  }, [fornecedores, form.fornecedorId]);

  const centroSelecionado = useMemo(() => {
    return centrosCusto.find((centro) => centro.id === form.centroCustoId) ?? null;
  }, [centrosCusto, form.centroCustoId]);

  const planoContaSelecionado = useMemo(() => {
    return planosConta.find((planoConta) => planoConta.id === form.planoContaId) ?? null;
  }, [form.planoContaId, planosConta]);

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
    } else if (
      configuracaoPagamento.permiteParcelamento &&
      (!form.numeroParcelas || Number(form.numeroParcelas) < 1)
    ) {
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

  function updateFiltro<K extends keyof FiltrosConsultaState>(
    key: K,
    value: FiltrosConsultaState[K]
  ) {
    setFiltrosConsulta((current) => ({ ...current, [key]: value }));
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
          unidade: catalogo.unidadePadrao,
          valorUnitario: numberToInput(catalogo.valorPadrao)
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
    const numeroParcelas =
      pagamentoNormalizado?.numeroParcelas ?? Math.max(1, Number(form.numeroParcelas || 1));
    const primeiroVencimento = pagamentoNormalizado
      ? formatDateInput(pagamentoNormalizado.primeiroVencimento)
      : form.primeiroVencimento;

    return {
      dataEmissao: form.dataEmissao,
      status: form.status,
      tipoCompra: form.tipoCompra,
      fornecedorId: form.fornecedorId,
      centroCustoId: form.centroCustoId,
      planoContaId: form.planoContaId,
      centroCustoTipo: "SETOR",
      centroCustoNome: centroSelecionado?.nome ?? "",
      formaPagamento: form.formaPagamento,
      numeroParcelas,
      primeiroVencimento,
      solicitanteNome: form.solicitanteNome,
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

      const data = (await response.json()) as OrdemCompra | { message?: string };
      const erro =
        typeof data === "object" && data !== null && "message" in data ? data.message : undefined;

      if (!response.ok) {
        setMessage(erro ?? "Nao foi possivel salvar a ordem de compra.");
        return;
      }

      await loadOrdens(filtrosAplicados);

      if (isOrdemCompra(data)) {
        setForm(createFormFromOrder(data));
        setOrdemSelecionada(data);
      }

      setMessage(
        form.id
          ? "Ordem de compra atualizada com sucesso."
          : "Ordem de compra cadastrada com sucesso. Agora voce ja pode anexar documentos."
      );
    });
  }

  function handleEdit(ordem: OrdemCompra) {
    setForm(createFormFromOrder(ordem));
    setOrdemSelecionada(ordem);
    setMensagemAnexo("");
    setErroAnexo(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReset() {
    setForm(createInitialForm());
    setOrdemSelecionada(null);
    setTipoAnexo("OUTRO");
    setArquivoAnexo(null);
    setMensagemAnexo("");
    setErroAnexo(false);
    setChaveInputAnexo((current) => current + 1);
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

      await loadOrdens(filtrosAplicados);

      if (form.id === ordem.id) {
        const ordemAtualizada = await refreshSelectedOrder(ordem.id);

        if (ordemAtualizada) {
          setForm(createFormFromOrder(ordemAtualizada));
        }
      }

      setMessage(`Ordem ${ordem.numeroOrdem} cancelada com sucesso.`);
    });
  }

  async function handleUploadAnexo() {
    if (!form.id) {
      setErroAnexo(true);
      setMensagemAnexo("Salve a ordem de compra antes de anexar documentos.");
      return;
    }

    if (!arquivoAnexo) {
      setErroAnexo(true);
      setMensagemAnexo("Selecione um arquivo antes de anexar.");
      return;
    }

    setIsUploadingAttachment(true);
    setErroAnexo(false);
    setMensagemAnexo("");

    const body = new FormData();
    body.append("tipo", tipoAnexo);
    body.append("file", arquivoAnexo);

    try {
      const response = await fetch(`/api/ordens-compra/${form.id}/anexos`, {
        method: "POST",
        body
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErroAnexo(true);
        setMensagemAnexo(data.message ?? "Nao foi possivel anexar o arquivo.");
        return;
      }

      await loadOrdens(filtrosAplicados);
      await refreshSelectedOrder(form.id);

      setArquivoAnexo(null);
      setTipoAnexo("OUTRO");
      setChaveInputAnexo((current) => current + 1);
      setErroAnexo(false);
      setMensagemAnexo("Arquivo anexado com sucesso.");
    } finally {
      setIsUploadingAttachment(false);
    }
  }

  function handleAplicarFiltros(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFiltrosAplicados({ ...filtrosConsulta });
  }

  function handleLimparFiltros() {
    const initial = createInitialFilters();
    setFiltrosConsulta(initial);
    setFiltrosAplicados(initial);
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Ordem de compra</h1>
          <p className="page-copy">
            Fluxo financeiro com fornecedor, centro de custo, catalogo, pagamento e anexos da compra.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {form.id && ordemSelecionada
                ? `Editar ${ordemSelecionada.numeroOrdem}`
                : "Nova ordem de compra"}
            </h2>
            <p className="section-copy">
              Selecione o tipo da compra primeiro para carregar apenas os produtos ou servicos corretos.
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
                <SearchableSelect
                  value={form.fornecedorId}
                  options={fornecedoresOpcoes}
                  placeholder="Digite para buscar o fornecedor"
                  emptyLabel="Nenhum fornecedor encontrado."
                  onChange={(value) => updateField("fornecedorId", value)}
                />
              </Field>
              <Field label="Centro de custo">
                <SearchableSelect
                  value={form.centroCustoId}
                  options={centrosCustoOpcoes}
                  placeholder="Digite para buscar o centro de custo"
                  emptyLabel="Nenhum centro de custo encontrado."
                  onChange={(value) => updateField("centroCustoId", value)}
                />
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
              <Field label="Solicitado por">
                <input
                  className="field-control"
                  placeholder="Nome de quem solicitou a ordem"
                  value={form.solicitanteNome}
                  onChange={(event) => updateField("solicitanteNome", event.target.value)}
                />
              </Field>
            </div>

            {fornecedorSelecionado || centroSelecionado ? (
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
                    <strong>{fornecedorSelecionado.razaoSocial}</strong>
                    <p className="section-copy" style={{ marginTop: 8, marginBottom: 0 }}>
                      {fornecedorSelecionado.nomeFantasia ?? "-"} | CNPJ: {fornecedorSelecionado.cnpj ?? "-"} |{" "}
                      {fornecedorSelecionado.telefone ?? "-"} | {fornecedorSelecionado.email ?? "-"}
                    </p>
                  </>
                ) : null}
                {centroSelecionado ? (
                  <p className="section-copy" style={{ marginTop: 8, marginBottom: 0 }}>
                    Centro de custo: <strong>{centroSelecionado.nome}</strong>
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
                          <div style={{ minWidth: 300 }}>
                            <SearchableSelect
                              value={item.catalogoCompraId}
                              options={catalogoOpcoes}
                              placeholder={`Digite para buscar ${form.tipoCompra === "SERVICO" ? "o servico" : "o produto"}`}
                              emptyLabel={`Nenhum ${form.tipoCompra === "SERVICO" ? "servico" : "produto"} encontrado.`}
                              onChange={(value) => handleSelectCatalogo(index, value)}
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            className="field-control"
                            value={item.codigo}
                            onChange={(event) => updateItem(index, "codigo", event.target.value)}
                            style={{ minWidth: 110 }}
                          />
                        </td>
                        <td>
                          <input
                            className="field-control"
                            value={item.descricao}
                            onChange={(event) => updateItem(index, "descricao", event.target.value)}
                            style={{ minWidth: 180 }}
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
              <Field label="Plano de conta">
                <SearchableSelect
                  value={form.planoContaId}
                  options={planosContaOpcoes}
                  placeholder="Digite para buscar o plano de conta"
                  emptyLabel="Nenhum plano de conta encontrado."
                  onChange={(value) => updateField("planoContaId", value)}
                />
              </Field>

              <Field label="Forma de pagamento">
                <SearchableSelect
                  value={form.formaPagamento}
                  options={formasPagamentoOpcoes}
                  placeholder="Digite para buscar a forma de pagamento"
                  emptyLabel="Nenhuma forma de pagamento encontrada."
                  onChange={(value) => updateField("formaPagamento", value)}
                />
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
                  value={parcelasPreview[0] ? formatCurrency(parcelasPreview[0].valorParcela) : "R$ 0,00"}
                  readOnly
                />
              </Field>
            </div>

            {planoContaSelecionado ? (
              <p className="section-copy" style={{ marginTop: 14, marginBottom: 0 }}>
                Plano financeiro selecionado:{" "}
                <strong>{formatPlanoContaLabel(planoContaSelecionado)}</strong>
              </p>
            ) : null}

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
                          {parcela.numeroParcela}/
                          {pagamentoNormalizado?.numeroParcelas ?? Math.max(1, Number(form.numeroParcelas || 1))}
                        </td>
                        <td>{formatDateDisplay(parcela.dataVencimento)}</td>
                        <td>{formatCurrency(parcela.valorParcela)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface" style={{ padding: 20, border: "1px solid var(--line-strong)" }}>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <h3 className="section-title" style={{ marginBottom: 4 }}>
                  Anexos da ordem
                </h3>
                <p className="section-copy">
                  Anexe documentos, pedidos, notas fiscais e arquivos de apoio vinculados a esta ordem.
                </p>
              </div>
            </div>

            {!form.id ? (
              <p className="section-copy" style={{ margin: 0 }}>
                Salve a ordem de compra primeiro para liberar o campo de anexo.
              </p>
            ) : (
              <>
                <div className="form-grid-4" style={{ alignItems: "end" }}>
                  <Field label="Tipo do anexo">
                    <select
                      className="field-control"
                      value={tipoAnexo}
                      onChange={(event) => setTipoAnexo(event.target.value as TipoAnexo)}
                    >
                      {TIPO_ANEXO_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Arquivo">
                    <input
                      key={chaveInputAnexo}
                      className="field-control"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.xml,.doc,.docx,.xls,.xlsx"
                      onChange={(event) => setArquivoAnexo(event.target.files?.[0] ?? null)}
                    />
                  </Field>
                  <div style={{ display: "grid", alignContent: "end" }}>
                    <button
                      type="button"
                      className="button-primary"
                      disabled={isUploadingAttachment}
                      onClick={() => void handleUploadAnexo()}
                    >
                      {isUploadingAttachment ? "Anexando..." : "Anexar arquivo"}
                    </button>
                  </div>
                </div>

                {mensagemAnexo ? (
                  <p className={erroAnexo ? "message-inline message-inline-danger" : "message-inline"}>
                    {mensagemAnexo}
                  </p>
                ) : null}

                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  {ordemSelecionada?.anexos.length ? (
                    ordemSelecionada.anexos.map((anexo) => (
                      <div
                        key={anexo.id}
                        className="surface"
                        style={{
                          padding: 16,
                          border: "1px solid var(--line-strong)",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 16,
                          alignItems: "center",
                          flexWrap: "wrap"
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <strong>{anexo.nomeArquivo}</strong>
                          <span className="section-copy" style={{ margin: 0 }}>
                            {formatTipoAnexo(anexo.tipo)} | {formatBytes(anexo.tamanhoBytes)} |{" "}
                            {new Date(anexo.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <a href={anexo.urlArquivo} target="_blank" rel="noreferrer" className="button-secondary">
                          Abrir anexo
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="section-copy" style={{ margin: 0 }}>
                      Nenhum anexo vinculado a esta ordem.
                    </p>
                  )}
                </div>
              </>
            )}
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
            <h2 className="section-title">Consulta de ordens de compra</h2>
            <p className="section-copy">
              Use os filtros abaixo para localizar ordens por fornecedor, plano de conta, periodo, centro de custo, status e tipo.
            </p>
          </div>
        </div>

        <form onSubmit={handleAplicarFiltros} style={{ display: "grid", gap: 18 }}>
          <div className="form-grid-4">
            <Field label="Busca geral">
              <input
                className="field-control"
                placeholder="Numero da ordem, fornecedor, plano de conta, observacao, item ou centro de custo"
                value={filtrosConsulta.search}
                onChange={(event) => updateFiltro("search", event.target.value)}
              />
            </Field>
            <Field label="Fornecedor">
              <select
                className="field-control"
                value={filtrosConsulta.fornecedorId}
                onChange={(event) => updateFiltro("fornecedorId", event.target.value)}
              >
                <option value="">Todos os fornecedores</option>
                {fornecedoresFiltro.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {formatFornecedorLabel(fornecedor)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Centro de custo">
              <select
                className="field-control"
                value={filtrosConsulta.centroCustoId}
                onChange={(event) => updateFiltro("centroCustoId", event.target.value)}
              >
                <option value="">Todos os centros de custo</option>
                {centrosFiltro.map((centro) => (
                  <option key={centro.id} value={centro.id}>
                    {centro.nome}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plano de conta">
              <select
                className="field-control"
                value={filtrosConsulta.planoContaId}
                onChange={(event) => updateFiltro("planoContaId", event.target.value)}
              >
                <option value="">Todos os planos de conta</option>
                {planosContaDisponiveis.map((planoConta) => (
                  <option key={planoConta.id} value={planoConta.id}>
                    {formatPlanoContaLabel(planoConta)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="form-grid-4">
            <Field label="Tipo da compra">
              <select
                className="field-control"
                value={filtrosConsulta.tipoCompra}
                onChange={(event) =>
                  updateFiltro("tipoCompra", event.target.value as "TODOS" | TipoCompra)
                }
              >
                <option value="TODOS">Todos os tipos</option>
                <option value="PRODUTO">Produto</option>
                <option value="SERVICO">Servico</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="field-control"
                value={filtrosConsulta.status}
                onChange={(event) =>
                  updateFiltro("status", event.target.value as "TODOS" | StatusOrdemCompra)
                }
              >
                <option value="TODOS">Todos os status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Emissao inicial">
              <input
                className="field-control"
                type="date"
                value={filtrosConsulta.dataInicial}
                onChange={(event) => updateFiltro("dataInicial", event.target.value)}
              />
            </Field>
            <Field label="Emissao final">
              <input
                className="field-control"
                type="date"
                value={filtrosConsulta.dataFinal}
                onChange={(event) => updateFiltro("dataFinal", event.target.value)}
              />
            </Field>
          </div>

          <div className="toolbar-actions">
            <button type="submit" className="button-primary" disabled={isPending}>
              Aplicar filtros
            </button>
            <button type="button" className="button-secondary" onClick={handleLimparFiltros}>
              Limpar filtros
            </button>
          </div>
        </form>

        <div className="section-header" style={{ marginTop: 24 }}>
          <div>
            <h3 className="section-title">Ordens encontradas</h3>
            <p className="section-copy">{ordens.length} registro(s) encontrado(s).</p>
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
              {ordens.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    Nenhuma ordem de compra encontrada para os filtros informados.
                  </td>
                </tr>
              ) : (
                ordens.map((ordem) => (
                  <tr key={ordem.id}>
                    <td>
                      <div>{ordem.numeroOrdem}</div>
                      <div className="subtle">Criada por {ordem.criadoPor.nome}</div>
                      {ordem.motivoExclusao ? (
                        <div className="subtle">Motivo: {ordem.motivoExclusao}</div>
                      ) : null}
                    </td>
                    <td>{formatDateDisplay(ordem.dataEmissao)}</td>
                    <td>{formatTipoCompra(ordem.tipoCompra)}</td>
                    <td>
                      <div>{ordem.fornecedor.razaoSocial}</div>
                      {ordem.fornecedor.nomeFantasia ? (
                        <div className="subtle">{ordem.fornecedor.nomeFantasia}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{ordem.centroCustoNome}</div>
                      <div className="subtle">
                        {ordem.planoConta ? formatPlanoContaLabel(ordem.planoConta) : "Plano nao informado"}
                      </div>
                    </td>
                    <td>{formatCurrency(ordem.valorTotal)}</td>
                    <td>
                      <span className={getStatusBadgeClass(ordem.status)}>
                        {formatStatusOrdemCompra(ordem.status)}
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
                        {canCancelOrder(ordem.status) ? (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
