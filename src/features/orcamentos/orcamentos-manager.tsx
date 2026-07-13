"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
import { calcularMotorCustos } from "@/lib/orcamentos/cost-engine";
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
type CategoriaRecursoOrcamento = "EQUIPAMENTO" | "EQUIPE" | "MATERIAL" | "TERCEIRO";
type TipoPremissaOrcamento = "PREMISSA" | "CONDICAO" | "EXCLUSAO" | "OBSERVACAO";
type ModoCustoOrcamento = "SIMPLIFICADO" | "COMPLETO";
type StatusCenarioOrcamento = "EM_ESTUDO" | "ACEITO" | "REJEITADO";
type StatusPropostaComercial = "RASCUNHO" | "EMITIDA" | "ACEITA" | "REJEITADA" | "CANCELADA";

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
  usarEmOrcamentos?: boolean;
};

type MaterialOption = {
  id: string;
  codigoMaterial: string;
  descricao: string;
  unidadePadrao?: string | null;
};

type EquipamentoOption = {
  id: string;
  placaOuTag: string;
  descricao: string;
  tipoRecurso: string;
  classeOperacional?: string | null;
};

type ColaboradorOption = {
  id: string;
  codigo?: string | null;
  nome: string;
};

type FornecedorOption = {
  id: string;
  codigo?: string | null;
  razaoSocial: string;
  nomeFantasia?: string | null;
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
  colaboradores: ColaboradorOption[];
  fornecedores: FornecedorOption[];
  usuarios: UsuarioOption[];
};

type ServicoSelectOption = { value: string; label: string; unidadeFaturamento: string };
type MaterialSelectOption = {
  value: string;
  label: string;
  descricao: string;
  unidadePadrao: string;
};
type BasicSelectOption = { value: string; label: string };
type NamedSelectOption = { value: string; label: string; nome: string };
type RecursoSelectOption = BasicSelectOption & {
  nome?: string;
  descricao?: string;
  unidadePadrao?: string;
};

type FrenteForm = {
  localId: string;
  cenarioTempId: string;
  ordem: number;
  nome: string;
  descricao: string;
  metodoExecutivo: string;
  unidadeProducao: string;
  quantidadePrevista: string;
  produtividadeDia: string;
  prazoEstimadoDias: string;
  custoManual: string;
  calculoReferencia: "produtividadeDia" | "prazoEstimadoDias" | "";
  observacao: string;
};

type CenarioForm = {
  localId: string;
  ordem: number;
  nome: string;
  descricao: string;
  metodoExecutivo: string;
  observacao: string;
  isPadrao: boolean;
  status: StatusCenarioOrcamento;
};

type PropostaOpcionalForm = {
  localId: string;
  ordem: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  condicoes: string;
  observacao: string;
};

type PropostaComercialForm = {
  localId: string;
  cenarioTempId: string;
  codigo: string;
  revisao: string;
  titulo: string;
  status: StatusPropostaComercial;
  condicoesComerciais: string;
  observacao: string;
  opcionais: PropostaOpcionalForm[];
};

type ItemForm = {
  localId: string;
  frenteTempId: string;
  tipoItem: TipoItemOrcamento;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  categoriaRecurso: CategoriaRecursoOrcamento;
  classeOperacional: string;
  recursoReferenciaId: string;
  recursoNome: string;
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
  modoCusto: ModoCustoOrcamento;
  custoDireto: string;
  custoIndireto: string;
  impostosPercentual: string;
  impostosValor: string;
  margemPercentual: string;
  margemValor: string;
  precoSugerido: string;
  ajusteComercial: string;
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
  cenarios: CenarioForm[];
  propostasComerciais: PropostaComercialForm[];
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
  cenarios: Array<{
    id: string;
    ordem: number;
    nome: string;
    descricao: string | null;
    metodoExecutivo: string | null;
    observacao: string | null;
    isPadrao: boolean;
    status: StatusCenarioOrcamento;
  }>;
  propostas: Array<{
    id: string;
    cenarioId: string | null;
    codigo: string;
    revisao: number;
    titulo: string | null;
    status: StatusPropostaComercial;
    condicoesComerciais: string | null;
    observacao: string | null;
    opcionais?: Array<{
      id: string;
      ordem: number;
      codigo: string | null;
      descricao: string;
      unidade: string;
      quantidade: string | number;
      valorUnitario: string | number;
      condicoes: string | null;
      observacao: string | null;
    }>;
  }>;
  frentes: Array<{
    id: string;
    cenarioId: string | null;
    ordem: number;
    nome: string;
    descricao: string | null;
    metodoExecutivo: string | null;
    unidadeProducao: string | null;
    quantidadePrevista: string | number | null;
    produtividadeDia: string | number | null;
    prazoEstimadoDias: string | number | null;
    custoManual: string | number;
    observacao: string | null;
  }>;
  itens: Array<{
    id: string;
    frenteId: string | null;
    tipoItem: TipoItemOrcamento;
    servicoId: string | null;
    materialId: string | null;
    equipamentoId: string | null;
    categoriaRecurso: CategoriaRecursoOrcamento | null;
    classeOperacional: string | null;
    recursoReferenciaId: string | null;
    recursoNome: string | null;
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

const tipoItemOperacionalOptions = tipoItemOptions.filter((option) =>
  ["SERVICO_PRINCIPAL", "SERVICO_AUXILIAR", "RECURSO"].includes(option.value)
);

const categoriaRecursoOptions: { value: CategoriaRecursoOrcamento; label: string }[] = [
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "EQUIPE", label: "Equipe" },
  { value: "MATERIAL", label: "Material" },
  { value: "TERCEIRO", label: "Terceiro" }
];

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
  colaboradores: [],
  fornecedores: [],
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
      modoCusto: "SIMPLIFICADO",
      custoDireto: "0",
      custoIndireto: "0",
      impostosPercentual: "0",
      impostosValor: "0",
      margemPercentual: "0",
      margemValor: "0",
      precoSugerido: "0",
      ajusteComercial: "0",
      precoFinal: "0",
      observacao: ""
    },
    cenarios: [],
    propostasComerciais: [],
    frentes: [],
    itens: [createEmptyItem("COMERCIAL", 1)],
    premissas: createInitialPremissas()
  };
}

function createEmptyCenario(ordem: number, isPadrao = false): CenarioForm {
  return {
    localId: uid("cenario"),
    ordem,
    nome: isPadrao ? "Cenario padrao" : `Cenario ${ordem}`,
    descricao: isPadrao ? "Alternativa principal para emissao rapida da proposta." : "",
    metodoExecutivo: "",
    observacao: "",
    isPadrao,
    status: "EM_ESTUDO"
  };
}

function createEmptyFrente(ordem: number): FrenteForm {
  return {
    localId: uid("frente"),
    cenarioTempId: "",
    ordem,
    nome: `Frente ${ordem}`,
    descricao: "",
    metodoExecutivo: "",
    unidadeProducao: "",
    quantidadePrevista: "",
    produtividadeDia: "",
    prazoEstimadoDias: "",
    custoManual: "0",
    calculoReferencia: "",
    observacao: ""
  };
}

function createEmptyProposta(
  ordem: number,
  cenarioTempId = "",
  titulo = "Proposta comercial"
): PropostaComercialForm {
  return {
    localId: uid("proposta"),
    cenarioTempId,
    codigo: `PROP-${String(ordem).padStart(3, "0")}`,
    revisao: "0",
    titulo,
    status: "RASCUNHO",
    condicoesComerciais: "",
    observacao: "",
    opcionais: []
  };
}

function createEmptyPropostaOpcional(ordem: number): PropostaOpcionalForm {
  return {
    localId: uid("opcional"),
    ordem,
    codigo: "",
    descricao: "",
    unidade: "Hora",
    quantidade: "1",
    valorUnitario: "0",
    condicoes: "",
    observacao: "",
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
    categoriaRecurso: "EQUIPAMENTO",
    classeOperacional: "",
    recursoReferenciaId: "",
    recursoNome: "",
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

function isRecursoItem(item: Pick<ItemForm, "tipoItem">) {
  return item.tipoItem === "RECURSO";
}

function normalizeItemUpdate(item: ItemForm, key: keyof ItemForm, value: string | number): ItemForm {
  const next: ItemForm = {
    ...item,
    [key]: value
  };

  if (key === "tipoItem") {
    const tipoItem = value as TipoItemOrcamento;
    next.tipoItem = tipoItem;

    if (tipoItem === "RECURSO") {
      return {
        ...next,
        servicoId: "",
        equipamentoId: "",
        valorUnitario: "0",
        categoriaRecurso: next.categoriaRecurso || "EQUIPAMENTO"
      };
    }

    return {
      ...next,
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "",
      recursoReferenciaId: "",
      recursoNome: "",
      custoUnitario: "0",
      produtividade: ""
    };
  }

  if (key === "categoriaRecurso") {
    const categoriaRecurso = value as CategoriaRecursoOrcamento;

    return {
      ...next,
      categoriaRecurso,
      classeOperacional: "",
      recursoReferenciaId: "",
      recursoNome: "",
      materialId: categoriaRecurso === "MATERIAL" ? next.materialId : "",
      equipamentoId: ""
    };
  }

  return next;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isCostDebugEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("debugCustos") === "1";
}

function debugCostFlow(stage: string, value: unknown) {
  if (!isCostDebugEnabled()) {
    return;
  }

  console.groupCollapsed(`[Orcamentos][Custos] ${stage}`);
  console.log(value);
  console.groupEnd();
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

function buildCostEngineInputFromForm(form: OrcamentoForm) {
  return {
    frentes: form.frentes.map((frente) => ({
      ref: frente.localId,
      nome: frente.nome,
      unidadeProducao: frente.unidadeProducao,
      quantidadePrevista: frente.quantidadePrevista,
      produtividadeDia: frente.produtividadeDia,
      prazoEstimadoDias: frente.prazoEstimadoDias,
      custoManual: frente.custoManual
    })),
    recursos: form.itens
      .filter((item) => isRecursoItem(item))
      .map((item) => ({
        frenteRef: item.frenteTempId,
        categoria: item.categoriaRecurso,
        descricao: item.descricao,
        quantidade: item.quantidade,
        custoOperacional: item.custoUnitario,
        unidadeCusto: item.unidade
      }))
  };
}

function buildEconomicPreview(
  form: OrcamentoForm,
  motorCustosCalculado?: ReturnType<typeof calcularMotorCustos> | null
) {
  const isOperational = form.tipo === "OPERACIONAL";
  const modoCusto = isOperational ? form.formacaoPreco.modoCusto : "SIMPLIFICADO";
  const subtotalItens = roundMoney(form.itens.reduce((sum, item) => sum + calcItemTotal(item), 0));
  const itensParaCusto = isOperational
    ? form.itens.filter((item) => item.frenteTempId)
    : form.itens;
  const motorCustos = isOperational
    ? motorCustosCalculado === undefined
      ? calcularMotorCustos(buildCostEngineInputFromForm(form))
      : motorCustosCalculado
    : null;
  const custoDiretoCalculado = roundMoney(
    isOperational
      ? motorCustos?.custoDiretoTotal ?? 0
      : itensParaCusto.reduce((sum, item) => sum + calcItemCost(item), 0)
  );
  const custoDiretoManual = roundMoney(Number(form.formacaoPreco.custoDireto) || 0);
  const custoDireto = roundMoney(
    isOperational
      ? modoCusto === "COMPLETO"
        ? custoDiretoCalculado
        : custoDiretoCalculado > 0
          ? custoDiretoCalculado
          : custoDiretoManual
      : custoDiretoCalculado > 0
        ? custoDiretoCalculado
        : custoDiretoManual
  );
  const custoIndireto = roundMoney(Number(form.formacaoPreco.custoIndireto) || 0);
  const baseCustos = roundMoney(custoDireto + custoIndireto);
  const margemPercentual = Number(form.formacaoPreco.margemPercentual) || 0;
  const margemManual = Number(form.formacaoPreco.margemValor) || 0;
  const margemValor = roundMoney(
    !isOperational && margemManual > 0
      ? margemManual
      : baseCustos * (margemPercentual / 100)
  );
  const impostosPercentual = Number(form.formacaoPreco.impostosPercentual) || 0;
  const impostosManual = Number(form.formacaoPreco.impostosValor) || 0;
  const impostosValor = roundMoney(
    !isOperational && impostosManual > 0
      ? impostosManual
      : (baseCustos + margemValor) * (impostosPercentual / 100)
  );
  const precoSugeridoCalculado = roundMoney(baseCustos + margemValor + impostosValor);
  const precoSugeridoManual = isOperational ? 0 : Number(form.formacaoPreco.precoSugerido) || 0;
  const precoSugerido = roundMoney(
    precoSugeridoManual > 0 ? precoSugeridoManual : precoSugeridoCalculado
  );
  const ajusteComercial = roundMoney(Number(form.formacaoPreco.ajusteComercial) || 0);
  const precoFinalManual = roundMoney(Number(form.formacaoPreco.precoFinal) || 0);
  const baseVenda = roundMoney(
    isOperational
      ? ajusteComercial > 0
        ? ajusteComercial
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
    modoCusto,
    subtotalItens,
    custoDiretoCalculado,
    custoDiretoManual,
    custoDireto,
    custoIndireto,
    baseCustos,
    margemValor,
    impostosValor,
    precoSugerido,
    ajusteComercial,
    precoFinalManual,
    baseVenda,
    desconto,
    acrescimo,
    total,
    motorCustos
  };
}

function buildCenarioTotals(form: OrcamentoForm) {
  const totals: Record<string, number> = {};

  for (const cenario of form.cenarios) {
    const frenteIds = new Set(
      form.frentes
        .filter((frente) =>
          frente.cenarioTempId
            ? frente.cenarioTempId === cenario.localId
            : cenario.isPadrao
        )
        .map((frente) => frente.localId)
    );

    totals[cenario.localId] = roundMoney(
      form.itens
        .filter((item) => item.frenteTempId && frenteIds.has(item.frenteTempId))
        .reduce((sum, item) => sum + calcItemTotal(item), 0)
    );
  }

  return totals;
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
      options.servicos
        .filter((servico) => servico.usarEmOrcamentos !== false)
        .map((servico) => ({
          value: servico.id,
          label: `${servico.codigo} - ${servico.tipoServico}`,
          unidadeFaturamento: servico.unidadeFaturamento ?? ""
        })),
    [options.servicos]
  );

  const materialOptions = useMemo(
    () =>
      options.materiais.map((material) => ({
        value: material.id,
        label: `${material.codigoMaterial} - ${material.descricao}`,
        descricao: material.descricao,
        unidadePadrao: material.unidadePadrao ?? "UN"
      })),
    [options.materiais]
  );

  const equipamentoOptions = useMemo(
    () =>
      options.equipamentos.map((equipamento) => ({
        value: equipamento.id,
        label: `${equipamento.placaOuTag} - ${equipamento.descricao}`,
        classeOperacional: equipamento.classeOperacional ?? ""
      })),
    [options.equipamentos]
  );

  const classeOperacionalOptions = useMemo(() => {
    const classes = new Map<string, string>();

    for (const equipamento of options.equipamentos) {
      const classe = equipamento.classeOperacional?.trim();

      if (classe && !classes.has(classe.toLocaleLowerCase("pt-BR"))) {
        classes.set(classe.toLocaleLowerCase("pt-BR"), classe);
      }
    }

    return Array.from(classes.values())
      .sort((first, second) => first.localeCompare(second, "pt-BR"))
      .map((classe) => ({
        value: classe,
        label: classe
      }));
  }, [options.equipamentos]);

  const colaboradorOptions = useMemo(
    () =>
      options.colaboradores.map((colaborador) => ({
        value: colaborador.id,
        label: `${colaborador.codigo ?? "COL"} - ${colaborador.nome}`,
        nome: colaborador.nome
      })),
    [options.colaboradores]
  );

  const fornecedorOptions = useMemo(
    () =>
      options.fornecedores.map((fornecedor) => ({
        value: fornecedor.id,
        label: `${fornecedor.codigo ?? "FOR"} - ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`,
        nome: fornecedor.nomeFantasia || fornecedor.razaoSocial
      })),
    [options.fornecedores]
  );

  const motorCustosForm = useMemo(
    () =>
      form.tipo === "OPERACIONAL"
        ? calcularMotorCustos(buildCostEngineInputFromForm(form))
        : null,
    [form.tipo, form.frentes, form.itens]
  );
  const economicPreview = useMemo(
    () => buildEconomicPreview(form, motorCustosForm),
    [form, motorCustosForm]
  );
  const cenarioTotals = useMemo(() => buildCenarioTotals(form), [form]);
  const modoCustoForm = economicPreview.modoCusto;
  const subtotalForm = economicPreview.subtotalItens;
  const custoDiretoCalculadoForm = economicPreview.custoDiretoCalculado;
  const custoDiretoForm = economicPreview.custoDireto;
  const custoIndiretoForm = economicPreview.custoIndireto;
  const baseCustosForm = economicPreview.baseCustos;
  const precoSugeridoForm = economicPreview.precoSugerido;
  const totalForm = economicPreview.total;
  const gruposExecutivosForm = motorCustosForm?.gruposUnidade ?? [];
  const unidadesHomogeneasForm = motorCustosForm?.unidadesHomogeneas ?? true;
  const quantidadeHomogeneaForm = unidadesHomogeneasForm
    ? motorCustosForm?.quantidadeTotal ?? 0
    : 0;
  const prazoCriticoForm = motorCustosForm?.prazoCritico;
  const prazoCriticoLabelForm =
    prazoCriticoForm && prazoCriticoForm.valor > 0
      ? `${prazoCriticoForm.valor.toLocaleString("pt-BR")} ${prazoCriticoForm.unidade}`
      : "-";
  const recursosPlanejadosForm = useMemo(
    () => form.itens.filter((item) => isRecursoItem(item) && item.frenteTempId).length,
    [form.itens]
  );
  const custoDiretoUnitarioForm =
    unidadesHomogeneasForm && quantidadeHomogeneaForm > 0
      ? roundMoney(custoDiretoForm / quantidadeHomogeneaForm)
      : 0;
  const custoTotalUnitarioForm =
    unidadesHomogeneasForm && quantidadeHomogeneaForm > 0
      ? roundMoney(baseCustosForm / quantidadeHomogeneaForm)
      : 0;
  const precoFinalUnitarioForm =
    unidadesHomogeneasForm && quantidadeHomogeneaForm > 0
      ? roundMoney(totalForm / quantidadeHomogeneaForm)
      : 0;

  useEffect(() => {
    if (!isCostDebugEnabled() || form.tipo !== "OPERACIONAL") {
      return;
    }

    const entradaMotor = buildCostEngineInputFromForm(form);

    debugCostFlow("C. Antes do cost-engine", {
      quantidadeFrentes: entradaMotor.frentes.length,
      quantidadeRecursos: entradaMotor.recursos.length,
      recursosPorFrente: entradaMotor.frentes.map((frente) => ({
        frenteId: frente.ref,
        frente: frente.nome,
        recursos: entradaMotor.recursos
          .filter((recurso) => recurso.frenteRef === frente.ref)
          .map((recurso) => ({
            descricao: recurso.descricao,
            quantidade: Number(recurso.quantidade) || 0,
            custoUnitario: Number(recurso.custoOperacional) || 0,
            total: roundMoney(
              (Number(recurso.quantidade) || 0) * (Number(recurso.custoOperacional) || 0)
            ),
            unidade: recurso.unidadeCusto
          }))
      }))
    });
    debugCostFlow("D. Depois do cost-engine", {
      frentes: motorCustosForm?.frentes.map((frente) => ({
        frenteId: frente.ref,
        frente: frente.nome,
        custoDireto: frente.custoDireto,
        origemCusto: frente.origemCusto,
        custoManual: frente.custoManual,
        recursos: frente.recursos
      })),
      custoDiretoConsolidado: motorCustosForm?.custoDiretoTotal ?? 0,
      indicadoresPorUnidade: motorCustosForm?.gruposUnidade ?? [],
      avisos: motorCustosForm?.avisos ?? []
    });
    debugCostFlow("E. Engenharia Economica renderizada", {
      modoCusto: modoCustoForm,
      custoDiretoCalculado: custoDiretoCalculadoForm,
      custoDiretoExibido: custoDiretoForm,
      origem:
        custoDiretoCalculadoForm > 0
          ? "motorCustosForm.custoDiretoTotal"
          : "form.formacaoPreco.custoDireto (compatibilidade legada)",
      custoIndireto: custoIndiretoForm,
      precoSugerido: precoSugeridoForm,
      ajusteComercial: economicPreview.ajusteComercial,
      precoFinal: totalForm
    });
  }, [
    custoDiretoCalculadoForm,
    custoDiretoForm,
    custoIndiretoForm,
    economicPreview.ajusteComercial,
    form,
    modoCustoForm,
    motorCustosForm,
    precoSugeridoForm,
    totalForm
  ]);

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
      colaboradores: operacionais.colaboradores ?? [],
      fornecedores: operacionais.fornecedores ?? [],
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

  function updateFormacao<K extends keyof FormacaoPrecoForm>(key: K, value: FormacaoPrecoForm[K]) {
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
        item.localId === localId ? normalizeItemUpdate(item, key, value) : item
      )
    }));
  }

  function handleTipoChange(tipo: TipoOrcamento) {
    setForm((current) => {
      if (tipo === "OPERACIONAL") {
        const cenario = current.cenarios[0] ?? createEmptyCenario(1, true);
        const frente = current.frentes[0] ?? createEmptyFrente(1);
        const frenteComCenario = {
          ...frente,
          cenarioTempId: frente.cenarioTempId || cenario.localId
        };
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
              frenteTempId: item.frenteTempId || frenteComCenario.localId
            }))
          : [createEmptyItem("SERVICO_PRINCIPAL", 1, frenteComCenario.localId)];
        return {
          ...current,
          tipo,
          status: current.status === "RASCUNHO" ? "EM_ELABORACAO" : current.status,
          cenarios: current.cenarios.length ? current.cenarios : [cenario],
          frentes: current.frentes.length ? current.frentes : [frenteComCenario],
          propostasComerciais: current.propostasComerciais,
          itens: itensOperacionais
        };
      }

      if (tipo === "COMERCIAL") {
        return {
          ...current,
          tipo,
          cenarios: [],
          propostasComerciais: [],
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
      const cenarioPadrao = current.cenarios.find((cenario) => cenario.isPadrao) ?? current.cenarios[0];
      const frente = {
        ...createEmptyFrente(current.frentes.length + 1),
        cenarioTempId: cenarioPadrao?.localId ?? ""
      };

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

  function addCenario() {
    setForm((current) => {
      const cenario = createEmptyCenario(current.cenarios.length + 1, current.cenarios.length === 0);

      return {
        ...current,
        cenarios: [...current.cenarios, cenario]
      };
    });
  }

  function updateCenario(localId: string, key: keyof CenarioForm, value: string | number | boolean) {
    setForm((current) => ({
      ...current,
      cenarios: current.cenarios.map((cenario) =>
        cenario.localId === localId
          ? {
              ...cenario,
              [key]: value,
              ...(key === "isPadrao" && value
                ? { status: cenario.status }
                : {})
            }
          : key === "isPadrao" && value
            ? { ...cenario, isPadrao: false }
            : cenario
      )
    }));
  }

  function removeCenario(localId: string) {
    setForm((current) => {
      if (current.cenarios.length <= 1) {
        return current;
      }

      const remaining = current.cenarios.filter((cenario) => cenario.localId !== localId);
      const fallback = remaining.find((cenario) => cenario.isPadrao) ?? remaining[0];

      return {
        ...current,
        cenarios: remaining.map((cenario, index) => ({
          ...cenario,
          ordem: index + 1,
          isPadrao: cenario.localId === fallback.localId
        })),
        frentes: current.frentes.map((frente) => ({
          ...frente,
          cenarioTempId: frente.cenarioTempId === localId ? fallback.localId : frente.cenarioTempId
        })),
        propostasComerciais: current.propostasComerciais.map((proposta) => ({
          ...proposta,
          cenarioTempId: proposta.cenarioTempId === localId ? fallback.localId : proposta.cenarioTempId
        }))
      };
    });
  }

  function addPropostaComercial() {
    setForm((current) => {
      const cenarioPadrao = current.cenarios.find((cenario) => cenario.isPadrao) ?? current.cenarios[0];
      const proposta = createEmptyProposta(
        current.propostasComerciais.length + 1,
        cenarioPadrao?.localId ?? "",
        current.titulo || "Proposta comercial"
      );

      return {
        ...current,
        propostasComerciais: [...current.propostasComerciais, proposta]
      };
    });
  }

  function updatePropostaComercial(
    localId: string,
    key: keyof PropostaComercialForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      propostasComerciais: current.propostasComerciais.map((proposta) =>
        proposta.localId === localId && proposta.status !== "EMITIDA"
          ? { ...proposta, [key]: value }
          : proposta
      )
    }));
  }

  function removePropostaComercial(localId: string) {
    setForm((current) => ({
      ...current,
      propostasComerciais: current.propostasComerciais.filter(
        (proposta) => proposta.localId !== localId || proposta.status === "EMITIDA"
      )
    }));
  }

  function addPropostaOpcional(propostaLocalId: string) {
    setForm((current) => ({
      ...current,
      propostasComerciais: current.propostasComerciais.map((proposta) =>
        proposta.localId === propostaLocalId && proposta.status !== "EMITIDA"
          ? {
              ...proposta,
              opcionais: [
                ...proposta.opcionais,
                createEmptyPropostaOpcional(proposta.opcionais.length + 1)
              ]
            }
          : proposta
      )
    }));
  }

  function updatePropostaOpcional(
    propostaLocalId: string,
    opcionalLocalId: string,
    key: keyof PropostaOpcionalForm,
    value: string | number
  ) {
    setForm((current) => ({
      ...current,
      propostasComerciais: current.propostasComerciais.map((proposta) =>
        proposta.localId === propostaLocalId && proposta.status !== "EMITIDA"
          ? {
              ...proposta,
              opcionais: proposta.opcionais.map((opcional) =>
                opcional.localId === opcionalLocalId ? { ...opcional, [key]: String(value) } : opcional
              )
            }
          : proposta
      )
    }));
  }

  function removePropostaOpcional(propostaLocalId: string, opcionalLocalId: string) {
    setForm((current) => ({
      ...current,
      propostasComerciais: current.propostasComerciais.map((proposta) =>
        proposta.localId === propostaLocalId && proposta.status !== "EMITIDA"
          ? {
              ...proposta,
              opcionais: proposta.opcionais
                .filter((opcional) => opcional.localId !== opcionalLocalId)
                .map((opcional, index) => ({ ...opcional, ordem: index + 1 }))
            }
          : proposta
      )
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

    const payload = buildPayload(form, economicPreview);
    debugCostFlow("A. Antes de salvar", {
      orcamentoId: selectedId || null,
      frentes: form.frentes.map((frente) => ({
        id: frente.localId,
        nome: frente.nome,
        recursos: form.itens
          .filter((item) => isRecursoItem(item) && item.frenteTempId === frente.localId)
          .map((item) => ({
            id: item.localId,
            descricao: item.descricao,
            quantidade: Number(item.quantidade) || 0,
            custoUnitario: Number(item.custoUnitario) || 0,
            total: roundMoney(
              (Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0)
            )
          }))
      })),
      payload
    });
    const response = await fetch(selectedId ? `/api/orcamentos/${selectedId}` : "/api/orcamentos", {
      method: selectedId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    debugCostFlow("B. Depois do retorno do salvamento", {
      statusHttp: response.status,
      payloadRetornado: data,
      recursosRetornados: Array.isArray(data.itens)
        ? data.itens.filter((item: OrcamentoApi["itens"][number]) => item.tipoItem === "RECURSO")
        : [],
      formacaoPrecoPersistida: data.formacaoPreco ?? null
    });

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
            <>
              <FrentesOperacionaisSection
                cenarios={form.cenarios}
                frentes={form.frentes}
                itens={form.itens}
                custosFrentes={motorCustosForm?.frentes ?? []}
                servicoOptions={servicoOptions}
                materialOptions={materialOptions}
                equipamentoOptions={equipamentoOptions}
                classeOperacionalOptions={classeOperacionalOptions}
                colaboradorOptions={colaboradorOptions}
                fornecedorOptions={fornecedorOptions}
                onAdd={addFrente}
                onRemove={removeFrente}
                onUpdate={updateFrente}
                onAddItem={addItemToFrente}
                onRemoveItem={removeItem}
                onUpdateItem={updateItem}
              />
              <CenariosPropostasSection
                cenarios={form.cenarios}
                propostas={form.propostasComerciais}
                total={totalForm}
                cenarioTotals={cenarioTotals}
                onAddCenario={addCenario}
                onRemoveCenario={removeCenario}
                onUpdateCenario={updateCenario}
                onAddProposta={addPropostaComercial}
                onRemoveProposta={removePropostaComercial}
                onUpdateProposta={updatePropostaComercial}
                onAddOpcional={addPropostaOpcional}
                onUpdateOpcional={updatePropostaOpcional}
                onRemoveOpcional={removePropostaOpcional}
              />
            </>
          ) : (
            <ItensSection
              tipo={form.tipo}
              itens={form.itens}
              frentes={form.frentes}
              servicoOptions={servicoOptions}
              materialOptions={materialOptions}
              equipamentoOptions={equipamentoOptions}
              classeOperacionalOptions={classeOperacionalOptions}
              colaboradorOptions={colaboradorOptions}
              fornecedorOptions={fornecedorOptions}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdate={updateItem}
            />
          )}

          <div className="orcamentos-form-section orcamentos-economia-section">
            <div className="orcamentos-form-heading">
              <span>{form.tipo === "OPERACIONAL" ? "04" : "04"}</span>
              <div>
                <h3>
                  {form.tipo === "OPERACIONAL"
                    ? "Motor operacional, custos e preco"
                    : "Formacao preliminar"}
                </h3>
                {form.tipo === "OPERACIONAL" ? (
                  <small>O preco nasce do planejamento da execucao, nao de um chute comercial.</small>
                ) : null}
              </div>
            </div>

            {form.tipo === "OPERACIONAL" ? (
              <>
                <div className="orcamentos-engine-flow" aria-label="Fluxo de formacao do preco">
                  {[
                    "Frente de servico",
                    "Metodo executivo",
                    "Planejamento operacional",
                    "Recursos",
                    "Custos",
                    "Preco final"
                  ].map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>

                <div className="orcamentos-economia-layers">
                  <article className="orcamentos-layer-card">
                    <span className="orcamentos-layer-kicker">Planejamento operacional</span>
                    <h4>Como a obra sera executada?</h4>
                    <p>
                      Motor preparado para transformar metodo executivo, quantidade, distancias e
                      premissas em produtividade, prazo, recursos e gargalos nas proximas sprints.
                    </p>
                    <div className="orcamentos-layer-metrics">
                      <strong>{form.frentes.length}</strong>
                      <small>frente(s)</small>
                      <strong>{prazoCriticoLabelForm}</strong>
                      <small>frente critica</small>
                      <strong>{recursosPlanejadosForm}</strong>
                      <small>recurso(s)</small>
                    </div>
                  </article>

                  <article className="orcamentos-layer-card">
                    <span className="orcamentos-layer-kicker">Engenharia economica</span>
                    <h4>Quanto custa executar?</h4>
                    <div className="orcamentos-mode-selector">
                      {(["SIMPLIFICADO", "COMPLETO"] as ModoCustoOrcamento[]).map((modo) => (
                        <button
                          key={modo}
                          type="button"
                          className={modoCustoForm === modo ? "is-active" : ""}
                          onClick={() => updateFormacao("modoCusto", modo)}
                        >
                          {modo === "SIMPLIFICADO" ? "Modo simplificado" : "Modo completo"}
                        </button>
                      ))}
                    </div>

                    {modoCustoForm === "COMPLETO" ? (
                      <>
                        <div className="orcamentos-calculated-field">
                          <span>Custo direto calculado</span>
                          <strong>{formatCurrency(custoDiretoCalculadoForm)}</strong>
                          <small>
                            Recursos convertidos para a unidade economica de cada frente.
                          </small>
                        </div>

                        <div className="orcamentos-cost-memory">
                          <strong>Memoria de calculo</strong>
                          {motorCustosForm?.memoria.length ? (
                            <div className="orcamentos-cost-memory-list">
                              {motorCustosForm.memoria.map((memoria, index) => (
                                <div key={`${memoria.frenteRef}-${memoria.descricao}-${index}`}>
                                  <span>
                                    {memoria.descricao} ({memoria.unidadeCustoFormatada})
                                  </span>
                                  <small>{memoria.formula}</small>
                                  <strong>{formatCurrency(memoria.custoTotal)}</strong>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <small>
                              Nenhum recurso suficiente para calcular o custo direto. Use o modo
                              simplificado enquanto detalha os recursos.
                            </small>
                          )}
                          {motorCustosForm?.avisos.length ? (
                            <ul>
                              {motorCustosForm.avisos.slice(0, 4).map((aviso) => (
                                <li key={aviso}>{aviso}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="orcamentos-calculated-field">
                        <span>Custo direto das frentes</span>
                        <strong>{formatCurrency(custoDiretoForm)}</strong>
                        <small>
                          Informe o custo manual dentro de cada frente. Quando houver recursos
                          validos, o calculo automatico tem prioridade.
                        </small>
                      </div>
                    )}

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
                    <div className="orcamentos-unit-costs">
                      {unidadesHomogeneasForm ? (
                        <>
                          <span>Direto/unidade: {formatCurrency(custoDiretoUnitarioForm)}</span>
                          <span>Total/unidade: {formatCurrency(custoTotalUnitarioForm)}</span>
                        </>
                      ) : (
                        <span>Custos unitarios exibidos separadamente por unidade no painel executivo.</span>
                      )}
                    </div>
                  </article>

                  <article className="orcamentos-layer-card">
                    <span className="orcamentos-layer-kicker">Formacao do preco</span>
                    <h4>Quanto devemos cobrar?</h4>
                    <div className="orcamentos-form-grid orcamentos-layer-grid">
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
                        <span className="manager-field-label">Ajuste comercial</span>
                        <input
                          className="field-control"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.formacaoPreco.ajusteComercial}
                          onChange={(event) => updateFormacao("ajusteComercial", event.target.value)}
                        />
                        <small className="manager-field-hint">
                          Opcional. Quando informado, substitui o preco sugerido antes de
                          desconto e acrescimo.
                        </small>
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
                    </div>
                  </article>
                </div>

                <div className="orcamentos-executive-cost-panel">
                  {gruposExecutivosForm.length ? (
                    gruposExecutivosForm.map((grupo) => (
                      <div key={grupo.unidade}>
                        <span>{grupo.frentes.join(", ")}</span>
                        <strong>
                          {grupo.quantidadeTotal.toLocaleString("pt-BR")} {grupo.unidade}
                        </strong>
                        <small>
                          Producao: {grupo.producaoPrevistaDia.toLocaleString("pt-BR")} {grupo.unidade}/dia
                        </small>
                        <small>
                          Prazo critico: {grupo.prazoCritico.toLocaleString("pt-BR")} {grupo.prazoUnidade}
                        </small>
                        <small>Custo unit.: {formatCurrency(grupo.custoDiretoUnitario)}</small>
                      </div>
                    ))
                  ) : (
                    <div>
                      <span>Planejamento</span>
                      <strong>-</strong>
                      <small>Informe frentes e recursos para gerar indicadores.</small>
                    </div>
                  )}
                  <div>
                    <span>Preco final unitario</span>
                    <strong>{unidadesHomogeneasForm ? formatCurrency(precoFinalUnitarioForm) : "-"}</strong>
                    <small>
                      {unidadesHomogeneasForm
                        ? "apos ajustes comerciais"
                        : "nao consolidado para unidades diferentes"}
                    </small>
                  </div>
                  <div className="is-total">
                    <span>Valor total do orcamento</span>
                    <strong>{formatCurrency(totalForm)}</strong>
                    <small>soma financeira das frentes</small>
                  </div>
                </div>
              </>
            ) : (
              <div className="orcamentos-form-grid">
                <label className="manager-field">
                  <span className="manager-field-label">Custo direto</span>
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
                  <span className="manager-field-label">Preco final manual</span>
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
              </div>
            )}

            <label className="manager-field orcamentos-observacao-economica">
              <span className="manager-field-label">Observacoes internas</span>
              <textarea
                className="field-control"
                rows={3}
                value={form.observacaoInterna}
                onChange={(event) => updateForm("observacaoInterna", event.target.value)}
              />
            </label>

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
                <span>Custo direto</span>
                <strong>{formatCurrency(custoDiretoForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? modoCustoForm === "COMPLETO"
                      ? "Calculado a partir dos recursos planejados."
                      : "Informado no modo simplificado."
                    : "Direto dos itens ou valor manual."}
                </small>
              </article>
              <article>
                <span>Custo total</span>
                <strong>{formatCurrency(baseCustosForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Custo direto + indireto."
                    : "Custo direto + indireto."}
                </small>
              </article>
              <article>
                <span>Preco sugerido</span>
                <strong>{formatCurrency(precoSugeridoForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Custo total + margem + impostos."
                    : "Custo + margem + impostos."}
                </small>
              </article>
              <article>
                <span>Preco final</span>
                <strong>{formatCurrency(totalForm)}</strong>
                <small>
                  {form.tipo === "OPERACIONAL"
                    ? "Ajuste comercial, desconto e acrescimo aplicados."
                    : "Total comercial apos ajustes."}
                </small>
              </article>
            </div>
          </div>

          <PremissasSection
            stepLabel={form.tipo === "OPERACIONAL" ? "05" : "05"}
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
  cenarios: CenarioForm[];
  frentes: FrenteForm[];
  itens: ItemForm[];
  custosFrentes: ReturnType<typeof calcularMotorCustos>["frentes"];
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: BasicSelectOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof FrenteForm, value: string | number) => void;
  onAddItem: (frenteLocalId: string, tipoItem: TipoItemOrcamento) => void;
  onRemoveItem: (localId: string) => void;
  onUpdateItem: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  type OperationalLevel = "principal" | "metodo" | "auxiliares" | "recursos";
  const [openLevels, setOpenLevels] = useState<Record<string, OperationalLevel | null>>({});

  function getOpenLevel(frenteLocalId: string) {
    return Object.prototype.hasOwnProperty.call(openLevels, frenteLocalId)
      ? openLevels[frenteLocalId]
      : "principal";
  }

  function toggleLevel(frenteLocalId: string, level: OperationalLevel) {
    setOpenLevels((current) => {
      const active = Object.prototype.hasOwnProperty.call(current, frenteLocalId)
        ? current[frenteLocalId]
        : "principal";

      return { ...current, [frenteLocalId]: active === level ? null : level };
    });
  }

  function openLevel(frenteLocalId: string, level: OperationalLevel) {
    setOpenLevels((current) => ({ ...current, [frenteLocalId]: level }));
  }

  return (
    <div className="orcamentos-form-section orcamentos-operational-section">
      <div className="orcamentos-form-heading">
        <span>02</span>
        <div>
          <h3>Frentes de servico</h3>
          <small>
            Profundidade progressiva: primeiro defina execucao, depois recursos, custos e preco.
          </small>
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
          const recursosPlanejamento = itensDaFrente.filter((item) => isRecursoItem(item));
          const custoFrente = props.custosFrentes.find((item) => item.ref === frente.localId);
          const custoCalculadoPorRecursos = custoFrente?.origemCusto === "RECURSOS";
          const unidadeProdutividadeLabel = getProdutividadeLabel(frente.unidadeProducao);
          const frenteCalculoMessage = getFrenteCalculoMessage(frente);
          const openLevelId = getOpenLevel(frente.localId);

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
                  <span className="manager-field-label">Cenario</span>
                  <select
                    className="field-control"
                    value={frente.cenarioTempId}
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "cenarioTempId", event.target.value)
                    }
                  >
                    <option value="">Cenario padrao</option>
                    {props.cenarios.map((cenario) => (
                      <option key={cenario.localId} value={cenario.localId}>
                        {cenario.ordem} - {cenario.nome}
                      </option>
                    ))}
                  </select>
                </label>
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
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelId === "principal"}
                    onClick={() => toggleLevel(frente.localId, "principal")}
                  >
                    <div>
                    <span>Nivel 1</span>
                    <strong>Servico principal</strong>
                    <small>
                      {servicosPrincipais.length > 0
                        ? `${servicosPrincipais.length} servico(s) principal(is) informado(s).`
                        : "Define o que sera executado nesta frente."}
                    </small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelId === "principal" ? "-" : "+"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openLevel(frente.localId, "principal");
                      props.onAddItem(frente.localId, "SERVICO_PRINCIPAL");
                    }}
                  >
                    Adicionar principal
                  </button>
                </div>
                {openLevelId === "principal" ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum servico principal informado nesta frente."
                      itens={servicosPrincipais}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                    />
                  </div>
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelId === "metodo"}
                    onClick={() => toggleLevel(frente.localId, "metodo")}
                  >
                    <div>
                    <span>Nivel 2</span>
                    <strong>Metodo executivo</strong>
                    <small>{frente.metodoExecutivo.trim() ? "Metodo executivo preenchido." : "Opcional. Registra como a frente sera executada."}</small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelId === "metodo" ? "-" : "+"}
                    </span>
                  </button>
                </div>
                {openLevelId === "metodo" ? (
                  <div className="orcamentos-depth-content">
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
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelId === "auxiliares"}
                    onClick={() => toggleLevel(frente.localId, "auxiliares")}
                  >
                    <div>
                    <span>Nivel 3</span>
                    <strong>Servicos auxiliares</strong>
                    <small>
                      {servicosAuxiliares.length > 0
                        ? `${servicosAuxiliares.length} servico(s) auxiliar(es) informado(s).`
                        : "Opcional. Complementos da execucao principal."}
                    </small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelId === "auxiliares" ? "-" : "+"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openLevel(frente.localId, "auxiliares");
                      props.onAddItem(frente.localId, "SERVICO_AUXILIAR");
                    }}
                  >
                    Adicionar auxiliar
                  </button>
                </div>
                {openLevelId === "auxiliares" ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum servico auxiliar informado."
                      itens={servicosAuxiliares}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                    />
                  </div>
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelId === "recursos"}
                    onClick={() => toggleLevel(frente.localId, "recursos")}
                  >
                    <div>
                    <span>Niveis 4 a 6</span>
                    <strong>Recursos operacionais</strong>
                    <small>
                      {recursosPlanejamento.length > 0
                        ? `${recursosPlanejamento.length} recurso(s) | ${formatCurrency(custoFrente?.custoDireto ?? 0)}`
                        : "Recursos sao meios de execucao. Produtividade pertence a frente e ao metodo."}
                    </small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelId === "recursos" ? "-" : "+"}
                    </span>
                  </button>
                  <button type="button" onClick={() => {
                    openLevel(frente.localId, "recursos");
                    props.onAddItem(frente.localId, "RECURSO");
                  }}>
                    Adicionar recurso
                  </button>
                </div>
                {openLevelId === "recursos" ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum equipamento, equipe, material ou terceiro planejado."
                      itens={recursosPlanejamento}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                    />
                    <div className="orcamentos-front-cost-panel">
                  <label className="manager-field">
                    <span className="manager-field-label">Custo da frente</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        custoCalculadoPorRecursos
                          ? String(custoFrente?.custoDireto ?? 0)
                          : frente.custoManual
                      }
                      readOnly={custoCalculadoPorRecursos}
                      disabled={custoCalculadoPorRecursos}
                      onChange={(event) =>
                        props.onUpdate(frente.localId, "custoManual", event.target.value)
                      }
                    />
                  </label>
                  <div className="orcamentos-front-cost-origin">
                    <span>
                      {custoCalculadoPorRecursos
                        ? "Calculado pelos recursos"
                        : "Informado manualmente"}
                    </span>
                    <strong>{formatCurrency(custoFrente?.custoDireto ?? 0)}</strong>
                    <small>
                      {custoCalculadoPorRecursos
                        ? "O valor manual nao participa do Motor enquanto houver recursos validos."
                        : "Sem recursos validos, este valor compoe o Custo Direto do orcamento."}
                    </small>
                  </div>
                    </div>
                    <textarea
                      className="field-control"
                      rows={2}
                      value={frente.observacao}
                      placeholder="Observacoes internas desta frente."
                      onChange={(event) => props.onUpdate(frente.localId, "observacao", event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CenariosPropostasSection(props: {
  cenarios: CenarioForm[];
  propostas: PropostaComercialForm[];
  total: number;
  cenarioTotals: Record<string, number>;
  onAddCenario: () => void;
  onRemoveCenario: (localId: string) => void;
  onUpdateCenario: (localId: string, key: keyof CenarioForm, value: string | number | boolean) => void;
  onAddProposta: () => void;
  onRemoveProposta: (localId: string) => void;
  onUpdateProposta: (localId: string, key: keyof PropostaComercialForm, value: string) => void;
  onAddOpcional: (propostaLocalId: string) => void;
  onUpdateOpcional: (
    propostaLocalId: string,
    opcionalLocalId: string,
    key: keyof PropostaOpcionalForm,
    value: string | number
  ) => void;
  onRemoveOpcional: (propostaLocalId: string, opcionalLocalId: string) => void;
}) {
  return (
    <div className="orcamentos-form-section orcamentos-cenarios-section">
      <div className="orcamentos-form-heading">
        <span>03</span>
        <div>
          <h3>Cenarios e propostas comerciais</h3>
          <small>
            O orcamento e estudo interno. A proposta comercial so nasce quando voce preparar uma oferta ao cliente.
          </small>
        </div>
      </div>

      <div className="orcamentos-cenarios-grid">
        <article className="orcamentos-layer-card">
          <div className="orcamentos-depth-heading">
            <div>
              <span>Cenarios</span>
              <strong>Alternativas de execucao</strong>
              <small>Dados especificos de uma alternativa nao devem ser misturados com outra.</small>
            </div>
            <button type="button" onClick={props.onAddCenario}>
              Adicionar cenario
            </button>
          </div>
          <div className="orcamentos-items-list">
            {props.cenarios.length === 0 ? (
              <p className="orcamentos-operational-empty">
                O sistema cria um cenario principal automaticamente para preservar o fluxo rapido.
              </p>
            ) : null}
            {props.cenarios.map((cenario) => (
              <div key={cenario.localId} className="orcamentos-cenario-row">
                <label className="manager-field">
                  <span className="manager-field-label">Nome</span>
                  <input
                    className="field-control"
                    value={cenario.nome}
                    onChange={(event) => props.onUpdateCenario(cenario.localId, "nome", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Status</span>
                  <select
                    className="field-control"
                    value={cenario.status}
                    onChange={(event) =>
                      props.onUpdateCenario(
                        cenario.localId,
                        "status",
                        event.target.value as StatusCenarioOrcamento
                      )
                    }
                  >
                    <option value="EM_ESTUDO">Em estudo</option>
                    <option value="ACEITO">Aceito</option>
                    <option value="REJEITADO">Rejeitado</option>
                  </select>
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Padrao</span>
                  <select
                    className="field-control"
                    value={cenario.isPadrao ? "SIM" : "NAO"}
                    onChange={(event) =>
                      props.onUpdateCenario(cenario.localId, "isPadrao", event.target.value === "SIM")
                    }
                  >
                    <option value="SIM">Sim</option>
                    <option value="NAO">Nao</option>
                  </select>
                </label>
                <label className="manager-field orcamentos-span-3">
                  <span className="manager-field-label">Descricao do cenario</span>
                  <textarea
                    className="field-control"
                    rows={2}
                    value={cenario.descricao}
                    onChange={(event) =>
                      props.onUpdateCenario(cenario.localId, "descricao", event.target.value)
                    }
                  />
                </label>
                <label className="manager-field orcamentos-span-3">
                  <span className="manager-field-label">Metodo executivo do cenario</span>
                  <textarea
                    className="field-control"
                    rows={2}
                    value={cenario.metodoExecutivo}
                    onChange={(event) =>
                      props.onUpdateCenario(cenario.localId, "metodoExecutivo", event.target.value)
                    }
                  />
                </label>
                {props.cenarios.length > 1 ? (
                  <button type="button" className="button-secondary" onClick={() => props.onRemoveCenario(cenario.localId)}>
                    Remover cenario
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="orcamentos-layer-card">
          <div className="orcamentos-depth-heading">
            <div>
              <span>Propostas</span>
              <strong>Ofertas comerciais</strong>
              <small>Cada proposta aponta para um cenario e possui revisao propria.</small>
            </div>
            <button type="button" onClick={props.onAddProposta}>
              Adicionar proposta
            </button>
          </div>
          <div className="orcamentos-items-list">
            {props.propostas.length === 0 ? (
              <p className="orcamentos-operational-empty">
                Nenhuma proposta criada. Use "Adicionar proposta" quando quiser preparar uma oferta comercial.
              </p>
            ) : null}
            {props.propostas.map((proposta) => {
              const isEmitida = proposta.status === "EMITIDA";
              const cenarioPadrao = props.cenarios.find((cenario) => cenario.isPadrao) ?? props.cenarios[0];
              const cenarioTotal =
                props.cenarioTotals[proposta.cenarioTempId] ??
                (cenarioPadrao ? props.cenarioTotals[cenarioPadrao.localId] : props.total);
              const opcionaisTotal = proposta.opcionais.reduce(
                (sum, opcional) =>
                  sum + (Number(opcional.quantidade) || 0) * (Number(opcional.valorUnitario) || 0),
                0
              );

              return (
              <div key={proposta.localId} className="orcamentos-cenario-row">
                <label className="manager-field">
                  <span className="manager-field-label">Cenario</span>
                  <select
                    className="field-control"
                    value={proposta.cenarioTempId}
                    disabled={isEmitida}
                    onChange={(event) =>
                      props.onUpdateProposta(proposta.localId, "cenarioTempId", event.target.value)
                    }
                  >
                    <option value="">Cenario padrao</option>
                    {props.cenarios.map((cenario) => (
                      <option key={cenario.localId} value={cenario.localId}>
                        {cenario.ordem} - {cenario.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Codigo</span>
                  <input
                    className="field-control"
                    value={proposta.codigo}
                    disabled={isEmitida}
                    onChange={(event) => props.onUpdateProposta(proposta.localId, "codigo", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Revisao</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    value={proposta.revisao}
                    disabled={isEmitida}
                    onChange={(event) => props.onUpdateProposta(proposta.localId, "revisao", event.target.value)}
                  />
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Status</span>
                  <select
                    className="field-control"
                    value={proposta.status}
                    disabled={isEmitida}
                    onChange={(event) =>
                      props.onUpdateProposta(
                        proposta.localId,
                        "status",
                        event.target.value as StatusPropostaComercial
                      )
                    }
                  >
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="EMITIDA">Emitida</option>
                    <option value="REJEITADA">Rejeitada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </label>
                <label className="manager-field orcamentos-span-2">
                  <span className="manager-field-label">Titulo</span>
                  <input
                    className="field-control"
                    value={proposta.titulo}
                    disabled={isEmitida}
                    onChange={(event) => props.onUpdateProposta(proposta.localId, "titulo", event.target.value)}
                  />
                </label>
                <label className="manager-field orcamentos-span-3">
                  <span className="manager-field-label">Condicoes comerciais</span>
                  <textarea
                    className="field-control"
                    rows={2}
                    value={proposta.condicoesComerciais}
                    disabled={isEmitida}
                    onChange={(event) =>
                      props.onUpdateProposta(proposta.localId, "condicoesComerciais", event.target.value)
                    }
                  />
                </label>
                <div className="orcamentos-depth-block orcamentos-span-3">
                  <div className="orcamentos-depth-heading">
                    <div>
                      <span>Itens opcionais</span>
                      <strong>Servicos adicionais da proposta</strong>
                      <small>Opcionais nao criam novos cenarios e poderao ser contratados individualmente em sprint futura.</small>
                    </div>
                    <button type="button" disabled={isEmitida} onClick={() => props.onAddOpcional(proposta.localId)}>
                      Adicionar opcional
                    </button>
                  </div>
                  {proposta.opcionais.length === 0 ? (
                    <p className="orcamentos-operational-empty">Nenhum item opcional nesta proposta.</p>
                  ) : null}
                  {proposta.opcionais.map((opcional) => (
                    <div key={opcional.localId} className="orcamentos-optional-row">
                      <input
                        className="field-control"
                        value={opcional.descricao}
                        disabled={isEmitida}
                        placeholder="Descricao do opcional"
                        onChange={(event) =>
                          props.onUpdateOpcional(proposta.localId, opcional.localId, "descricao", event.target.value)
                        }
                      />
                      <input
                        className="field-control"
                        value={opcional.unidade}
                        disabled={isEmitida}
                        placeholder="Un"
                        onChange={(event) =>
                          props.onUpdateOpcional(proposta.localId, opcional.localId, "unidade", event.target.value)
                        }
                      />
                      <input
                        className="field-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={opcional.quantidade}
                        disabled={isEmitida}
                        onChange={(event) =>
                          props.onUpdateOpcional(proposta.localId, opcional.localId, "quantidade", event.target.value)
                        }
                      />
                      <input
                        className="field-control"
                        type="number"
                        min="0"
                        step="0.01"
                        value={opcional.valorUnitario}
                        disabled={isEmitida}
                        onChange={(event) =>
                          props.onUpdateOpcional(proposta.localId, opcional.localId, "valorUnitario", event.target.value)
                        }
                      />
                      <input
                        className="field-control"
                        value={opcional.condicoes}
                        disabled={isEmitida}
                        placeholder="Condicoes especificas"
                        onChange={(event) =>
                          props.onUpdateOpcional(proposta.localId, opcional.localId, "condicoes", event.target.value)
                        }
                      />
                      <strong>{formatCurrency((Number(opcional.quantidade) || 0) * (Number(opcional.valorUnitario) || 0))}</strong>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={isEmitida}
                        onClick={() => props.onRemoveOpcional(proposta.localId, opcional.localId)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
                <div className="orcamentos-proposta-total">
                  <span>Valor atual da proposta</span>
                  <strong>{formatCurrency(cenarioTotal + opcionaisTotal)}</strong>
                </div>
                {isEmitida ? (
                  <p className="orcamentos-front-validation">Proposta emitida: snapshot preservado. Gere nova revisao para alterar.</p>
                ) : null}
                <button type="button" className="button-secondary" disabled={isEmitida} onClick={() => props.onRemoveProposta(proposta.localId)}>
                  Remover proposta
                </button>
              </div>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}

function OperationalItemList(props: {
  emptyLabel: string;
  itens: ItemForm[];
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: BasicSelectOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
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
            <span>{formatCurrency(isRecursoItem(item) ? calcItemCost(item) : calcItemTotal(item))}</span>
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
            {isRecursoItem(item) ? (
              <ResourceItemFields
                item={item}
                materialOptions={props.materialOptions}
                classeOperacionalOptions={props.classeOperacionalOptions}
                colaboradorOptions={props.colaboradorOptions}
                fornecedorOptions={props.fornecedorOptions}
                onUpdate={props.onUpdate}
              />
            ) : (
              <ServiceItemFields
                item={item}
                servicoOptions={props.servicoOptions}
                onUpdate={props.onUpdate}
              />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ServiceItemFields(props: {
  item: ItemForm;
  servicoOptions: ServicoSelectOption[];
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  function handleServicoChange(value: string) {
    props.onUpdate(props.item.localId, "servicoId", value);
    const selected = props.servicoOptions.find((option) => option.value === value);

    if (!selected) {
      return;
    }

    props.onUpdate(props.item.localId, "descricao", selected.label.replace(/^[^-]+ - /, ""));

    if (selected.unidadeFaturamento) {
      props.onUpdate(props.item.localId, "unidade", selected.unidadeFaturamento);
    }
  }

  return (
    <>
      <label className="manager-field">
        <span className="manager-field-label">Servico</span>
        <SearchableSelect
          value={props.item.servicoId}
          options={props.servicoOptions}
          placeholder="Buscar servico"
          onChange={handleServicoChange}
        />
      </label>
      <label className="manager-field orcamentos-span-2">
        <span className="manager-field-label">Descricao</span>
        <input
          className="field-control"
          value={props.item.descricao}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "descricao", event.target.value)
          }
        />
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Unidade</span>
        <input
          className="field-control"
          value={props.item.unidade}
          onChange={(event) => props.onUpdate(props.item.localId, "unidade", event.target.value)}
        />
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Quantidade</span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.quantidade}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "quantidade", event.target.value)
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
          value={props.item.valorUnitario}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "valorUnitario", event.target.value)
          }
        />
        <small className="manager-field-hint">Preco de venda deste servico.</small>
      </label>
    </>
  );
}

function ResourceItemFields(props: {
  item: ItemForm;
  materialOptions: MaterialSelectOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  const recursoOptions = getRecursoOptions(props.item.categoriaRecurso, props);
  const recursoValue = getRecursoValue(props.item);

  function handleResourceChange(value: string) {
    const selected = recursoOptions.find((option) => option.value === value);
    const label = selected?.nome ?? selected?.label ?? "";

    if (props.item.categoriaRecurso === "EQUIPAMENTO") {
      props.onUpdate(props.item.localId, "classeOperacional", value);
      props.onUpdate(props.item.localId, "recursoReferenciaId", "");
      props.onUpdate(props.item.localId, "recursoNome", value);
      props.onUpdate(props.item.localId, "descricao", value);
      return;
    }

    if (props.item.categoriaRecurso === "MATERIAL") {
      const material = props.materialOptions.find((option) => option.value === value);
      props.onUpdate(props.item.localId, "materialId", value);
      props.onUpdate(props.item.localId, "recursoReferenciaId", value);
      props.onUpdate(props.item.localId, "recursoNome", material?.descricao ?? label);
      props.onUpdate(props.item.localId, "descricao", material?.descricao ?? label);
      props.onUpdate(props.item.localId, "unidade", material?.unidadePadrao ?? props.item.unidade);
      return;
    }

    props.onUpdate(props.item.localId, "recursoReferenciaId", value);
    props.onUpdate(props.item.localId, "recursoNome", label);
    props.onUpdate(props.item.localId, "descricao", label);
  }

  return (
    <>
      <label className="manager-field">
        <span className="manager-field-label">Categoria do recurso</span>
        <select
          className="field-control"
          value={props.item.categoriaRecurso}
          onChange={(event) =>
            props.onUpdate(
              props.item.localId,
              "categoriaRecurso",
              event.target.value as CategoriaRecursoOrcamento
            )
          }
        >
          {categoriaRecursoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="manager-field orcamentos-span-2">
        <span className="manager-field-label">Recurso</span>
        <SearchableSelect
          value={recursoValue}
          options={recursoOptions}
          placeholder={getRecursoPlaceholder(props.item.categoriaRecurso)}
          onChange={handleResourceChange}
        />
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Quantidade</span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.quantidade}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "quantidade", event.target.value)
          }
        />
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Unidade</span>
        <input
          className="field-control"
          value={props.item.unidade}
          onChange={(event) => props.onUpdate(props.item.localId, "unidade", event.target.value)}
        />
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Custo unitario</span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.custoUnitario}
          onChange={(event) =>
          props.onUpdate(props.item.localId, "custoUnitario", event.target.value)
          }
        />
      </label>
      <label className="manager-field orcamentos-span-3">
        <span className="manager-field-label">Observacoes do recurso</span>
        <input
          className="field-control"
          value={props.item.observacao}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "observacao", event.target.value)
          }
        />
      </label>
    </>
  );
}

function getRecursoOptions(
  categoria: CategoriaRecursoOrcamento,
  options: {
    materialOptions: MaterialSelectOption[];
    classeOperacionalOptions: BasicSelectOption[];
    colaboradorOptions: NamedSelectOption[];
    fornecedorOptions: NamedSelectOption[];
  }
) : RecursoSelectOption[] {
  if (categoria === "EQUIPAMENTO") return options.classeOperacionalOptions;
  if (categoria === "MATERIAL") return options.materialOptions;
  if (categoria === "EQUIPE") return options.colaboradorOptions;
  return options.fornecedorOptions;
}

function getRecursoValue(item: ItemForm) {
  if (item.categoriaRecurso === "EQUIPAMENTO") return item.classeOperacional;
  if (item.categoriaRecurso === "MATERIAL") return item.materialId;
  return item.recursoReferenciaId;
}

function getRecursoPlaceholder(categoria: CategoriaRecursoOrcamento) {
  if (categoria === "EQUIPAMENTO") return "Buscar classe operacional";
  if (categoria === "MATERIAL") return "Buscar material";
  if (categoria === "EQUIPE") return "Buscar colaborador/equipe";
  return "Buscar fornecedor/terceiro";
}

function ItensSection(props: {
  tipo: TipoOrcamento;
  itens: ItemForm[];
  frentes: FrenteForm[];
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: BasicSelectOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
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
                  {(props.tipo === "OPERACIONAL" ? tipoItemOperacionalOptions : [tipoItemOptions[0]]).map((option) => (
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

function buildPayload(
  form: OrcamentoForm,
  previewCalculado?: ReturnType<typeof buildEconomicPreview>
) {
  const itensPreenchidos = form.itens.filter(isItemPreenchido);
  const itensValidos =
    form.tipo === "OPERACIONAL"
      ? itensPreenchidos.filter((item) => Boolean(item.frenteTempId))
      : itensPreenchidos;
  const economicPreview = previewCalculado ?? buildEconomicPreview(form);
  const formacaoPreco = buildFormacaoPayload(form, economicPreview);

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
    cenarios: form.tipo === "OPERACIONAL" ? form.cenarios.map(mapCenarioPayload) : [],
    propostasComerciais:
      form.tipo === "OPERACIONAL"
        ? form.propostasComerciais.map(mapPropostaComercialPayload)
        : [],
    frentes: form.tipo === "OPERACIONAL" ? form.frentes.map(mapFrentePayload) : [],
    itens: itensValidos.map((item) => mapItemPayload(item, form.tipo)),
    premissas: form.premissas.filter(isPremissaPreenchida).map((premissa) => ({
      tipo: premissa.tipo,
      ordem: premissa.ordem,
      titulo: premissa.titulo,
      descricao: premissa.descricao
    }))
  };
}

function mapCenarioPayload(cenario: CenarioForm) {
  return {
    tempId: cenario.localId,
    ordem: cenario.ordem,
    nome: cenario.nome,
    descricao: cenario.descricao,
    metodoExecutivo: cenario.metodoExecutivo,
    observacao: cenario.observacao,
    isPadrao: cenario.isPadrao,
    status: cenario.status
  };
}

function mapPropostaComercialPayload(proposta: PropostaComercialForm) {
  return {
    tempId: proposta.localId,
    cenarioTempId: proposta.cenarioTempId,
    codigo: proposta.codigo,
    revisao: Number(proposta.revisao) || 0,
    titulo: proposta.titulo,
    status: proposta.status,
    condicoesComerciais: proposta.condicoesComerciais,
    observacao: proposta.observacao,
    opcionais: proposta.opcionais
      .filter((opcional) => opcional.descricao.trim())
      .map((opcional) => ({
        tempId: opcional.localId,
        ordem: opcional.ordem,
        codigo: opcional.codigo,
        descricao: opcional.descricao,
        unidade: opcional.unidade,
        quantidade: Number(opcional.quantidade) || 0,
        valorUnitario: Number(opcional.valorUnitario) || 0,
        condicoes: opcional.condicoes,
        observacao: opcional.observacao
      }))
  };
}

function mapItemPayload(item: ItemForm, tipoOrcamento: TipoOrcamento) {
  const recurso = isRecursoItem(item);
  const servicoOperacional =
    item.tipoItem === "SERVICO_PRINCIPAL" || item.tipoItem === "SERVICO_AUXILIAR";

  return {
    frenteTempId: tipoOrcamento === "OPERACIONAL" ? item.frenteTempId : "",
    tipoItem: item.tipoItem,
    servicoId: recurso ? null : item.servicoId || null,
    materialId:
      recurso && item.categoriaRecurso === "MATERIAL"
        ? item.materialId || null
        : servicoOperacional
          ? null
          : item.materialId || null,
    equipamentoId: recurso || servicoOperacional ? null : item.equipamentoId || null,
    categoriaRecurso: recurso ? item.categoriaRecurso : null,
    classeOperacional:
      recurso && item.categoriaRecurso === "EQUIPAMENTO" ? item.classeOperacional : "",
    recursoReferenciaId: recurso ? item.recursoReferenciaId : "",
    recursoNome: recurso ? item.recursoNome : "",
    ordem: item.ordem,
    codigo: item.codigo,
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: Number(item.quantidade) || 0,
    produtividade: recurso ? null : item.produtividade ? Number(item.produtividade) : null,
    custoUnitario: recurso ? Number(item.custoUnitario) || 0 : Number(item.custoUnitario) || 0,
    valorUnitario: recurso ? 0 : Number(item.valorUnitario) || 0,
    observacao: item.observacao
  };
}

function toNumberOrZero(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFormacaoPayload(
  form: OrcamentoForm,
  economicPreview: ReturnType<typeof buildEconomicPreview>
) {
  const formacaoPreco = form.formacaoPreco;
  const payload = {
    modoCusto: formacaoPreco.modoCusto,
    custoDireto: economicPreview.custoDireto,
    custoIndireto: economicPreview.custoIndireto,
    impostosPercentual: toNumberOrZero(formacaoPreco.impostosPercentual),
    impostosValor: economicPreview.impostosValor,
    margemPercentual: toNumberOrZero(formacaoPreco.margemPercentual),
    margemValor: economicPreview.margemValor,
    precoSugerido: economicPreview.precoSugerido,
    ajusteComercial: toNumberOrZero(formacaoPreco.ajusteComercial),
    precoFinal:
      form.tipo === "OPERACIONAL"
        ? economicPreview.total
        : toNumberOrZero(formacaoPreco.precoFinal),
    observacao: formacaoPreco.observacao.trim()
  };

  const hasNumericValue = Object.entries(payload).some(
    ([key, value]) =>
      key !== "observacao" &&
      key !== "modoCusto" &&
      typeof value === "number" &&
      value > 0
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
      item.classeOperacional ||
      item.recursoReferenciaId ||
      item.recursoNome ||
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
    cenarioTempId: frente.cenarioTempId,
    tempId: frente.localId,
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao,
    metodoExecutivo: frente.metodoExecutivo,
    unidadeProducao: frente.unidadeProducao,
    quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
    produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
    prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
    custoManual: Number(frente.custoManual) || 0,
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
  const cenarios: CenarioForm[] = (item.cenarios ?? []).map((cenario) => ({
    localId: cenario.id,
    ordem: cenario.ordem,
    nome: cenario.nome,
    descricao: cenario.descricao ?? "",
    metodoExecutivo: cenario.metodoExecutivo ?? "",
    observacao: cenario.observacao ?? "",
    isPadrao: cenario.isPadrao,
    status: cenario.status
  }));
  const frentes: FrenteForm[] = item.frentes.map((frente) => ({
    localId: frente.id,
    cenarioTempId: frente.cenarioId ?? cenarios.find((cenario) => cenario.isPadrao)?.localId ?? "",
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao ?? "",
    metodoExecutivo: frente.metodoExecutivo ?? "",
    unidadeProducao: frente.unidadeProducao ?? "",
    quantidadePrevista: toStringValue(frente.quantidadePrevista),
    produtividadeDia: toStringValue(frente.produtividadeDia),
    prazoEstimadoDias: toStringValue(frente.prazoEstimadoDias),
    custoManual: toStringValue(frente.custoManual ?? 0),
    calculoReferencia: "",
    observacao: frente.observacao ?? ""
  }));
  const firstFrenteId = frentes[0]?.localId ?? "";
  const propostas: PropostaComercialForm[] = (item.propostas ?? []).map((proposta) => ({
    localId: proposta.id,
    cenarioTempId: proposta.cenarioId ?? "",
    codigo: proposta.codigo,
    revisao: toStringValue(proposta.revisao),
    titulo: proposta.titulo ?? "",
    status: proposta.status,
    condicoesComerciais: proposta.condicoesComerciais ?? "",
    observacao: proposta.observacao ?? "",
    opcionais:
      proposta.opcionais?.map((opcional) => ({
        localId: opcional.id,
        ordem: opcional.ordem,
        codigo: opcional.codigo ?? "",
        descricao: opcional.descricao,
        unidade: opcional.unidade,
        quantidade: toStringValue(opcional.quantidade),
        valorUnitario: toStringValue(opcional.valorUnitario),
        condicoes: opcional.condicoes ?? "",
        observacao: opcional.observacao ?? ""
      })) ?? []
  }));

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
      modoCusto: item.formacaoPreco?.modoCusto === "COMPLETO" ? "COMPLETO" : "SIMPLIFICADO",
      custoDireto: toStringValue(item.formacaoPreco?.custoDireto ?? 0),
      custoIndireto: toStringValue(item.formacaoPreco?.custoIndireto ?? 0),
      impostosPercentual: toStringValue(item.formacaoPreco?.impostosPercentual ?? 0),
      impostosValor: toStringValue(item.formacaoPreco?.impostosValor ?? 0),
      margemPercentual: toStringValue(item.formacaoPreco?.margemPercentual ?? 0),
      margemValor: toStringValue(item.formacaoPreco?.margemValor ?? 0),
      precoSugerido: toStringValue(item.formacaoPreco?.precoSugerido ?? 0),
      ajusteComercial: toStringValue(item.formacaoPreco?.ajusteComercial ?? 0),
      precoFinal:
        item.tipo === "OPERACIONAL"
          ? "0"
          : toStringValue(item.formacaoPreco?.precoFinal ?? 0),
      observacao: toStringValue(item.formacaoPreco?.observacao ?? "")
    },
    cenarios,
    propostasComerciais: propostas,
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
            categoriaRecurso: orcamentoItem.categoriaRecurso ?? "EQUIPAMENTO",
            classeOperacional: orcamentoItem.classeOperacional ?? "",
            recursoReferenciaId: orcamentoItem.recursoReferenciaId ?? "",
            recursoNome: orcamentoItem.recursoNome ?? "",
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
