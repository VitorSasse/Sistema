"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
import { formatDateDisplay, formatDateInputValue } from "@/lib/utils/date";

type TipoOrcamento = "COMERCIAL" | "OPERACIONAL";
type StatusOrcamento =
  | "RASCUNHO"
  | "EM_ELABORACAO"
  | "EM_REVISAO"
  | "PRONTO_PARA_PROPOSTA"
  | "PROPOSTA_EMITIDA"
  | "EM_NEGOCIACAO"
  | "APROVADO"
  | "REPROVADO"
  | "ARQUIVADO";
type TipoItemOrcamento =
  | "COMERCIAL"
  | "SERVICO_PRINCIPAL"
  | "SERVICO_AUXILIAR"
  | "RECURSO"
  | "MATERIAL"
  | "OUTRO";
type TipoPremissaOrcamento = "PREMISSA" | "CONDICAO" | "EXCLUSAO" | "OBSERVACAO";

type ClienteOption = {
  id: string;
  codigo: string;
  nome: string;
};

type ObraOption = {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
};

type ServicoOption = {
  id: string;
  codigo: string;
  tipoServico: string;
  unidadeFaturamento?: string | null;
};

type MaterialOption = {
  id: string;
  codigoMaterial: string;
  descricao: string;
};

type EquipamentoOption = {
  id: string;
  placaOuTag: string;
  descricao: string;
  tipoRecurso: string;
};

type UsuarioOption = {
  id: string;
  nome: string;
  email: string;
  status: string;
};

type OptionsState = {
  clientes: ClienteOption[];
  obras: ObraOption[];
  servicos: ServicoOption[];
  materiais: MaterialOption[];
  equipamentos: EquipamentoOption[];
  usuarios: UsuarioOption[];
};

type FrenteForm = {
  localId: string;
  ordem: number;
  nome: string;
  descricao: string;
  metodoExecutivo: string;
  unidadeProducao: string;
  quantidadePrevista: string;
  produtividadeDia: string;
  prazoEstimadoDias: string;
  calculoReferencia: "produtividadeDia" | "prazoEstimadoDias" | "";
  observacao: string;
};

type ItemForm = {
  localId: string;
  frenteTempId: string;
  tipoItem: TipoItemOrcamento;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  ordem: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  produtividade: string;
  custoUnitario: string;
  valorUnitario: string;
  observacao: string;
};

type FormacaoPrecoForm = {
  custoDireto: string;
  custoIndireto: string;
  impostosPercentual: string;
  impostosValor: string;
  margemPercentual: string;
  margemValor: string;
  precoSugerido: string;
  precoFinal: string;
  observacao: string;
};

type PremissaForm = {
  localId: string;
  tipo: TipoPremissaOrcamento;
  ordem: number;
  titulo: string;
  descricao: string;
};

type ApiValidationError = {
  campo?: string;
  path?: string;
  mensagem?: string;
  message?: string;
  codigo?: string;
};

type ApiErrorPayload = {
  message?: string;
  detail?: string;
  validationErrors?: ApiValidationError[];
  issues?:
    | {
        formErrors?: string[];
        fieldErrors?: Record<string, string[]>;
      }
    | ApiValidationError[];
};

type OrcamentoForm = {
  id?: string;
  tipo: TipoOrcamento;
  status: StatusOrcamento;
  clienteId: string;
  obraId: string;
  responsavelId: string;
  dataOrcamento: string;
  validadeAte: string;
  titulo: string;
  objeto: string;
  observacaoInterna: string;
  observacaoCliente: string;
  valorDesconto: string;
  valorAcrescimo: string;
  formacaoPreco: FormacaoPrecoForm;
  frentes: FrenteForm[];
  itens: ItemForm[];
  premissas: PremissaForm[];
};

type OrcamentoApi = {
  id: string;
  codigo: string;
  tipo: TipoOrcamento;
  status: StatusOrcamento;
  clienteId: string;
  obraId: string | null;
  responsavelId: string | null;
  dataOrcamento: string;
  validadeAte: string | null;
  titulo: string | null;
  objeto: string | null;
  observacaoInterna: string | null;
  observacaoCliente: string | null;
  valorSubtotal: string | number;
  valorDesconto: string | number;
  valorAcrescimo: string | number;
  valorTotal: string | number;
  cliente?: {
    nome: string;
    codigo?: string | null;
  };
  obra?: {
    nome: string;
    codigo?: string | null;
  } | null;
  responsavel?: {
    nome: string;
  } | null;
  formacaoPreco?: Partial<FormacaoPrecoForm> | null;
  frentes: Array<{
    id: string;
    ordem: number;
    nome: string;
    descricao: string | null;
    metodoExecutivo: string | null;
    unidadeProducao: string | null;
    quantidadePrevista: string | number | null;
    produtividadeDia: string | number | null;
    prazoEstimadoDias: string | number | null;
    observacao: string | null;
  }>;
  itens: Array<{
    id: string;
    frenteId: string | null;
    tipoItem: TipoItemOrcamento;
    servicoId: string | null;
    materialId: string | null;
    equipamentoId: string | null;
    ordem: number;
    codigo: string | null;
    descricao: string;
    unidade: string;
    quantidade: string | number;
    produtividade: string | number | null;
    custoUnitario: string | number;
    valorUnitario: string | number;
    observacao: string | null;
  }>;
  premissas: Array<{
    id: string;
    tipo: TipoPremissaOrcamento;
    ordem: number;
    titulo: string | null;
    descricao: string;
  }>;
};

type OrcamentoResumoApi = Pick<
  OrcamentoApi,
  | "id"
  | "codigo"
  | "tipo"
  | "status"
  | "titulo"
  | "objeto"
  | "valorTotal"
  | "cliente"
  | "obra"
>;

const statusOptions: { value: StatusOrcamento; label: string }[] = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "EM_ELABORACAO", label: "Em elaboracao" },
  { value: "EM_REVISAO", label: "Em revisao" },
  { value: "PRONTO_PARA_PROPOSTA", label: "Pronto para proposta" },
  { value: "PROPOSTA_EMITIDA", label: "Proposta emitida" },
  { value: "EM_NEGOCIACAO", label: "Em negociacao" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "ARQUIVADO", label: "Arquivado" }
];

const tipoOptions: { value: TipoOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "OPERACIONAL", label: "Operacional" }
];

const tipoItemOptions: { value: TipoItemOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "SERVICO_PRINCIPAL", label: "Servico principal" },
  { value: "SERVICO_AUXILIAR", label: "Servico auxiliar" },
  { value: "RECURSO", label: "Recurso" },
  { value: "MATERIAL", label: "Material" },
  { value: "OUTRO", label: "Outro" }
];

const tipoItemOperacionalOptions = tipoItemOptions.filter((option) => option.value !== "COMERCIAL");

const premissaTipoOptions: { value: TipoPremissaOrcamento; label: string; helper: string }[] = [
  {
    value: "PREMISSA",
    label: "Premissas tecnicas",
    helper: "Base tecnica considerada para executar e precificar o escopo."
  },
  {
    value: "CONDICAO",
    label: "Condicoes comerciais",
    helper: "Prazo, pagamento, validade e criterios comerciais da proposta."
  },
  {
    value: "EXCLUSAO",
    label: "Exclusoes do escopo",
    helper: "Itens explicitamente nao considerados na proposta."
  },
  {
    value: "OBSERVACAO",
    label: "Observacoes complementares",
    helper: "Notas gerais para contextualizar a proposta ao cliente."
  }
];

const emptyOptions: OptionsState = {
  clientes: [],
  obras: [],
  servicos: [],
  materiais: [],
  equipamentos: [],
  usuarios: []
};

function todayInput() {
  return formatDateInputValue(new Date());
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyForm(): OrcamentoForm {
  return {
    tipo: "COMERCIAL",
    status: "RASCUNHO",
    clienteId: "",
    obraId: "",
    responsavelId: "",
    dataOrcamento: todayInput(),
    validadeAte: "",
    titulo: "",
    objeto: "",
    observacaoInterna: "",
    observacaoCliente: "",
    valorDesconto: "0",
    valorAcrescimo: "0",
    formacaoPreco: {
      custoDireto: "0",
      custoIndireto: "0",
      impostosPercentual: "0",
      impostosValor: "0",
      margemPercentual: "0",
      margemValor: "0",
      precoSugerido: "0",
      precoFinal: "0",
      observacao: ""
    },
    frentes: [],
    itens: [createEmptyItem("COMERCIAL", 1)],
    premissas: createInitialPremissas()
  };
}

function createEmptyFrente(ordem: number): FrenteForm {
  return {
    localId: uid("frente"),
    ordem,
    nome: `Frente ${ordem}`,
    descricao: "",
    metodoExecutivo: "",
    unidadeProducao: "",
    quantidadePrevista: "",
    produtividadeDia: "",
    prazoEstimadoDias: "",
    calculoReferencia: "",
    observacao: ""
  };
}

function createEmptyItem(tipoItem: TipoItemOrcamento, ordem: number, frenteTempId = ""): ItemForm {
  return {
    localId: uid("item"),
    frenteTempId,
    tipoItem,
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    ordem,
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    produtividade: "",
    custoUnitario: "0",
    valorUnitario: "0",
    observacao: ""
  };
}

function createInitialPremissas() {
  return premissaTipoOptions.map((option, index) => createEmptyPremissa(option.value, index + 1));
}

function createEmptyPremissa(tipo: TipoPremissaOrcamento, ordem: number): PremissaForm {
  return {
    localId: uid("premissa"),
    tipo,
    ordem,
    titulo: "",
    descricao: ""
  };
}

function reordenarItens(itens: ItemForm[]) {
  return itens.map((item, index) => ({ ...item, ordem: index + 1 }));
}

function formatCurrency(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value?: string | null) {
  return formatDateDisplay(value);
}

function toDateInput(value?: string | null) {
  return formatDateInputValue(value);
}

function toStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function getStatusLabel(value: StatusOrcamento) {
  return statusOptions.find((option) => option.value === value)?.label ?? value;
}

function getTipoLabel(value: TipoOrcamento) {
  return tipoOptions.find((option) => option.value === value)?.label ?? value;
}

function calcItemTotal(item: Pick<ItemForm, "quantidade" | "valorUnitario">) {
  return (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
}

function calcItemCost(item: Pick<ItemForm, "quantidade" | "custoUnitario">) {
  return (Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0);
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseFrenteNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFrenteNumber(value: number) {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function isPositiveFrenteNumber(value: number | null) {
  return value !== null && value > 0;
}

function normalizeUnidadeProducao(unidade: string) {
  const value = unidade.trim();
  const normalized = value.toLowerCase();

  if (!value) return "unidade";
  if (["m3", "m³"].includes(normalized)) return "m³";
  if (["m2", "m²"].includes(normalized)) return "m²";
  if (["ton", "tons", "tonelada", "toneladas"].includes(normalized)) return "t";
  if (["carga", "cargas"].includes(normalized)) return "cargas";
  if (["hora", "horas", "h"].includes(normalized)) return "horas";

  return value;
}

function getProdutividadeLabel(unidade: string) {
  return `Produção média diária (${normalizeUnidadeProducao(unidade)}/dia)`;
}

function getFrenteCalculoMessage(frente: FrenteForm) {
  const quantidade = parseFrenteNumber(frente.quantidadePrevista);
  const produtividade = parseFrenteNumber(frente.produtividadeDia);
  const prazo = parseFrenteNumber(frente.prazoEstimadoDias);
  const hasQuantidade = frente.quantidadePrevista.trim() !== "";
  const hasProdutividade = frente.produtividadeDia.trim() !== "";
  const hasPrazo = frente.prazoEstimadoDias.trim() !== "";

  if ((hasQuantidade && !isPositiveFrenteNumber(quantidade)) || (hasProdutividade && !isPositiveFrenteNumber(produtividade))) {
    return "Informe um valor maior que zero.";
  }

  if (hasPrazo && !isPositiveFrenteNumber(prazo)) {
    return "Informe um valor maior que zero.";
  }

  return "";
}

function recalcularFrentePlanejamento(
  frente: FrenteForm,
  key: keyof FrenteForm,
  value: string | number
): FrenteForm {
  const next: FrenteForm = {
    ...frente,
    [key]: String(value)
  };

  const quantidade = parseFrenteNumber(next.quantidadePrevista);
  const produtividade = parseFrenteNumber(next.produtividadeDia);
  const prazo = parseFrenteNumber(next.prazoEstimadoDias);

  if (key === "produtividadeDia") {
    next.calculoReferencia = "produtividadeDia";

    if (quantidade !== null && quantidade > 0 && produtividade !== null && produtividade > 0) {
      next.prazoEstimadoDias = formatFrenteNumber(quantidade / produtividade);
    }

    return next;
  }

  if (key === "prazoEstimadoDias") {
    next.calculoReferencia = "prazoEstimadoDias";

    if (quantidade !== null && quantidade > 0 && prazo !== null && prazo > 0) {
      next.produtividadeDia = formatFrenteNumber(quantidade / prazo);
    }

    return next;
  }

  if (key === "quantidadePrevista") {
    const referencia =
      next.calculoReferencia ||
      (isPositiveFrenteNumber(produtividade)
        ? "produtividadeDia"
        : isPositiveFrenteNumber(prazo)
          ? "prazoEstimadoDias"
          : "");

    if (
      referencia === "produtividadeDia" &&
      quantidade !== null &&
      quantidade > 0 &&
      produtividade !== null &&
      produtividade > 0
    ) {
      next.prazoEstimadoDias = formatFrenteNumber(quantidade / produtividade);
    }

    if (
      referencia === "prazoEstimadoDias" &&
      quantidade !== null &&
      quantidade > 0 &&
      prazo !== null &&
      prazo > 0
    ) {
      next.produtividadeDia = formatFrenteNumber(quantidade / prazo);
    }
  }

  return next;
}

function formatValidationError(error: ApiValidationError) {
  const field = error.campo ?? error.path;
  const message = error.mensagem ?? error.message ?? "Validacao rejeitada.";

  return field ? `${field}: ${message}` : message;
}

function parseApiErrorPayload(payload: ApiErrorPayload, fallback: string) {
  const details: string[] = [];

  if (Array.isArray(payload.validationErrors)) {
    details.push(...payload.validationErrors.map(formatValidationError));
  }

  if (Array.isArray(payload.issues)) {
    details.push(...payload.issues.map(formatValidationError));
  } else if (payload.issues) {
    details.push(...(payload.issues.formErrors ?? []));

    for (const [field, messages] of Object.entries(payload.issues.fieldErrors ?? {})) {
      details.push(...messages.map((message) => `${field}: ${message}`));
    }
  }

  if (payload.detail && details.length === 0) {
    details.push(payload.detail);
  }

  return {
    message: payload.message ?? fallback,
    details: Array.from(new Set(details.filter(Boolean)))
  };
}

function buildEconomicPreview(form: OrcamentoForm) {
  const isOperational = form.tipo === "OPERACIONAL";
  const subtotalItens = roundMoney(form.itens.reduce((sum, item) => sum + calcItemTotal(item), 0));
  const itensParaCusto = isOperational
    ? form.itens.filter((item) => item.frenteTempId)
    : form.itens;
  const custoItens = roundMoney(itensParaCusto.reduce((sum, item) => sum + calcItemCost(item), 0));
  const custoDiretoManual = Number(form.formacaoPreco.custoDireto) || 0;
  const custoDireto = roundMoney(custoItens > 0 ? custoItens : custoDiretoManual);
  const custoIndireto = roundMoney(Number(form.formacaoPreco.custoIndireto) || 0);
  const baseCustos = roundMoney(custoDireto + custoIndireto);
  const margemPercentual = Number(form.formacaoPreco.margemPercentual) || 0;
  const margemManual = Number(form.formacaoPreco.margemValor) || 0;
  const margemValor = roundMoney(
    margemManual > 0 ? margemManual : baseCustos * (margemPercentual / 100)
  );
  const impostosPercentual = Number(form.formacaoPreco.impostosPercentual) || 0;
  const impostosManual = Number(form.formacaoPreco.impostosValor) || 0;
  const impostosValor = roundMoney(
    impostosManual > 0
      ? impostosManual
      : (baseCustos + margemValor) * (impostosPercentual / 100)
  );
  const precoSugeridoCalculado = roundMoney(baseCustos + margemValor + impostosValor);
  const precoSugeridoManual = isOperational ? 0 : Number(form.formacaoPreco.precoSugerido) || 0;
  const precoSugerido = roundMoney(
    precoSugeridoManual > 0 ? precoSugeridoManual : precoSugeridoCalculado
  );
  const precoFinalManual = roundMoney(Number(form.formacaoPreco.precoFinal) || 0);
  const baseVenda = roundMoney(
    isOperational
      ? precoFinalManual > 0
        ? precoFinalManual
        : precoSugerido
      : precoFinalManual > 0
        ? precoFinalManual
        : subtotalItens > 0
          ? subtotalItens
          : precoSugerido
  );
  const desconto = roundMoney(Number(form.valorDesconto) || 0);
  const acrescimo = roundMoney(Number(form.valorAcrescimo) || 0);
  const total = roundMoney(Math.max(0, baseVenda - desconto + acrescimo));

  return {
    isOperational,
    subtotalItens,
    custoItens,
    custoDireto,
    custoIndireto,
    baseCustos,
    margemValor,
    impostosValor,
    precoSugerido,
    precoFinalManual,
    baseVenda,
    desconto,
    acrescimo,
    total
  };
}

export function OrcamentosManager() {
  const [items, setItems] = useState<OrcamentoResumoApi[]>([]);
  const [options, setOptions] = useState<OptionsState>(emptyOptions);
  const [form, setForm] = useState<OrcamentoForm>(() => createEmptyForm());
  const [selectedId, setSelectedId] = useState<string>("");
  const [filters, setFilters] = useState({
    search: "",
    tipo: "TODOS",
    status: "TODOS"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  function clearError() {
    setError("");
    setErrorDetails([]);
  }

  function applyApiError(payload: ApiErrorPayload, fallback: string) {
    const parsed = parseApiErrorPayload(payload, fallback);
    setError(parsed.message);
    setErrorDetails(parsed.details);
  }

  const clienteOptions = useMemo(
    () =>
      options.clientes.map((cliente) => ({
        value: cliente.id,
        label: `${cliente.codigo} - ${cliente.nome}`
      })),
    [options.clientes]
  );

  const obraOptions = useMemo(
    () =>
      options.obras
        .filter((obra) => !form.clienteId || obra.clienteId === form.clienteId)
        .map((obra) => ({
          value: obra.id,
          label: `${obra.codigo} - ${obra.nome}`
        })),
    [form.clienteId, options.obras]
  );

  const responsavelOptions = useMemo(
    () =>
      options.usuarios
        .filter((usuario) => usuario.status === "ATIVO")
        .map((usuario) => ({
          value: usuario.id,
          label: `${usuario.nome} - ${usuario.email}`
        })),
    [options.usuarios]
  );

  const servicoOptions = useMemo(
    () =>
      options.servicos.map((servico) => ({
        value: servico.id,
        label: `${servico.codigo} - ${servico.tipoServico}`
      })),
    [options.servicos]
  );

  const materialOptions = useMemo(
    () =>
      options.materiais.map((material) => ({
        value: material.id,
        label: `${material.codigoMaterial} - ${material.descricao}`
      })),
    [options.materiais]
  );

  const equipamentoOptions = useMemo(
    () =>
      options.equipamentos.map((equipamento) => ({
        value: equipamento.id,
        label: `${equipamento.placaOuTag} - ${equipamento.descricao}`
      })),
    [options.equipamentos]
  );

  const economicPreview = useMemo(() => buildEconomicPreview(form), [form]);
  const subtotalForm = economicPreview.subtotalItens;
  const custoDiretoForm = economicPreview.custoDireto;
  const custoIndiretoForm = economicPreview.custoIndireto;
  const baseCustosForm = economicPreview.baseCustos;
  const margemValorForm = economicPreview.margemValor;
  const impostosValorForm = economicPreview.impostosValor;
  const precoSugeridoForm = economicPreview.precoSugerido;
  const baseVendaForm = economicPreview.baseVenda;
  const totalForm = economicPreview.total;
  const prazoEstimadoForm = useMemo(
    () =>
      form.frentes.reduce(
        (maiorPrazo, frente) => Math.max(maiorPrazo, Number(frente.prazoEstimadoDias) || 0),
        0
      ),
    [form.frentes]
  );

  useEffect(() => {
    async function init() {
      await loadOptions();
      await loadOrcamentos();
    }

    init();
  }, []);

  async function loadOptions() {
    const operacionaisResponse = await fetch("/api/opcoes/operacionais");
    const usuariosResponse = await fetch("/api/usuarios");

    const operacionais = operacionaisResponse.ok ? await operacionaisResponse.json() : emptyOptions;
    const usuarios = usuariosResponse.ok ? await usuariosResponse.json() : { items: [] };

    setOptions({
      clientes: operacionais.clientes ?? [],
      obras: operacionais.obras ?? [],
      servicos: operacionais.servicos ?? [],
      materiais: operacionais.materiais ?? [],
      equipamentos: operacionais.equipamentos ?? [],
      usuarios: usuarios.items ?? []
    });
  }

  async function loadOrcamentos(nextFilters = filters) {
    setLoading(true);
    clearError();

    const params = new URLSearchParams();
    if (nextFilters.search.trim()) params.set("search", nextFilters.search.trim());
    if (nextFilters.tipo !== "TODOS") params.set("tipo", nextFilters.tipo);
    if (nextFilters.status !== "TODOS") params.set("status", nextFilters.status);

    const response = await fetch(`/api/orcamentos?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel carregar os orcamentos.");
      setLoading(false);
      return;
    }

    setItems(data.items ?? []);
    setLoading(false);
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    const next = {
      ...filters,
      [key]: value
    };
    setFilters(next);
    loadOrcamentos(next);
  }

  function updateForm<K extends keyof OrcamentoForm>(key: K, value: OrcamentoForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateFormacao(key: keyof FormacaoPrecoForm, value: string) {
    setForm((current) => ({
      ...current,
      formacaoPreco: {
        ...current.formacaoPreco,
        [key]: value
      }
    }));
  }

  function updateFrente(localId: string, key: keyof FrenteForm, value: string | number) {
    setForm((current) => ({
      ...current,
      frentes: current.frentes.map((frente) =>
        frente.localId === localId ? recalcularFrentePlanejamento(frente, key, value) : frente
      )
    }));
  }

  function updateItem(localId: string, key: keyof ItemForm, value: string | number) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) =>
        item.localId === localId ? { ...item, [key]: value } : item
      )
    }));
  }

  function handleTipoChange(tipo: TipoOrcamento) {
    setForm((current) => {
      if (tipo === "OPERACIONAL") {
        const frente = current.frentes[0] ?? createEmptyFrente(1);
        const itensPreenchidos = current.itens.filter(isItemPreenchido);
        const itensOperacionais = itensPreenchidos.length
          ? itensPreenchidos.map((item, index) => ({
              ...item,
              ordem: index + 1,
              tipoItem:
                index === 0
                  ? "SERVICO_PRINCIPAL"
                  : item.tipoItem === "COMERCIAL"
                    ? "SERVICO_AUXILIAR"
                    : item.tipoItem,
              frenteTempId: item.frenteTempId || frente.localId
            }))
          : [createEmptyItem("SERVICO_PRINCIPAL", 1, frente.localId)];

        return {
          ...current,
          tipo,
          status: current.status === "RASCUNHO" ? "EM_ELABORACAO" : current.status,
          frentes: current.frentes.length ? current.frentes : [frente],
          itens: itensOperacionais
        };
      }

      if (tipo === "COMERCIAL") {
        return {
          ...current,
          tipo,
          frentes: [],
          itens: current.itens.map((item) => ({
            ...item,
            tipoItem: "COMERCIAL",
            frenteTempId: ""
          }))
        };
      }

      return {
        ...current,
        tipo
      };
    });
  }

  function addFrente() {
    setForm((current) => {
      const frente = createEmptyFrente(current.frentes.length + 1);

      return {
        ...current,
        frentes: [...current.frentes, frente],
        itens:
          current.tipo === "OPERACIONAL"
            ? [...current.itens, createEmptyItem("SERVICO_PRINCIPAL", current.itens.length + 1, frente.localId)]
            : current.itens
      };
    });
  }

  function removeFrente(localId: string) {
    setForm((current) => ({
      ...current,
      frentes: current.frentes.filter((frente) => frente.localId !== localId),
      itens: reordenarItens(current.itens.filter((item) => item.frenteTempId !== localId))
    }));
  }

  function addItem() {
    setForm((current) => {
      const firstFrente = current.frentes[0]?.localId ?? "";
      const tipoItem: TipoItemOrcamento =
        current.tipo === "OPERACIONAL" ? "SERVICO_AUXILIAR" : "COMERCIAL";

      return {
        ...current,
        itens: [...current.itens, createEmptyItem(tipoItem, current.itens.length + 1, firstFrente)]
      };
    });
  }

  function addItemToFrente(frenteLocalId: string, tipoItem: TipoItemOrcamento) {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, createEmptyItem(tipoItem, current.itens.length + 1, frenteLocalId)]
    }));
  }

  function removeItem(localId: string) {
    setForm((current) => ({
      ...current,
      itens: reordenarItens(current.itens.filter((item) => item.localId !== localId))
    }));
  }

  function addPremissa(tipo: TipoPremissaOrcamento) {
    setForm((current) => {
      const ordem =
        current.premissas.filter((premissa) => premissa.tipo === tipo).length + 1;

      return {
        ...current,
        premissas: [...current.premissas, createEmptyPremissa(tipo, ordem)]
      };
    });
  }

  function removePremissa(localId: string) {
    setForm((current) => ({
      ...current,
      premissas: current.premissas.filter((premissa) => premissa.localId !== localId)
    }));
  }

  function updatePremissa(localId: string, key: keyof PremissaForm, value: string | number) {
    setForm((current) => ({
      ...current,
      premissas: current.premissas.map((premissa) =>
        premissa.localId === localId ? { ...premissa, [key]: value } : premissa
      )
    }));
  }

  function novoOrcamento() {
    setSelectedId("");
    setForm(createEmptyForm());
    setMessage("");
    clearError();
  }

  async function abrirOrcamento(orcamento: OrcamentoResumoApi) {
    setSelectedId(orcamento.id);
    setMessage("");
    clearError();

    const response = await fetch(`/api/orcamentos/${orcamento.id}`);
    const data = await response.json();

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel abrir o orcamento.");
      return;
    }

    setForm(mapApiToForm(data));
  }

  async function salvarOrcamento() {
    setSaving(true);
    setMessage("");
    clearError();

    const payload = buildPayload(form);
    const response = await fetch(selectedId ? `/api/orcamentos/${selectedId}` : "/api/orcamentos", {
      method: selectedId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel salvar o orcamento.");
      setSaving(false);
      return;
    }

    setSelectedId(data.id);
    setForm(mapApiToForm(data));
    setMessage(selectedId ? "Orcamento atualizado." : "Orcamento criado.");
    await loadOrcamentos();
    setSaving(false);
  }

  async function duplicar(id: string) {
    setMessage("");
    clearError();

    const response = await fetch(`/api/orcamentos/${id}/duplicar`, {
      method: "POST"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel duplicar o orcamento.");
      return;
    }

    setSelectedId(data.id);
    setForm(mapApiToForm(data));
    setMessage("Orcamento duplicado como rascunho.");
    await loadOrcamentos();
  }

  async function evoluirParaOperacional() {
    if (!selectedId) {
      return;
    }

    if (!window.confirm("Evoluir este orcamento comercial para operacional?")) {
      return;
    }

    setSaving(true);
    setMessage("");
    clearError();

    const response = await fetch(`/api/orcamentos/${selectedId}/evoluir`, {
      method: "POST"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel evoluir o orcamento.");
      setSaving(false);
      return;
    }

    setForm(mapApiToForm(data));
    setMessage("Orcamento evoluido para operacional.");
    await loadOrcamentos();
    setSaving(false);
  }

  function gerarPdf() {
    if (!selectedId) {
      setError("Salve ou selecione um orcamento antes de gerar o PDF.");
      setErrorDetails([]);
      return;
    }

    window.open(`/api/orcamentos/${selectedId}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function arquivar(id: string) {
    if (!window.confirm("Arquivar este orcamento?")) {
      return;
    }

    setMessage("");
    clearError();

    const response = await fetch(`/api/orcamentos/${id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel arquivar o orcamento.");
      return;
    }

    if (selectedId === id) {
      novoOrcamento();
    }

    setMessage("Orcamento arquivado.");
    await loadOrcamentos();
  }

  return (
    <section className="orcamentos-shell">
      <div className="orcamentos-hero">
        <div>
          <span className="orcamentos-kicker">BasePro propostas</span>
          <h1>Orcamentos</h1>
          <p>
            Fluxo inicial para cadastrar propostas comerciais e estruturacoes operacionais sem
            interferir nos modulos de medicao, compras ou lancamentos.
          </p>
        </div>
        <div className="orcamentos-hero-card">
          <span>Carteira em tela</span>
          <strong>{items.length}</strong>
          <small>orcamento(s) no filtro atual</small>
        </div>
      </div>

      <div className="orcamentos-grid">
        <aside className="orcamentos-list-panel">
          <div className="orcamentos-panel-header">
            <div>
              <span className="orcamentos-section-label">Lista</span>
              <h2>Pipeline comercial</h2>
            </div>
            <button type="button" className="button-primary" onClick={novoOrcamento}>
              Novo
            </button>
          </div>

          <div className="orcamentos-filter-grid">
            <label className="manager-field">
              <span className="manager-field-label">Pesquisar</span>
              <input
                className="field-control"
                value={filters.search}
                placeholder="Codigo, cliente, obra ou item"
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Tipo</span>
              <select
                className="field-control"
                value={filters.tipo}
                onChange={(event) => updateFilter("tipo", event.target.value)}
              >
                <option value="TODOS">Todos</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Status</span>
              <select
                className="field-control"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="TODOS">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="orcamentos-empty">Carregando orcamentos...</p>
          ) : items.length === 0 ? (
            <p className="orcamentos-empty">Nenhum orcamento encontrado para o filtro atual.</p>
          ) : (
            <div className="orcamentos-list">
              {items.map((orcamento) => (
                <article
                  key={orcamento.id}
                  className={`orcamentos-list-card ${
                    selectedId === orcamento.id ? "orcamentos-list-card-active" : ""
                  }`}
                >
                  <button type="button" onClick={() => abrirOrcamento(orcamento)}>
                    <span className="orcamentos-code">{orcamento.codigo}</span>
                    <strong>{orcamento.titulo || orcamento.objeto || "Sem titulo"}</strong>
                    <small>
                      {orcamento.cliente?.nome ?? "Cliente nao informado"}
                      {orcamento.obra?.nome ? ` / ${orcamento.obra.nome}` : ""}
                    </small>
                    <span className="orcamentos-list-meta">
                      {getTipoLabel(orcamento.tipo)} | {getStatusLabel(orcamento.status)} |{" "}
                      {formatCurrency(orcamento.valorTotal)}
                    </span>
                  </button>
                  <div className="orcamentos-list-actions">
                    <button type="button" onClick={() => duplicar(orcamento.id)}>
                      Duplicar
                    </button>
                    <button type="button" onClick={() => arquivar(orcamento.id)}>
                      Arquivar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>

        <div className="orcamentos-workspace">
          <div className="orcamentos-panel-header">
            <div>
              <span className="orcamentos-section-label">
                {selectedId ? "Edicao" : "Cadastro"}
              </span>
              <h2>{selectedId ? "Ajustar orcamento" : "Novo orcamento"}</h2>
            </div>
            <div className="orcamentos-total-card">
              <span>Total previsto</span>
              <strong>{formatCurrency(totalForm)}</strong>
            </div>
          </div>

          {message ? <div className="message-inline">{message}</div> : null}
          {error ? (
            <div className="message-inline message-inline-danger">
              <strong>{error}</strong>
              {errorDetails.length > 0 ? (
                <ul className="orcamentos-error-list">
                  {errorDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="orcamentos-mode-switch">
            {tipoOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={form.tipo === option.value ? "orcamentos-mode-active" : ""}
                onClick={() => handleTipoChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="orcamentos-form-section">
            <div className="orcamentos-form-heading">
              <span>01</span>
              <h3>Cabecalho</h3>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Cliente</span>
                <SearchableSelect
                  value={form.clienteId}
                  options={clienteOptions}
                  placeholder="Digite para buscar o cliente"
                  onChange={(value) => {
                    updateForm("clienteId", value);
                    updateForm("obraId", "");
                  }}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Obra</span>
                <SearchableSelect
                  value={form.obraId}
                  options={obraOptions}
                  placeholder="Digite para buscar a obra"
                  onChange={(value) => updateForm("obraId", value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Responsavel</span>
                <SearchableSelect
                  value={form.responsavelId}
                  options={responsavelOptions}
                  placeholder="Digite para buscar"
                  emptyLabel="Sem usuarios disponiveis para selecao."
                  onChange={(value) => updateForm("responsavelId", value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Data</span>
                <input
                  type="date"
                  className="field-control"
                  value={form.dataOrcamento}
                  onChange={(event) => updateForm("dataOrcamento", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Validade</span>
                <input
                  type="date"
                  className="field-control"
                  value={form.validadeAte}
                  onChange={(event) => updateForm("validadeAte", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Status</span>
                <select
                  className="field-control"
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value as StatusOrcamento)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Titulo</span>
                <input
                  className="field-control"
                  value={form.titulo}
                  placeholder="Ex: Locacao de escavadeira para obra centro"
                  onChange={(event) => updateForm("titulo", event.target.value)}
                />
              </label>
              <label className="manager-field orcamentos-span-3">
                <span className="manager-field-label">Objeto da proposta</span>
                <textarea
                  className="field-control"
                  rows={3}
                  value={form.objeto}
                  placeholder="Descreva o escopo de forma simples."
                  onChange={(event) => updateForm("objeto", event.target.value)}
                />
              </label>
            </div>
          </div>

          {form.tipo === "OPERACIONAL" ? (
            <FrentesOperacionaisSection
              frentes={form.frentes}
              itens={form.itens}
              servicoOptions={servicoOptions}
              materialOptions={materialOptions}
              equipamentoOptions={equipamentoOptions}
              onAdd={addFrente}
              onRemove={removeFrente}
              onUpdate={updateFrente}
              onAddItem={addItemToFrente}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
            />
          ) : (
            <ItensSection
              tipo={form.tipo}
              itens={form.itens}
              frentes={form.frentes}
              servicoOptions={servicoOptions}
              materialOptions={materialOptions}
              equipamentoOptions={equipamentoOptions}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdate={updateItem}
            />
          )}

          <div className="orcamentos-form-section">
            <div className="orcamentos-form-heading">
              <span>{form.tipo === "OPERACIONAL" ? "03" : "04"}</span>
              <h3>{form.tipo === "OPERACIONAL" ? "Engenharia economica" : "Formacao preliminar"}</h3>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field">
                <span className="manager-field-label">
                  {form.tipo === "OPERACIONAL" ? "Custo direto manual" : "Custo direto"}
                </span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.custoDireto}
                  onChange={(event) => updateFormacao("custoDireto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Custo indireto</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.custoIndireto}
                  onChange={(event) => updateFormacao("custoIndireto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Margem %</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.margemPercentual}
                  onChange={(event) => updateFormacao("margemPercentual", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Impostos %</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.impostosPercentual}
                  onChange={(event) => updateFormacao("impostosPercentual", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">
                  {form.tipo === "OPERACIONAL"
                    ? "Ajuste final do engenheiro"
                    : "Preco final manual"}
                </span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.precoFinal}
                  onChange={(event) => updateFormacao("precoFinal", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Desconto</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorDesconto}
                  onChange={(event) => updateForm("valorDesconto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Acrescimo</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorAcrescimo}
                  onChange={(event) => updateForm("valorAcrescimo", event.target.value)}
                />
              </label>
              <label className="manager-field orcamentos-span-3">
                <span className="manager-field-label">Observacoes internas</span>
                <textarea
                  className="field-control"
                  rows={3}
                  value={form.observacaoInterna}
                  onChange={(event) => updateForm("observacaoInterna", event.target.value)}
                />
              </label>
            </div>

            <div className="orcamentos-summary-strip">
              {form.tipo === "OPERACIONAL" ? (
                <>
                  <span>Custo direto: {formatCurrency(custoDiretoForm)}</span>
                  <span>Indireto: {formatCurrency(custoIndiretoForm)}</span>
                  <span>Sugerido: {formatCurrency(precoSugeridoForm)}</span>
                  <strong>Final: {formatCurrency(totalForm)}</strong>
                </>
              ) : (
                <>
                  <span>Subtotal: {formatCurrency(subtotalForm)}</span>
                  <span>Desconto: {formatCurrency(form.valorDesconto)}</span>
                  <span>Acrescimo: {formatCurrency(form.valorAcrescimo)}</span>
                  <strong>Total: {formatCurrency(totalForm)}</strong>
                </>
              )}
            </div>

            <div className="orcamentos-resumo-grid">
              <article>
                <span>Preco sugerido</span>
                <strong>{formatCurrency(precoSugeridoForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Calculado pelo planejamento da frente."
                    : "Custo + margem + impostos."}
                </small>
              </article>
              <article>
                <span>{form.tipo === "OPERACIONAL" ? "Custo direto calculado" : "Custo estimado"}</span>
                <strong>{formatCurrency(baseCustosForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Recursos planejados + custo indireto."
                    : "Direto dos itens ou valor manual + indireto."}
                </small>
              </article>
              <article>
                <span>{form.tipo === "OPERACIONAL" ? "Margem + impostos" : "Margem estimada"}</span>
                <strong>
                  {form.tipo === "OPERACIONAL"
                    ? formatCurrency(margemValorForm + impostosValorForm)
                    : formatCurrency(margemValorForm)}
                </strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? `${form.formacaoPreco.margemPercentual || 0}% margem / ${
                        form.formacaoPreco.impostosPercentual || 0
                      }% impostos.`
                    : `${form.formacaoPreco.margemPercentual || 0}% sobre a base de custos.`}
                </small>
              </article>
              <article>
                <span>{form.tipo === "OPERACIONAL" ? "Base de venda" : "Prazo operacional"}</span>
                <strong>
                  {form.tipo === "OPERACIONAL"
                    ? formatCurrency(baseVendaForm)
                    : prazoEstimadoForm
                      ? `${prazoEstimadoForm} dia(s)`
                      : "-"}
                </strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Preco sugerido ou ajuste final antes de desconto/acrescimo."
                    : "Maior prazo informado nas frentes."}
                </small>
              </article>
            </div>
          </div>

          <PremissasSection
            stepLabel={form.tipo === "OPERACIONAL" ? "04" : "05"}
            premissas={form.premissas}
            onAdd={addPremissa}
            onRemove={removePremissa}
            onUpdate={updatePremissa}
          />

          <div className="orcamentos-actions">
            {selectedId && form.tipo === "COMERCIAL" ? (
              <button
                type="button"
                className="button-secondary"
                disabled={saving}
                onClick={evoluirParaOperacional}
              >
                Evoluir para operacional
              </button>
            ) : null}
            {selectedId ? (
              <button type="button" className="button-secondary" onClick={gerarPdf}>
                PDF proposta
              </button>
            ) : null}
            <button type="button" className="button-primary" disabled={saving} onClick={salvarOrcamento}>
              {saving ? "Salvando..." : selectedId ? "Atualizar orcamento" : "Criar orcamento"}
            </button>
            <button type="button" className="button-secondary" onClick={novoOrcamento}>
              Limpar formulario
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FrentesOperacionaisSection(props: {
  frentes: FrenteForm[];
  itens: ItemForm[];
  servicoOptions: { value: string; label: string }[];
  materialOptions: { value: string; label: string }[];
  equipamentoOptions: { value: string; label: string }[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof FrenteForm, value: string | number) => void;
  onAddItem: (frenteLocalId: string, tipoItem: TipoItemOrcamento) => void;
  onRemoveItem: (localId: string) => void;
  onUpdateItem: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section orcamentos-operational-section">
      <div className="orcamentos-form-heading">
        <span>02</span>
        <div>
          <h3>Frentes de servico</h3>
          <small>Profundidade progressiva: preencha somente o nivel necessario para a decisao atual.</small>
        </div>
        <button type="button" className="button-secondary" onClick={props.onAdd}>
          Adicionar frente
        </button>
      </div>

      <div className="orcamentos-card-stack">
        {props.frentes.length === 0 ? (
          <div className="orcamentos-empty orcamentos-operational-empty">
            Nenhuma frente criada. Adicione uma frente para iniciar o orcamento operacional.
          </div>
        ) : null}

        {props.frentes.map((frente) => {
          const itensDaFrente = props.itens.filter((item) => item.frenteTempId === frente.localId);
          const servicosPrincipais = itensDaFrente.filter((item) => item.tipoItem === "SERVICO_PRINCIPAL");
          const servicosAuxiliares = itensDaFrente.filter((item) => item.tipoItem === "SERVICO_AUXILIAR");
          const recursosPlanejamento = itensDaFrente.filter(
            (item) => item.tipoItem !== "SERVICO_PRINCIPAL" && item.tipoItem !== "SERVICO_AUXILIAR"
          );
          const unidadeProdutividadeLabel = getProdutividadeLabel(frente.unidadeProducao);
          const frenteCalculoMessage = getFrenteCalculoMessage(frente);

          return (
            <article key={frente.localId} className="orcamentos-subcard orcamentos-front-card">
              <div className="orcamentos-subcard-title">
                <div>
                  <strong>Frente #{frente.ordem}</strong>
                  <small>{frente.nome}</small>
                </div>
                <button type="button" onClick={() => props.onRemove(frente.localId)}>
                  Remover frente
                </button>
              </div>

              <div className="orcamentos-form-grid">
                <label className="manager-field">
                  <span className="manager-field-label">Nome da frente</span>
                  <input
                    className="field-control"
                    value={frente.nome}
                    onChange={(event) => props.onUpdate(frente.localId, "nome", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Unidade de producao</span>
                  <input
                    className="field-control"
                    value={frente.unidadeProducao}
                    placeholder="m3, m2, t, carga, hora"
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "unidadeProducao", event.target.value)
                    }
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Quantidade prevista</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={frente.quantidadePrevista}
                    placeholder="Ex.: 28000"
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "quantidadePrevista", event.target.value)
                    }
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Produtividade/dia</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={frente.produtividadeDia}
                    placeholder="Ex.: 500"
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "produtividadeDia", event.target.value)
                    }
                  />
                  <small className="manager-field-hint">{unidadeProdutividadeLabel}</small>
                  <small className="manager-field-hint">Produção média diária prevista desta frente.</small>
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Prazo estimado</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={frente.prazoEstimadoDias}
                    placeholder="Calculado automaticamente."
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "prazoEstimadoDias", event.target.value)
                    }
                  />
                  <small className="manager-field-hint">
                    Calculado pela quantidade e produtividade. Pode ser ajustado manualmente pelo engenheiro.
                  </small>
                </label>
                {frenteCalculoMessage ? (
                  <p className="orcamentos-front-validation orcamentos-span-3">{frenteCalculoMessage}</p>
                ) : null}
                <label className="manager-field orcamentos-span-2">
                  <span className="manager-field-label">Descricao da frente</span>
                  <textarea
                    className="field-control"
                    rows={2}
                    value={frente.descricao}
                    onChange={(event) => props.onUpdate(frente.localId, "descricao", event.target.value)}
                  />
                </label>
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <div>
                    <span>Nivel 1</span>
                    <strong>Servico principal</strong>
                    <small>Define o que sera executado nesta frente.</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onAddItem(frente.localId, "SERVICO_PRINCIPAL")}
                  >
                    Adicionar principal
                  </button>
                </div>
                <OperationalItemList
                  emptyLabel="Nenhum servico principal informado nesta frente."
                  itens={servicosPrincipais}
                  servicoOptions={props.servicoOptions}
                  materialOptions={props.materialOptions}
                  equipamentoOptions={props.equipamentoOptions}
                  onRemove={props.onRemoveItem}
                  onUpdate={props.onUpdateItem}
                />
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <div>
                    <span>Nivel 2</span>
                    <strong>Metodo executivo</strong>
                    <small>Opcional. Registra como a frente sera executada.</small>
                  </div>
                </div>
                <textarea
                  className="field-control"
                  rows={3}
                  value={frente.metodoExecutivo}
                  placeholder="Ex: escavacao, carga, transporte, espalhamento e compactacao..."
                  onChange={(event) =>
                    props.onUpdate(frente.localId, "metodoExecutivo", event.target.value)
                  }
                />
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <div>
                    <span>Nivel 3</span>
                    <strong>Servicos auxiliares</strong>
                    <small>Opcional. Complementos da execucao principal.</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.onAddItem(frente.localId, "SERVICO_AUXILIAR")}
                  >
                    Adicionar auxiliar
                  </button>
                </div>
                <OperationalItemList
                  emptyLabel="Nenhum servico auxiliar informado."
                  itens={servicosAuxiliares}
                  servicoOptions={props.servicoOptions}
                  materialOptions={props.materialOptions}
                  equipamentoOptions={props.equipamentoOptions}
                  onRemove={props.onRemoveItem}
                  onUpdate={props.onUpdateItem}
                />
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <div>
                    <span>Niveis 4 a 6</span>
                    <strong>Planejamento e engenharia economica</strong>
                    <small>Opcional. Recursos, custos, produtividade, margem e preco.</small>
                  </div>
                  <button type="button" onClick={() => props.onAddItem(frente.localId, "RECURSO")}>
                    Adicionar recurso/custo
                  </button>
                </div>
                <OperationalItemList
                  emptyLabel="Nenhum recurso, material ou custo detalhado."
                  itens={recursosPlanejamento}
                  servicoOptions={props.servicoOptions}
                  materialOptions={props.materialOptions}
                  equipamentoOptions={props.equipamentoOptions}
                  onRemove={props.onRemoveItem}
                  onUpdate={props.onUpdateItem}
                />
                <textarea
                  className="field-control"
                  rows={2}
                  value={frente.observacao}
                  placeholder="Observacoes internas desta frente."
                  onChange={(event) => props.onUpdate(frente.localId, "observacao", event.target.value)}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OperationalItemList(props: {
  emptyLabel: string;
  itens: ItemForm[];
  servicoOptions: { value: string; label: string }[];
  materialOptions: { value: string; label: string }[];
  equipamentoOptions: { value: string; label: string }[];
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  if (props.itens.length === 0) {
    return <p className="orcamentos-operational-empty">{props.emptyLabel}</p>;
  }

  return (
    <div className="orcamentos-items-list">
      {props.itens.map((item) => (
        <article key={item.localId} className="orcamentos-item-card orcamentos-operational-item">
          <div className="orcamentos-item-head">
            <strong>Item {item.ordem}</strong>
            <span>{formatCurrency(calcItemTotal(item))}</span>
            <button type="button" onClick={() => props.onRemove(item.localId)}>
              Remover
            </button>
          </div>
          <div className="orcamentos-form-grid">
            <label className="manager-field">
              <span className="manager-field-label">Tipo</span>
              <select
                className="field-control"
                value={item.tipoItem}
                onChange={(event) =>
                  props.onUpdate(item.localId, "tipoItem", event.target.value as TipoItemOrcamento)
                }
              >
                {tipoItemOperacionalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Servico</span>
              <SearchableSelect
                value={item.servicoId}
                options={props.servicoOptions}
                placeholder="Buscar servico"
                onChange={(value) => props.onUpdate(item.localId, "servicoId", value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Equipamento</span>
              <SearchableSelect
                value={item.equipamentoId}
                options={props.equipamentoOptions}
                placeholder="Opcional"
                onChange={(value) => props.onUpdate(item.localId, "equipamentoId", value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Material</span>
              <SearchableSelect
                value={item.materialId}
                options={props.materialOptions}
                placeholder="Opcional"
                onChange={(value) => props.onUpdate(item.localId, "materialId", value)}
              />
            </label>
            <label className="manager-field orcamentos-span-2">
              <span className="manager-field-label">Descricao</span>
              <input
                className="field-control"
                value={item.descricao}
                onChange={(event) => props.onUpdate(item.localId, "descricao", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Unidade</span>
              <input
                className="field-control"
                value={item.unidade}
                onChange={(event) => props.onUpdate(item.localId, "unidade", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Quantidade</span>
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={item.quantidade}
                onChange={(event) => props.onUpdate(item.localId, "quantidade", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Custo unitario</span>
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={item.custoUnitario}
                onChange={(event) => props.onUpdate(item.localId, "custoUnitario", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Valor unitario</span>
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={item.valorUnitario}
                onChange={(event) => props.onUpdate(item.localId, "valorUnitario", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Produtividade</span>
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={item.produtividade}
                onChange={(event) => props.onUpdate(item.localId, "produtividade", event.target.value)}
              />
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}

function ItensSection(props: {
  tipo: TipoOrcamento;
  itens: ItemForm[];
  frentes: FrenteForm[];
  servicoOptions: { value: string; label: string }[];
  materialOptions: { value: string; label: string }[];
  equipamentoOptions: { value: string; label: string }[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>{props.tipo === "OPERACIONAL" ? "03" : "02"}</span>
        <h3>{props.tipo === "OPERACIONAL" ? "Itens da frente" : "Itens comerciais"}</h3>
        <button type="button" className="button-secondary" onClick={props.onAdd}>
          Adicionar item
        </button>
      </div>

      <div className="orcamentos-items-list">
        {props.itens.map((item) => (
          <article key={item.localId} className="orcamentos-item-card">
            <div className="orcamentos-item-head">
              <strong>Item {item.ordem}</strong>
              <span>{formatCurrency(calcItemTotal(item))}</span>
              <button type="button" onClick={() => props.onRemove(item.localId)}>
                Remover
              </button>
            </div>
            <div className="orcamentos-form-grid">
              {props.tipo === "OPERACIONAL" ? (
                <label className="manager-field">
                  <span className="manager-field-label">Frente</span>
                  <select
                    className="field-control"
                    value={item.frenteTempId}
                    onChange={(event) =>
                      props.onUpdate(item.localId, "frenteTempId", event.target.value)
                    }
                  >
                    <option value="">Sem frente</option>
                    {props.frentes.map((frente) => (
                      <option key={frente.localId} value={frente.localId}>
                        {frente.ordem} - {frente.nome}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="manager-field">
                <span className="manager-field-label">Tipo de item</span>
                <select
                  className="field-control"
                  value={item.tipoItem}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "tipoItem", event.target.value as TipoItemOrcamento)
                  }
                >
                  {tipoItemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Servico</span>
                <SearchableSelect
                  value={item.servicoId}
                  options={props.servicoOptions}
                  placeholder="Buscar servico"
                  onChange={(value) => props.onUpdate(item.localId, "servicoId", value)}
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Equipamento</span>
                <SearchableSelect
                  value={item.equipamentoId}
                  options={props.equipamentoOptions}
                  placeholder="Opcional"
                  onChange={(value) => props.onUpdate(item.localId, "equipamentoId", value)}
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Material</span>
                <SearchableSelect
                  value={item.materialId}
                  options={props.materialOptions}
                  placeholder="Opcional"
                  onChange={(value) => props.onUpdate(item.localId, "materialId", value)}
                />
              </label>

              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Descricao</span>
                <input
                  className="field-control"
                  value={item.descricao}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "descricao", event.target.value)
                  }
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Unidade</span>
                <input
                  className="field-control"
                  value={item.unidade}
                  onChange={(event) => props.onUpdate(item.localId, "unidade", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Quantidade</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantidade}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "quantidade", event.target.value)
                  }
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Valor unitario</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.valorUnitario}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "valorUnitario", event.target.value)
                  }
                />
              </label>
              {props.tipo === "OPERACIONAL" ? (
                <>
                  <label className="manager-field">
                    <span className="manager-field-label">Custo unitario</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.custoUnitario}
                      onChange={(event) =>
                        props.onUpdate(item.localId, "custoUnitario", event.target.value)
                      }
                    />
                  </label>
                  <label className="manager-field">
                    <span className="manager-field-label">Produtividade</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.produtividade}
                      onChange={(event) =>
                        props.onUpdate(item.localId, "produtividade", event.target.value)
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PremissasSection(props: {
  stepLabel: string;
  premissas: PremissaForm[];
  onAdd: (tipo: TipoPremissaOrcamento) => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof PremissaForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>{props.stepLabel}</span>
        <div>
          <h3>Premissas e condicoes</h3>
          <small>Arquitetura preparada para futuras sugestoes automaticas.</small>
        </div>
      </div>

      <div className="orcamentos-premissas-grid">
        {premissaTipoOptions.map((option) => {
          const itens = props.premissas.filter((premissa) => premissa.tipo === option.value);

          return (
            <article key={option.value} className="orcamentos-premissa-card">
              <div className="orcamentos-premissa-heading">
                <div>
                  <strong>{option.label}</strong>
                  <small>{option.helper}</small>
                </div>
                <button type="button" onClick={() => props.onAdd(option.value)}>
                  Adicionar
                </button>
              </div>

              <div className="orcamentos-premissa-list">
                {itens.map((premissa) => (
                  <div key={premissa.localId} className="orcamentos-premissa-row">
                    <input
                      className="field-control"
                      value={premissa.titulo}
                      placeholder="Titulo opcional"
                      onChange={(event) =>
                        props.onUpdate(premissa.localId, "titulo", event.target.value)
                      }
                    />
                    <textarea
                      className="field-control"
                      rows={3}
                      value={premissa.descricao}
                      placeholder="Descreva o ponto que precisa aparecer na proposta."
                      onChange={(event) =>
                        props.onUpdate(premissa.localId, "descricao", event.target.value)
                      }
                    />
                    {itens.length > 1 ? (
                      <button type="button" onClick={() => props.onRemove(premissa.localId)}>
                        Remover linha
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function buildPayload(form: OrcamentoForm) {
  const itensPreenchidos = form.itens.filter(isItemPreenchido);
  const itensValidos =
    form.tipo === "OPERACIONAL"
      ? itensPreenchidos.filter((item) => Boolean(item.frenteTempId))
      : itensPreenchidos;
  const formacaoPreco = buildFormacaoPayload(form.formacaoPreco);

  return {
    tipo: form.tipo,
    status: form.status,
    clienteId: form.clienteId,
    obraId: form.obraId || null,
    responsavelId: form.responsavelId || null,
    dataOrcamento: form.dataOrcamento,
    validadeAte: form.validadeAte,
    titulo: form.titulo,
    objeto: form.objeto,
    observacaoInterna: form.observacaoInterna,
    observacaoCliente: form.observacaoCliente,
    valorDesconto: Number(form.valorDesconto) || 0,
    valorAcrescimo: Number(form.valorAcrescimo) || 0,
    formacaoPreco,
    frentes: form.tipo === "OPERACIONAL" ? form.frentes.map(mapFrentePayload) : [],
    itens: itensValidos.map((item) => ({
      frenteTempId: form.tipo === "OPERACIONAL" ? item.frenteTempId : "",
      tipoItem: item.tipoItem,
      servicoId: item.servicoId || null,
      materialId: item.materialId || null,
      equipamentoId: item.equipamentoId || null,
      ordem: item.ordem,
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: Number(item.quantidade) || 0,
      produtividade: item.produtividade ? Number(item.produtividade) : null,
      custoUnitario: Number(item.custoUnitario) || 0,
      valorUnitario: Number(item.valorUnitario) || 0,
      observacao: item.observacao
    })),
    premissas: form.premissas.filter(isPremissaPreenchida).map((premissa) => ({
      tipo: premissa.tipo,
      ordem: premissa.ordem,
      titulo: premissa.titulo,
      descricao: premissa.descricao
    }))
  };
}

function toNumberOrZero(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFormacaoPayload(formacaoPreco: FormacaoPrecoForm) {
  const payload = {
    custoDireto: toNumberOrZero(formacaoPreco.custoDireto),
    custoIndireto: toNumberOrZero(formacaoPreco.custoIndireto),
    impostosPercentual: toNumberOrZero(formacaoPreco.impostosPercentual),
    impostosValor: toNumberOrZero(formacaoPreco.impostosValor),
    margemPercentual: toNumberOrZero(formacaoPreco.margemPercentual),
    margemValor: toNumberOrZero(formacaoPreco.margemValor),
    precoSugerido: toNumberOrZero(formacaoPreco.precoSugerido),
    precoFinal: toNumberOrZero(formacaoPreco.precoFinal),
    observacao: formacaoPreco.observacao.trim()
  };

  const hasNumericValue = Object.entries(payload).some(
    ([key, value]) => key !== "observacao" && typeof value === "number" && value > 0
  );

  if (!hasNumericValue && !payload.observacao) {
    return null;
  }

  return payload;
}

function isItemPreenchido(item: ItemForm) {
  return Boolean(
    item.descricao.trim() ||
      item.servicoId ||
      item.materialId ||
      item.equipamentoId ||
      Number(item.quantidade) !== 1 ||
      Number(item.valorUnitario) > 0 ||
      Number(item.custoUnitario) > 0
  );
}

function isPremissaPreenchida(premissa: PremissaForm) {
  return Boolean(premissa.descricao.trim());
}

function mapFrentePayload(frente: FrenteForm) {
  return {
    tempId: frente.localId,
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao,
    metodoExecutivo: frente.metodoExecutivo,
    unidadeProducao: frente.unidadeProducao,
    quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
    produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
    prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
    observacao: frente.observacao
  };
}

function buildPremissasForm(item: OrcamentoApi): PremissaForm[] {
  const premissasSalvas =
    item.premissas?.map((premissa) => ({
      localId: premissa.id,
      tipo: premissa.tipo,
      ordem: premissa.ordem,
      titulo: premissa.titulo ?? "",
      descricao: premissa.descricao
    })) ?? [];

  const withEmptyCategories = [...premissasSalvas];

  for (const option of premissaTipoOptions) {
    if (!withEmptyCategories.some((premissa) => premissa.tipo === option.value)) {
      withEmptyCategories.push(createEmptyPremissa(option.value, 1));
    }
  }

  return withEmptyCategories.sort((first, second) => {
    const firstType = premissaTipoOptions.findIndex((option) => option.value === first.tipo);
    const secondType = premissaTipoOptions.findIndex((option) => option.value === second.tipo);

    if (firstType !== secondType) {
      return firstType - secondType;
    }

    return first.ordem - second.ordem;
  });
}

function mapApiToForm(item: OrcamentoApi): OrcamentoForm {
  const frentes: FrenteForm[] = item.frentes.map((frente) => ({
    localId: frente.id,
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao ?? "",
    metodoExecutivo: frente.metodoExecutivo ?? "",
    unidadeProducao: frente.unidadeProducao ?? "",
    quantidadePrevista: toStringValue(frente.quantidadePrevista),
    produtividadeDia: toStringValue(frente.produtividadeDia),
    prazoEstimadoDias: toStringValue(frente.prazoEstimadoDias),
    calculoReferencia: "",
    observacao: frente.observacao ?? ""
  }));
  const firstFrenteId = frentes[0]?.localId ?? "";

  return {
    id: item.id,
    tipo: item.tipo,
    status: item.status,
    clienteId: item.clienteId,
    obraId: item.obraId ?? "",
    responsavelId: item.responsavelId ?? "",
    dataOrcamento: toDateInput(item.dataOrcamento),
    validadeAte: toDateInput(item.validadeAte),
    titulo: item.titulo ?? "",
    objeto: item.objeto ?? "",
    observacaoInterna: item.observacaoInterna ?? "",
    observacaoCliente: item.observacaoCliente ?? "",
    valorDesconto: toStringValue(item.valorDesconto || 0),
    valorAcrescimo: toStringValue(item.valorAcrescimo || 0),
    formacaoPreco: {
      custoDireto: toStringValue(item.formacaoPreco?.custoDireto ?? 0),
      custoIndireto: toStringValue(item.formacaoPreco?.custoIndireto ?? 0),
      impostosPercentual: toStringValue(item.formacaoPreco?.impostosPercentual ?? 0),
      impostosValor: toStringValue(item.formacaoPreco?.impostosValor ?? 0),
      margemPercentual: toStringValue(item.formacaoPreco?.margemPercentual ?? 0),
      margemValor: toStringValue(item.formacaoPreco?.margemValor ?? 0),
      precoSugerido: toStringValue(item.formacaoPreco?.precoSugerido ?? 0),
      precoFinal: toStringValue(item.formacaoPreco?.precoFinal ?? 0),
      observacao: toStringValue(item.formacaoPreco?.observacao ?? "")
    },
    frentes,
    itens:
      item.itens.length > 0
        ? item.itens.map((orcamentoItem) => ({
            localId: orcamentoItem.id,
            frenteTempId: orcamentoItem.frenteId ?? "",
            tipoItem: orcamentoItem.tipoItem,
            servicoId: orcamentoItem.servicoId ?? "",
            materialId: orcamentoItem.materialId ?? "",
            equipamentoId: orcamentoItem.equipamentoId ?? "",
            ordem: orcamentoItem.ordem,
            codigo: orcamentoItem.codigo ?? "",
            descricao: orcamentoItem.descricao,
            unidade: orcamentoItem.unidade,
            quantidade: toStringValue(orcamentoItem.quantidade),
            produtividade: toStringValue(orcamentoItem.produtividade),
            custoUnitario: toStringValue(orcamentoItem.custoUnitario),
            valorUnitario: toStringValue(orcamentoItem.valorUnitario),
            observacao: orcamentoItem.observacao ?? ""
          }))
        : [
            createEmptyItem(
              item.tipo === "OPERACIONAL" ? "SERVICO_PRINCIPAL" : "COMERCIAL",
              1,
              item.tipo === "OPERACIONAL" ? firstFrenteId : ""
            )
          ],
    premissas: buildPremissasForm(item)
  };
}
