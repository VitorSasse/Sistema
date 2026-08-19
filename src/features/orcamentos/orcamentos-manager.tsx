"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Pencil, Truck } from "lucide-react";
import { SearchableSelect } from "@/components/form/searchable-select";
import {
  calcularMotorCustos,
  type CostEngineMemoriaRecurso
} from "@/lib/orcamentos/cost-engine";
import { calcularConsolidacaoEconomica } from "@/lib/orcamentos/economic-engine";
import {
  normalizeOperationalResource,
  resolveOperationalResourceDescription
} from "@/lib/orcamentos/operational-resource-domain";
import { criarNovaRevisaoProposta } from "@/lib/orcamentos/proposta-revision";
import {
  campoTecnicoHerdado,
  criarSnapshotCaracteristicasRecurso,
  normalizarSnapshotCaracteristicasRecurso,
  personalizarCampoTecnico,
  valoresEfetivosDaHeranca,
  type CampoTecnicoRecurso,
  type SnapshotCaracteristicasRecurso
} from "@/lib/orcamentos/resource-inheritance";
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
  | "LOCACAO"
  | "TRANSPORTE"
  | "SUBEMPREITADA"
  | "VERBA"
  | "OUTRO";
type ModoPrecificacaoItemOrcamento = "PRECO_DIRETO" | "COMPOSICAO";
type CategoriaRecursoOrcamento = "EQUIPAMENTO" | "EQUIPE" | "MATERIAL" | "TERCEIRO";
type TipoPremissaOrcamento = "PREMISSA" | "CONDICAO" | "EXCLUSAO" | "OBSERVACAO";
type ModoCustoOrcamento = "SIMPLIFICADO" | "COMPLETO";
type ModoCustoFrente = "AUTO" | "MANUAL";
type NaturezaFrenteOrcamento = "COMERCIAL" | "OPERACIONAL";
type OrigemItemComercialOrcamento = "SERVICE" | "RESOURCE" | "MANUAL";
type FormaApresentacaoComercialItem =
  | "QUANTIDADE_DEFINIDA"
  | "PRECO_UNITARIO_REFERENCIAL";
type OrigemPrazoFrente = "AUTOMATICO" | "AJUSTADO";
type OrigemQuantidadeOperacional = "FRENTE" | "PERSONALIZADA";
type OrigemValorAplicadoOrcamento =
  | "CALCULADO_AUTOMATICAMENTE"
  | "PERSONALIZADO_PELO_USUARIO";
type TipoCalculoRecurso = "AUTOMATICO" | "VALOR_TOTAL_MANUAL";
type UnidadeEconomicaCusto =
  | "CUSTO_FIXO"
  | "DIA"
  | "HORA"
  | "KM"
  | "M3"
  | "M2"
  | "VIAGEM"
  | "CARGA"
  | "MES"
  | "UNIDADE_PRODUZIDA"
  | "UNIDADE"
  | "VALOR_TOTAL";
type StatusCenarioOrcamento = "EM_ESTUDO" | "ACEITO" | "REJEITADO";
type StatusPropostaComercial = "RASCUNHO" | "EMITIDA" | "ACEITA" | "REJEITADA" | "CANCELADA";
type ModoExibicaoValoresPdf =
  | "SOMENTE_TOTAL_GLOBAL"
  | "SUBTOTAL_POR_FRENTE"
  | "DETALHADO_POR_ITEM_E_FRENTE";

type ClienteOption = {
  id: string;
  codigo: string;
  nome: string;
  status?: string;
  cadastroCompleto?: boolean;
};

type ObraOption = {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
  status?: string;
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
  referenciaTecnicaId?: string | null;
  referenciaTecnica?: ReferenciaTecnicaRecursoOption | null;
  tipoRecurso: string;
  naturezaRecurso?: string | null;
  classeOperacional?: string | null;
  descricaoOperacional?: string | null;
  capacidadeM3?: string | number | null;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: UnidadeEconomicaCusto | null;
  custoPadrao?: string | number | null;
  permitirEdicaoOrcamento?: boolean;
  caracteristicasTecnicas?: Record<string, unknown> | null;
};

type UnidadeCusteioOption = {
  id: string;
  codigo: string;
  rotulo: string;
  baseEconomica: UnidadeEconomicaCusto;
  sufixo: string;
  ativo: boolean;
};

type FormaCusteioRecursoOption = {
  id: string;
  nome: string;
  valorReferencia: string | number;
  preferencial: boolean;
  ativo: boolean;
  unidadeCusteio: UnidadeCusteioOption;
};

type ReferenciaTecnicaRecursoOption = {
  id: string;
  nome: string;
  ativo: boolean;
  formasCusteio?: FormaCusteioRecursoOption[];
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
  referenciasTecnicasRecursos: ReferenciaTecnicaRecursoOption[];
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
type EquipamentoResourceOption = BasicSelectOption & {
  nome: string;
  classeOperacional: string;
  capacidadeM3: string | number | null;
  unidadeCapacidade: string | null;
  unidadeEconomicaPadrao: UnidadeEconomicaCusto | null;
  custoPadrao: string | number | null;
  permitirEdicaoOrcamento: boolean;
  naturezaRecurso: string | null;
  tipoRecurso: string | null;
  descricaoOperacional: string | null;
  caracteristicasTecnicas: Record<string, unknown> | null;
  legado?: boolean;
};
type ReferenciaTecnicaResourceOption = BasicSelectOption & {
  nome: string;
  formasCusteio: FormaCusteioRecursoOption[];
};
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
  natureza: NaturezaFrenteOrcamento;
  nome: string;
  descricao: string;
  metodoExecutivo: string;
  unidadeProducao: string;
  quantidadePrevista: string;
  produtividadeDia: string;
  prazoEstimadoDias: string;
  prazoTeoricoDias: string;
  prazoAdotadoDias: string;
  origemPrazo: OrigemPrazoFrente;
  modoCusto: ModoCustoFrente;
  custoManual: string;
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
  modoExibicaoValoresPdf: ModoExibicaoValoresPdf;
  condicoesComerciais: string;
  observacao: string;
  emitidaEm?: string | null;
  pdfOficialUrl?: string | null;
  opcionais: PropostaOpcionalForm[];
};

type ItemForm = {
  localId: string;
  frenteTempId: string;
  tipoItem: TipoItemOrcamento;
  origemItemComercial: OrigemItemComercialOrcamento;
  descricaoManualComercial: string;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  referenciaTecnicaRecursoId: string;
  formaCusteioRecursoId: string;
  formaCusteioSnapshot: FormaCusteioSnapshot | null;
  valorReferenciaCusteio: string;
  valorAplicadoCusteio: string;
  categoriaRecurso: CategoriaRecursoOrcamento;
  classeOperacional: string;
  recursoReferenciaId: string;
  recursoNome: string;
  modoPrecificacao: ModoPrecificacaoItemOrcamento;
  formaApresentacaoComercial: FormaApresentacaoComercialItem;
  precoCompra: string;
  markupPercentual: string;
  precoVendaSobrescrito: boolean;
  custoCalculadoOriginal: string;
  custoBaseSobrescrito: string;
  custoBaseAplicado: string;
  origemCustoAplicado: OrigemValorAplicadoOrcamento;
  precoCalculado: string;
  precoAplicado: string;
  origemValorAplicado: OrigemValorAplicadoOrcamento;
  motivoSobrescrita: string;
  fornecedorPreferencialId: string;
  exibirNoPdf: boolean;
  observacaoComercial: string;
  ordem: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  quantidadeOperacional: string;
  origemQuantidadeOperacional: OrigemQuantidadeOperacional;
  unidadeQuantidadeOperacional: string;
  produtividade: string;
  custoUnitario: string;
  tipoCalculoRecurso: TipoCalculoRecurso;
  unidadeEconomicaCusto: UnidadeEconomicaCusto | "";
  valorCusto: string;
  horasDia: string;
  horasTotais: string;
  viagensDia: string;
  viagensTotais: string;
  distanciaViagemKm: string;
  quilometrosTotais: string;
  capacidadePorViagem: string;
  unidadeCapacidade: string;
  caracteristicasRecursoSnapshot: SnapshotCaracteristicasRecurso | null;
  camposTecnicosPersonalizados: string[];
  cargasTotais: string;
  mesesTotais: string;
  diasTrabalhadosMes: string;
  custoTotalCalculado: string;
  memoriaCalculo: string;
  valorUnitario: string;
  observacao: string;
};

type FormaCusteioSnapshot = {
  versao: 1;
  origem: "REFERENCIA_TECNICA";
  referenciaTecnicaRecursoId: string;
  referenciaTecnicaNome: string;
  formaCusteioRecursoId: string;
  formaCusteioNome: string;
  unidadeCusteioId: string;
  unidadeCusteioCodigo: string;
  unidadeCusteioRotulo: string;
  baseEconomica: UnidadeEconomicaCusto;
  sufixo: string;
  valorReferencia: number;
  valorAplicado: number;
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
    natureza?: NaturezaFrenteOrcamento | null;
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
    modoExibicaoValoresPdf?: ModoExibicaoValoresPdf | null;
    condicoesComerciais: string | null;
    observacao: string | null;
    emitidaEm?: string | null;
    pdfOficialUrl?: string | null;
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
    natureza?: NaturezaFrenteOrcamento | null;
    nome: string;
    descricao: string | null;
    metodoExecutivo: string | null;
    unidadeProducao: string | null;
    quantidadePrevista: string | number | null;
    produtividadeDia: string | number | null;
    prazoEstimadoDias: string | number | null;
    prazoTeoricoDias: string | number | null;
    prazoAdotadoDias: string | number | null;
    origemPrazo: OrigemPrazoFrente;
    modoCusto: ModoCustoFrente;
    custoManual: string | number;
    observacao: string | null;
  }>;
  itens: Array<{
    id: string;
    frenteId: string | null;
    tipoItem: TipoItemOrcamento;
    origemItemComercial?: OrigemItemComercialOrcamento | null;
    descricaoManualComercial?: string | null;
    servicoId: string | null;
    materialId: string | null;
    equipamentoId: string | null;
    referenciaTecnicaRecursoId?: string | null;
    formaCusteioRecursoId?: string | null;
    formaCusteioSnapshot?: unknown;
    valorReferenciaCusteio?: string | number | null;
    valorAplicadoCusteio?: string | number | null;
    categoriaRecurso: CategoriaRecursoOrcamento | null;
    classeOperacional: string | null;
    recursoReferenciaId: string | null;
    recursoNome: string | null;
    modoPrecificacao?: ModoPrecificacaoItemOrcamento | null;
    formaApresentacaoComercial?: FormaApresentacaoComercialItem | null;
    precoCompra?: string | number | null;
    markupPercentual?: string | number | null;
    precoVendaSobrescrito?: boolean | null;
    custoCalculadoOriginal?: string | number | null;
    custoBaseSobrescrito?: string | number | null;
    custoBaseAplicado?: string | number | null;
    origemCustoAplicado?: OrigemValorAplicadoOrcamento | null;
    precoCalculado?: string | number | null;
    precoAplicado?: string | number | null;
    origemValorAplicado?: OrigemValorAplicadoOrcamento | null;
    motivoSobrescrita?: string | null;
    fornecedorPreferencialId?: string | null;
    exibirNoPdf?: boolean | null;
    observacaoComercial?: string | null;
    ordem: number;
    codigo: string | null;
    descricao: string;
    unidade: string;
    quantidade: string | number;
    quantidadeOperacional: string | number | null;
    origemQuantidadeOperacional: OrigemQuantidadeOperacional;
    unidadeQuantidadeOperacional?: string | null;
    produtividade: string | number | null;
    custoUnitario: string | number;
    tipoCalculoRecurso: TipoCalculoRecurso;
    unidadeEconomicaCusto: UnidadeEconomicaCusto | null;
    valorCusto: string | number | null;
    horasDia: string | number | null;
    horasTotais: string | number | null;
    viagensDia: string | number | null;
    viagensTotais: string | number | null;
    distanciaViagemKm: string | number | null;
    quilometrosTotais: string | number | null;
    capacidadePorViagem: string | number | null;
    unidadeCapacidade: string | null;
    caracteristicasRecursoSnapshot: unknown;
    camposTecnicosPersonalizados: string[];
    viagensTeoricas: string | number | null;
    viagensOperacionais: number | null;
    custoPorViagem: string | number | null;
    cargasTotais: string | number | null;
    mesesTotais: string | number | null;
    diasTrabalhadosMes: string | number | null;
    custoTotalCalculado: string | number;
    memoriaCalculo: string | null;
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

const naturezaFrenteOptions: { value: NaturezaFrenteOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "OPERACIONAL", label: "Operacional" }
];

const tipoItemOptions: { value: TipoItemOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "SERVICO_PRINCIPAL", label: "Servico principal" },
  { value: "SERVICO_AUXILIAR", label: "Servico auxiliar" },
  { value: "RECURSO", label: "Recurso" },
  { value: "MATERIAL", label: "Material" },
  { value: "LOCACAO", label: "Locacao" },
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "SUBEMPREITADA", label: "Subempreitada" },
  { value: "VERBA", label: "Verba" },
  { value: "OUTRO", label: "Outro" }
];

const tipoItemOperacionalOptions = tipoItemOptions.filter((option) =>
  ["SERVICO_PRINCIPAL", "SERVICO_AUXILIAR", "MATERIAL", "RECURSO"].includes(option.value)
);

const modoPrecificacaoOptions: { value: ModoPrecificacaoItemOrcamento; label: string }[] = [
  { value: "PRECO_DIRETO", label: "Preco direto" },
  { value: "COMPOSICAO", label: "Composicao" }
];

const formaApresentacaoComercialOptions: {
  value: FormaApresentacaoComercialItem;
  label: string;
  helper: string;
}[] = [
  {
    value: "QUANTIDADE_DEFINIDA",
    label: "Quantidade definida",
    helper: "Participa do valor global da proposta."
  },
  {
    value: "PRECO_UNITARIO_REFERENCIAL",
    label: "Preco unitario referencial",
    helper: "Tabela comercial para futura medicao. Nao soma no valor global."
  }
];

const categoriaRecursoOptions: { value: CategoriaRecursoOrcamento; label: string }[] = [
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "EQUIPE", label: "Equipe" },
  { value: "MATERIAL", label: "Material" },
  { value: "TERCEIRO", label: "Terceiro" }
];

const tipoCalculoRecursoOptions: { value: TipoCalculoRecurso; label: string }[] = [
  { value: "AUTOMATICO", label: "Automatico pelos parametros operacionais" },
  { value: "VALOR_TOTAL_MANUAL", label: "Valor total manual" }
];

const unidadeEconomicaOptions: { value: UnidadeEconomicaCusto; label: string }[] = [
  { value: "CUSTO_FIXO", label: "Custo fixo" },
  { value: "DIA", label: "Por dia" },
  { value: "HORA", label: "Por hora" },
  { value: "UNIDADE_PRODUZIDA", label: "Por unidade produzida" },
  { value: "M3", label: "Por m3" },
  { value: "M2", label: "Por m2" },
  { value: "KM", label: "Por km" },
  { value: "VIAGEM", label: "Por viagem" },
  { value: "CARGA", label: "Por carga" },
  { value: "MES", label: "Por mes" },
  { value: "UNIDADE", label: "Por unidade de recurso (legado)" },
  { value: "VALOR_TOTAL", label: "Valor total (compatibilidade)" }
];

const unidadeQuantidadeOperacionalOptions = [
  "h",
  "dia",
  "km",
  "viagem",
  "m3",
  "m2",
  "unidade",
  "verba"
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
  referenciasTecnicasRecursos: [],
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
  const cenarioPadrao = createEmptyCenario(1, true);
  const frentePadrao = {
    ...createEmptyFrente(1, "COMERCIAL"),
    cenarioTempId: cenarioPadrao.localId
  };

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
    cenarios: [cenarioPadrao],
    propostasComerciais: [],
    frentes: [frentePadrao],
    itens: [createEmptyItem("COMERCIAL", 1, frentePadrao.localId)],
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

function createEmptyFrente(ordem: number, natureza: NaturezaFrenteOrcamento = "COMERCIAL"): FrenteForm {
  return {
    localId: uid("frente"),
    cenarioTempId: "",
    ordem,
    natureza,
    nome: `Frente ${ordem}`,
    descricao: "",
    metodoExecutivo: "",
    unidadeProducao: "",
    quantidadePrevista: "",
    produtividadeDia: "",
    prazoEstimadoDias: "",
    prazoTeoricoDias: "",
    prazoAdotadoDias: "",
    origemPrazo: "AUTOMATICO",
    modoCusto: "AUTO",
    custoManual: "0",
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
    modoExibicaoValoresPdf: "SOMENTE_TOTAL_GLOBAL",
    condicoesComerciais: "",
    observacao: "",
    emitidaEm: null,
    pdfOficialUrl: null,
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
    origemItemComercial: "MANUAL",
    descricaoManualComercial: "",
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    referenciaTecnicaRecursoId: "",
    formaCusteioRecursoId: "",
    formaCusteioSnapshot: null,
    valorReferenciaCusteio: "",
    valorAplicadoCusteio: "",
    categoriaRecurso: "EQUIPAMENTO",
    classeOperacional: "",
    recursoReferenciaId: "",
    recursoNome: "",
    modoPrecificacao: "PRECO_DIRETO",
    formaApresentacaoComercial: "QUANTIDADE_DEFINIDA",
    precoCompra: "",
    markupPercentual: "",
    precoVendaSobrescrito: false,
    custoCalculadoOriginal: "",
    custoBaseSobrescrito: "",
    custoBaseAplicado: "",
    origemCustoAplicado: "CALCULADO_AUTOMATICAMENTE",
    precoCalculado: "",
    precoAplicado: "",
    origemValorAplicado: "CALCULADO_AUTOMATICAMENTE",
    motivoSobrescrita: "",
    fornecedorPreferencialId: "",
    exibirNoPdf: true,
    observacaoComercial: "",
    ordem,
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    quantidadeOperacional: "",
    origemQuantidadeOperacional: "FRENTE",
    unidadeQuantidadeOperacional: "",
    produtividade: "",
    custoUnitario: "0",
    tipoCalculoRecurso: "AUTOMATICO",
    unidadeEconomicaCusto: "CUSTO_FIXO",
    valorCusto: "0",
    horasDia: "8",
    horasTotais: "",
    viagensDia: "",
    viagensTotais: "",
    distanciaViagemKm: "",
    quilometrosTotais: "",
    capacidadePorViagem: "",
    unidadeCapacidade: "",
    caracteristicasRecursoSnapshot: null,
    camposTecnicosPersonalizados: [],
    cargasTotais: "",
    mesesTotais: "",
    diasTrabalhadosMes: "22",
    custoTotalCalculado: "0",
    memoriaCalculo: "",
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

function formatOperationalNumber(value: number, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0);
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

function calcItemTotal(
  item: Pick<
    ItemForm,
    | "formaApresentacaoComercial"
    | "quantidade"
    | "valorUnitario"
    | "modoPrecificacao"
    | "precoCompra"
    | "markupPercentual"
    | "precoVendaSobrescrito"
    | "precoAplicado"
  >
) {
  if (item.formaApresentacaoComercial === "PRECO_UNITARIO_REFERENCIAL") {
    return 0;
  }

  const precoCalculado =
    item.modoPrecificacao === "COMPOSICAO" && !item.precoVendaSobrescrito && Number(item.precoCompra) > 0
      ? roundMoney((Number(item.precoCompra) || 0) * (1 + (Number(item.markupPercentual) || 0) / 100))
      : Number(item.valorUnitario) || 0;
  const precoAplicado = Number(item.precoAplicado) || precoCalculado;

  return (Number(item.quantidade) || 0) * precoAplicado;
}

function calcItemCost(item: Pick<ItemForm, "quantidade" | "custoUnitario">) {
  return (Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0);
}

function isRecursoItem(item: Pick<ItemForm, "tipoItem">) {
  return item.tipoItem === "RECURSO";
}

function isMaterialItem(item: Pick<ItemForm, "tipoItem">) {
  return item.tipoItem === "MATERIAL";
}

function isServicoComercialItem(item: Pick<ItemForm, "tipoItem">) {
  return item.tipoItem === "SERVICO_PRINCIPAL" || item.tipoItem === "SERVICO_AUXILIAR";
}

function isCommercialFrontItem(item: Pick<ItemForm, "tipoItem">) {
  return item.tipoItem !== "RECURSO";
}

function getManualCommercialName(item: Pick<ItemForm, "descricaoManualComercial" | "descricao">) {
  return item.descricaoManualComercial.trim() || item.descricao.trim();
}

function normalizeManualCommercialIdentity(item: ItemForm): ItemForm {
  if (item.origemItemComercial !== "MANUAL" || isRecursoItem(item)) {
    return item;
  }

  const nomeManual = getManualCommercialName(item);
  const descricao = item.descricao.trim();

  return {
    ...item,
    descricaoManualComercial: nomeManual,
    descricao: nomeManual && descricao === nomeManual ? "" : descricao
  };
}

function buildEconomicServiceInput(item: ItemForm) {
  return {
    frenteRef: item.frenteTempId,
    tipoItem: item.tipoItem,
    descricao:
      item.origemItemComercial === "MANUAL"
        ? getManualCommercialName(item)
        : item.descricao,
    unidade: item.unidade,
    quantidade: item.quantidade,
    valorUnitario: item.valorUnitario,
    formaApresentacaoComercial: item.formaApresentacaoComercial,
    modoPrecificacao: item.modoPrecificacao,
    precoCompra: item.precoCompra,
    markupPercentual: item.markupPercentual,
    precoVendaSobrescrito: item.precoVendaSobrescrito,
    custoUnitario: item.custoUnitario,
    custoCalculadoOriginal: item.custoCalculadoOriginal,
    custoBaseSobrescrito: item.custoBaseSobrescrito,
    custoBaseAplicado: item.custoBaseAplicado,
    precoCalculado: item.precoCalculado,
    precoAplicado: item.precoAplicado
  };
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
        origemItemComercial: "MANUAL",
        descricaoManualComercial: "",
        servicoId: "",
        materialId: "",
        equipamentoId: "",
        valorUnitario: "0",
        categoriaRecurso: next.categoriaRecurso || "EQUIPAMENTO"
      };
    }

    if (tipoItem === "MATERIAL") {
      return {
        ...next,
        origemItemComercial: "MANUAL",
        descricaoManualComercial: "",
        servicoId: "",
        equipamentoId: "",
        categoriaRecurso: "EQUIPAMENTO",
        classeOperacional: "",
        recursoReferenciaId: "",
        recursoNome: "",
        caracteristicasRecursoSnapshot: null,
        camposTecnicosPersonalizados: [],
        custoUnitario: "0",
        produtividade: ""
      };
    }

    return {
      ...next,
      origemItemComercial: next.origemItemComercial || "MANUAL",
      materialId: "",
      categoriaRecurso: "EQUIPAMENTO",
      classeOperacional: "",
      recursoReferenciaId: "",
      recursoNome: "",
      caracteristicasRecursoSnapshot: null,
      camposTecnicosPersonalizados: [],
      custoUnitario: "0",
      produtividade: ""
    };
  }

  if (key === "origemItemComercial") {
    const origem = value as OrigemItemComercialOrcamento;
    const itemAtualizado = {
      ...next,
      origemItemComercial: origem,
      servicoId: origem === "SERVICE" ? next.servicoId : "",
      equipamentoId: origem === "RESOURCE" ? next.equipamentoId : "",
      descricaoManualComercial: origem === "MANUAL" ? getManualCommercialName(next) : "",
      caracteristicasRecursoSnapshot: origem === "RESOURCE" ? next.caracteristicasRecursoSnapshot : null,
      camposTecnicosPersonalizados: origem === "RESOURCE" ? next.camposTecnicosPersonalizados : []
    };

    return normalizeManualCommercialIdentity(itemAtualizado);
  }

  if ((key === "precoCompra" || key === "markupPercentual") && !next.precoVendaSobrescrito) {
    const precoCompra = Number(key === "precoCompra" ? value : next.precoCompra) || 0;
    const markup = Number(key === "markupPercentual" ? value : next.markupPercentual) || 0;

    if (precoCompra > 0) {
      next.valorUnitario = String(roundMoney(precoCompra * (1 + markup / 100)));
    }
  }

  if (key === "valorUnitario") {
    next.precoVendaSobrescrito = true;
    next.origemValorAplicado = "PERSONALIZADO_PELO_USUARIO";
  }

  if (key === "custoBaseSobrescrito") {
    next.origemCustoAplicado = Number(value) > 0
      ? "PERSONALIZADO_PELO_USUARIO"
      : "CALCULADO_AUTOMATICAMENTE";
  }

  if (key === "categoriaRecurso") {
    const categoriaRecurso = value as CategoriaRecursoOrcamento;

    return {
      ...next,
      categoriaRecurso,
      classeOperacional: "",
      recursoReferenciaId: "",
      recursoNome: "",
      caracteristicasRecursoSnapshot: null,
      camposTecnicosPersonalizados: [],
      materialId: categoriaRecurso === "MATERIAL" ? next.materialId : "",
      equipamentoId: ""
    };
  }

  return next;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getUnidadeVendaFromUnidadeEconomica(unidade?: UnidadeEconomicaCusto | null) {
  if (!unidade) return "";

  const unidades: Partial<Record<UnidadeEconomicaCusto, string>> = {
    CUSTO_FIXO: "UN",
    DIA: "DIARIA",
    HORA: "HORA",
    KM: "KM",
    M3: "m3",
    M2: "m2",
    VIAGEM: "VIAGEM",
    CARGA: "CARGA",
    MES: "MES",
    UNIDADE_PRODUZIDA: "UN",
    UNIDADE: "UN",
    VALOR_TOTAL: "VB"
  };

  return unidades[unidade] ?? "";
}

function getEquipamentoOrigemComercialLabel(equipamento?: Pick<EquipamentoResourceOption, "tipoRecurso" | "label"> | null) {
  if (!equipamento) return "Equipamento";

  const origem = `${equipamento.tipoRecurso ?? ""} ${equipamento.label}`.toLocaleLowerCase("pt-BR");
  return origem.includes("caminh") || origem.includes("carreta") || origem.includes("veiculo")
    ? "Veiculo"
    : "Equipamento";
}

function createResourceSnapshotFromOption(equipamento: EquipamentoResourceOption) {
  return criarSnapshotCaracteristicasRecurso({
    id: equipamento.value,
    capacidadeM3: equipamento.capacidadeM3,
    unidadeCapacidade: equipamento.unidadeCapacidade,
    unidadeEconomicaPadrao: equipamento.unidadeEconomicaPadrao,
    custoPadrao: equipamento.custoPadrao,
    permitirEdicaoOrcamento: equipamento.permitirEdicaoOrcamento,
    naturezaRecurso: equipamento.naturezaRecurso,
    tipoRecurso: equipamento.tipoRecurso,
    classeOperacional: equipamento.classeOperacional,
    descricaoOperacional: equipamento.descricaoOperacional,
    caracteristicasTecnicas: equipamento.caracteristicasTecnicas
  });
}

function normalizarFormaCusteioSnapshot(value: unknown): FormaCusteioSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Partial<FormaCusteioSnapshot>;
  if (
    snapshot.versao !== 1 ||
    snapshot.origem !== "REFERENCIA_TECNICA" ||
    !snapshot.referenciaTecnicaRecursoId ||
    !snapshot.formaCusteioRecursoId ||
    !snapshot.unidadeCusteioId ||
    !snapshot.baseEconomica
  ) {
    return null;
  }

  return {
    versao: 1,
    origem: "REFERENCIA_TECNICA",
    referenciaTecnicaRecursoId: String(snapshot.referenciaTecnicaRecursoId),
    referenciaTecnicaNome: String(snapshot.referenciaTecnicaNome ?? ""),
    formaCusteioRecursoId: String(snapshot.formaCusteioRecursoId),
    formaCusteioNome: String(snapshot.formaCusteioNome ?? ""),
    unidadeCusteioId: String(snapshot.unidadeCusteioId),
    unidadeCusteioCodigo: String(snapshot.unidadeCusteioCodigo ?? ""),
    unidadeCusteioRotulo: String(snapshot.unidadeCusteioRotulo ?? ""),
    baseEconomica: snapshot.baseEconomica,
    sufixo: String(snapshot.sufixo ?? ""),
    valorReferencia: Number(snapshot.valorReferencia) || 0,
    valorAplicado: Number(snapshot.valorAplicado) || 0
  };
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

function getProdutividadeComparisonMessage(
  produtividadePlanejada: number | null,
  produtividadeResultante?: number
) {
  if (
    produtividadePlanejada === null ||
    produtividadePlanejada <= 0 ||
    produtividadeResultante === undefined ||
    produtividadeResultante <= 0
  ) {
    return "";
  }

  const variacaoPercentual = (produtividadeResultante / produtividadePlanejada - 1) * 100;
  if (Math.abs(variacaoPercentual) < 0.005) return "";

  const percentualFormatado = Math.abs(variacaoPercentual).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const direcao = variacaoPercentual > 0 ? "superior" : "inferior";

  return `Produtividade necessária ${percentualFormatado}% ${direcao} à planejada.`;
}

function getFrenteCalculoMessage(frente: FrenteForm) {
  const quantidade = parseFrenteNumber(frente.quantidadePrevista);
  const produtividade = parseFrenteNumber(frente.produtividadeDia);
  const prazo = parseFrenteNumber(frente.prazoAdotadoDias);
  const hasQuantidade = frente.quantidadePrevista.trim() !== "";
  const hasProdutividade = frente.produtividadeDia.trim() !== "";
  const hasPrazo = frente.prazoAdotadoDias.trim() !== "";

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
  const prazoAdotado = parseFrenteNumber(next.prazoAdotadoDias);
  const prazoTeorico =
    quantidade !== null && quantidade > 0 && produtividade !== null && produtividade > 0
      ? quantidade / produtividade
      : null;

  if (key === "quantidadePrevista" || key === "produtividadeDia") {
    next.prazoTeoricoDias = prazoTeorico === null ? "" : formatFrenteNumber(prazoTeorico);
    next.prazoEstimadoDias = next.prazoAdotadoDias || next.prazoTeoricoDias;
    return next;
  }

  if (key === "prazoAdotadoDias") {
    next.origemPrazo = prazoAdotado !== null && prazoAdotado > 0 ? "AJUSTADO" : "AUTOMATICO";
    next.prazoEstimadoDias = prazoAdotado !== null && prazoAdotado > 0
      ? formatFrenteNumber(prazoAdotado)
      : next.prazoTeoricoDias;
    return next;
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
  const frentesOperacionais = form.frentes.filter((frente) => frente.natureza === "OPERACIONAL");
  const refsOperacionais = new Set(frentesOperacionais.map((frente) => frente.localId));

  return {
    frentes: frentesOperacionais.map((frente) => ({
      ref: frente.localId,
      nome: frente.nome,
      unidadeProducao: frente.unidadeProducao,
      quantidadePrevista: frente.quantidadePrevista,
      produtividadeDia: frente.produtividadeDia,
      prazoEstimadoDias: frente.prazoEstimadoDias,
      prazoTeoricoDias: frente.prazoTeoricoDias,
      prazoAdotadoDias: frente.prazoAdotadoDias,
      origemPrazo: frente.origemPrazo,
      modoCusto: frente.modoCusto,
      custoManual: frente.custoManual
    })),
    recursos: form.itens
      .filter((item) => isRecursoItem(item) && refsOperacionais.has(item.frenteTempId))
      .map((item) => ({
        ref: item.localId,
        frenteRef: item.frenteTempId,
        categoria: item.categoriaRecurso,
        descricao: item.descricao,
        recursoNome: item.recursoNome,
        classeOperacional: item.classeOperacional,
        recursoReferenciaId: item.recursoReferenciaId,
        quantidade: item.quantidade,
        quantidadeOperacional: item.quantidadeOperacional,
        origemQuantidadeOperacional: item.origemQuantidadeOperacional,
        unidadeQuantidadeOperacional: item.unidadeQuantidadeOperacional,
        custoOperacional: item.custoUnitario,
        unidadeCusto: item.unidade,
        tipoCalculo: item.tipoCalculoRecurso,
        unidadeEconomicaCusto: item.unidadeEconomicaCusto || null,
        valorCusto: item.valorCusto || item.custoUnitario,
        horasDia: item.horasDia,
        horasTotais: item.horasTotais,
        viagensDia: item.viagensDia,
        viagensTotais: item.viagensTotais,
        distanciaViagemKm: item.distanciaViagemKm,
        quilometrosTotais: item.quilometrosTotais,
        capacidadePorViagem: item.capacidadePorViagem,
        unidadeCapacidade: item.unidadeCapacidade,
        cargasTotais: item.cargasTotais,
        mesesTotais: item.mesesTotais,
        diasTrabalhadosMes: item.diasTrabalhadosMes
      }))
  };
}

function getDefaultOperationalScope(form: OrcamentoForm) {
  const cenarioPadrao = form.cenarios.find((cenario) => cenario.isPadrao) ?? form.cenarios[0];
  const frentes = cenarioPadrao
    ? form.frentes.filter((frente) =>
        frente.cenarioTempId
          ? frente.cenarioTempId === cenarioPadrao.localId
          : cenarioPadrao.isPadrao
      )
    : form.frentes;
  const frenteIds = new Set(frentes.map((frente) => frente.localId));
  const itens = form.itens.filter((item) => frenteIds.has(item.frenteTempId));

  return { frentes, itens };
}

function buildOperationalConsolidation(
  form: OrcamentoForm,
  frentes: FrenteForm[],
  itens: ItemForm[]
) {
  const motorCustos = calcularMotorCustos(
    buildCostEngineInputFromForm({ ...form, frentes, itens })
  );
  const custosPorFrente = new Map(motorCustos.frentes.map((frente) => [frente.ref, frente]));
  const consolidacao = calcularConsolidacaoEconomica({
    frentes: frentes.map((frente) => ({
      ref: frente.localId,
      nome: frente.nome,
      custoDireto: frente.natureza === "COMERCIAL"
        ? 0
        : custosPorFrente.get(frente.localId)?.custoDireto ?? 0
    })),
    servicos: itens.map(buildEconomicServiceInput),
    custoDiretoLegado: form.formacaoPreco.custoDireto,
    custoIndireto: form.formacaoPreco.custoIndireto,
    margemPercentual: form.formacaoPreco.margemPercentual,
    impostosPercentual: form.formacaoPreco.impostosPercentual,
    ajusteComercial: form.formacaoPreco.ajusteComercial,
    valorDesconto: form.valorDesconto,
    valorAcrescimo: form.valorAcrescimo
  });

  return { motorCustos, consolidacao };
}

export function buildVendasFrentesFromMotor(
  form: OrcamentoForm,
  motorCustos: ReturnType<typeof calcularMotorCustos>
) {
  return calcularConsolidacaoEconomica({
    frentes: motorCustos.frentes.map((frente) => ({
      ref: frente.ref,
      nome: frente.nome,
      custoDireto: frente.custoDireto
    })),
    servicos: form.itens.map(buildEconomicServiceInput)
  }).frentes;
}

export function buildEconomicPreview(form: OrcamentoForm) {
  const isOperational = form.frentes.length > 0;
  const modoCusto = isOperational ? form.formacaoPreco.modoCusto : "SIMPLIFICADO";
  const subtotalItens = roundMoney(form.itens.reduce((sum, item) => sum + calcItemTotal(item), 0));
  const itensParaCusto = isOperational
    ? form.itens.filter((item) => item.frenteTempId)
    : form.itens;
  const escopoOperacional = isOperational ? getDefaultOperationalScope(form) : null;
  const calculoOperacional = escopoOperacional
    ? buildOperationalConsolidation(form, escopoOperacional.frentes, escopoOperacional.itens)
    : null;
  const motorCustos = calculoOperacional?.motorCustos ?? null;
  const consolidacao = calculoOperacional?.consolidacao ?? null;
  const custoDiretoCalculado = roundMoney(
    isOperational
      ? consolidacao?.custoDiretoTotal ?? 0
      : itensParaCusto.reduce((sum, item) => sum + calcItemCost(item), 0)
  );
  const custoDiretoManual = roundMoney(Number(form.formacaoPreco.custoDireto) || 0);
  const custoDireto = roundMoney(
    isOperational
      ? consolidacao?.custoDiretoTotal ?? custoDiretoManual
      : custoDiretoCalculado > 0
        ? custoDiretoCalculado
        : custoDiretoManual
  );
  const custoIndireto = roundMoney(
    isOperational
      ? consolidacao?.custoIndireto ?? 0
      : Number(form.formacaoPreco.custoIndireto) || 0
  );
  const baseCustos = roundMoney(
    isOperational ? consolidacao?.custoTotal ?? 0 : custoDireto + custoIndireto
  );
  const margemPercentual = Number(form.formacaoPreco.margemPercentual) || 0;
  const margemManual = Number(form.formacaoPreco.margemValor) || 0;
  const margemValor = roundMoney(
    isOperational
      ? consolidacao?.margemValor ?? 0
      : margemManual > 0
        ? margemManual
        : baseCustos * (margemPercentual / 100)
  );
  const impostosPercentual = Number(form.formacaoPreco.impostosPercentual) || 0;
  const impostosManual = Number(form.formacaoPreco.impostosValor) || 0;
  const impostosValor = roundMoney(
    isOperational
      ? consolidacao?.impostosValor ?? 0
      : impostosManual > 0
        ? impostosManual
        : (baseCustos + margemValor) * (impostosPercentual / 100)
  );
  const precoSugeridoCalculado = roundMoney(baseCustos + margemValor + impostosValor);
  const precoSugeridoManual = isOperational ? 0 : Number(form.formacaoPreco.precoSugerido) || 0;
  const precoSugerido = roundMoney(
    isOperational
      ? consolidacao?.precoSugeridoPendentes ?? 0
      : precoSugeridoManual > 0
        ? precoSugeridoManual
        : precoSugeridoCalculado
  );
  const ajusteComercial = roundMoney(Number(form.formacaoPreco.ajusteComercial) || 0);
  const precoFinalManual = roundMoney(Number(form.formacaoPreco.precoFinal) || 0);
  const baseVenda = roundMoney(
    isOperational
      ? consolidacao?.valorSubtotal ?? 0
      : precoFinalManual > 0
        ? precoFinalManual
        : subtotalItens > 0
          ? subtotalItens
          : precoSugerido
  );
  const desconto = roundMoney(Number(form.valorDesconto) || 0);
  const acrescimo = roundMoney(Number(form.valorAcrescimo) || 0);
  const total = roundMoney(
    isOperational
      ? consolidacao?.valorTotal ?? 0
      : Math.max(0, baseVenda - desconto + acrescimo)
  );

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
    motorCustos,
    consolidacao
  };
}

function buildNatureTotals(form: OrcamentoForm, preview: ReturnType<typeof buildEconomicPreview>) {
  if (!preview.consolidacao) {
    return { comercial: 0, operacional: 0 };
  }

  const naturezaPorFrente = new Map(
    form.frentes.map((frente) => [frente.localId, frente.natureza])
  );
  const comercial = roundMoney(
    preview.consolidacao.frentes
      .filter((frente) => naturezaPorFrente.get(frente.ref) === "COMERCIAL")
      .reduce((total, frente) => total + frente.valorVenda, 0)
  );
  const operacional = roundMoney(Math.max(0, preview.consolidacao.valorSubtotal - comercial));

  return { comercial, operacional };
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

    const frentes = form.frentes.filter((frente) => frenteIds.has(frente.localId));
    const itens = form.itens.filter(
      (item) => item.frenteTempId && frenteIds.has(item.frenteTempId)
    );
    totals[cenario.localId] = buildOperationalConsolidation(
      form,
      frentes,
      itens
    ).consolidacao.valorTotal;
  }

  return totals;
}

export function OrcamentosManager() {
  const [items, setItems] = useState<OrcamentoResumoApi[]>([]);
  const [options, setOptions] = useState<OptionsState>(emptyOptions);
  const [form, setForm] = useState<OrcamentoForm>(() => createEmptyForm());
  const [quickClienteOpen, setQuickClienteOpen] = useState(false);
  const [quickObraOpen, setQuickObraOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickClienteForm, setQuickClienteForm] = useState({
    nome: "",
    telefone: "",
    whatsapp: "",
    email: "",
    cpfCnpj: "",
    observacao: ""
  });
  const [quickObraForm, setQuickObraForm] = useState({
    nome: "",
    cidade: "",
    bairro: "",
    endereco: "",
    referencia: "",
    observacao: ""
  });
  const [selectedId, setSelectedId] = useState<string>("");
  const [filters, setFilters] = useState({
    search: "",
    status: "TODOS"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [itemValidationErrors, setItemValidationErrors] = useState<Record<string, string>>({});

  function clearError() {
    setError("");
    setErrorDetails([]);
    setItemValidationErrors({});
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
        label: `${cliente.codigo} - ${cliente.nome}${
          cliente.status === "PROSPECTO" || cliente.cadastroCompleto === false
            ? " - Cadastro incompleto"
            : ""
        }`
      })),
    [options.clientes]
  );

  const obraOptions = useMemo(
    () =>
      options.obras
        .filter((obra) => !form.clienteId || obra.clienteId === form.clienteId)
        .map((obra) => ({
          value: obra.id,
          label: `${obra.codigo} - ${obra.nome}${obra.status === "PROVISORIA" ? " - Provisoria" : ""}`
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
        nome: equipamento.descricao,
        classeOperacional: equipamento.classeOperacional ?? equipamento.descricao,
        capacidadeM3: equipamento.capacidadeM3 ?? null,
        unidadeCapacidade: equipamento.unidadeCapacidade ?? null,
        unidadeEconomicaPadrao: equipamento.unidadeEconomicaPadrao ?? null,
        custoPadrao: equipamento.custoPadrao ?? null,
        permitirEdicaoOrcamento: equipamento.permitirEdicaoOrcamento !== false,
        naturezaRecurso: equipamento.naturezaRecurso ?? null,
        tipoRecurso: equipamento.tipoRecurso ?? null,
        descricaoOperacional: equipamento.descricaoOperacional ?? null,
        caracteristicasTecnicas: equipamento.caracteristicasTecnicas ?? null
      })),
    [options.equipamentos]
  );

  const referenciaTecnicaResourceOptions = useMemo(
    () =>
      options.referenciasTecnicasRecursos.map((referencia) => ({
        value: referencia.id,
        label: referencia.nome,
        nome: referencia.nome,
        formasCusteio: referencia.formasCusteio?.filter((forma) => forma.ativo) ?? []
      })),
    [options.referenciasTecnicasRecursos]
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
      form.frentes.length > 0
        ? calcularMotorCustos(buildCostEngineInputFromForm(form))
        : null,
    [form.frentes, form.itens]
  );
  const vendasTodasFrentesForm = useMemo(
    () =>
      form.frentes.length > 0 && motorCustosForm
        ? buildVendasFrentesFromMotor(form, motorCustosForm)
        : [],
    [form.frentes.length, form.itens, motorCustosForm]
  );
  const economicPreview = useMemo(
    () => buildEconomicPreview(form),
    [form]
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
  const consolidacaoEconomicaForm = economicPreview.consolidacao;
  const totaisNaturezaForm = useMemo(
    () => buildNatureTotals(form, economicPreview),
    [form, economicPreview]
  );
  const motorCustosCenarioForm = economicPreview.motorCustos;
  const gruposExecutivosForm = motorCustosCenarioForm?.gruposUnidade ?? [];
  const unidadesHomogeneasForm = motorCustosCenarioForm?.unidadesHomogeneas ?? true;
  const quantidadeHomogeneaForm = unidadesHomogeneasForm
    ? motorCustosCenarioForm?.quantidadeTotal ?? 0
    : 0;
  const prazoCriticoForm = motorCustosCenarioForm?.prazoCritico;
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
    if (!isCostDebugEnabled() || form.frentes.length === 0) {
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
      frentes: motorCustosCenarioForm?.frentes.map((frente) => ({
        frenteId: frente.ref,
        frente: frente.nome,
        modoCusto: frente.modoCusto,
        custoDireto: frente.custoDireto,
        origemCusto: frente.origemCusto,
        custoManual: frente.custoManual,
        custoCalculadoRecursos: frente.custoCalculadoRecursos,
        recursos: frente.recursos
      })),
      custoDiretoConsolidado: motorCustosCenarioForm?.custoDiretoTotal ?? 0,
      indicadoresPorUnidade: motorCustosCenarioForm?.gruposUnidade ?? [],
      avisos: motorCustosCenarioForm?.avisos ?? []
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
      valorComercialInformado: consolidacaoEconomicaForm?.valorComercialInformado ?? 0,
      frentesPendentes: consolidacaoEconomicaForm?.frentesPendentes ?? 0,
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
    motorCustosCenarioForm,
    consolidacaoEconomicaForm,
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
      referenciasTecnicasRecursos: operacionais.referenciasTecnicasRecursos ?? [],
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

  function resetQuickClienteForm() {
    setQuickClienteForm({
      nome: "",
      telefone: "",
      whatsapp: "",
      email: "",
      cpfCnpj: "",
      observacao: ""
    });
  }

  function resetQuickObraForm() {
    setQuickObraForm({
      nome: "",
      cidade: "",
      bairro: "",
      endereco: "",
      referencia: "",
      observacao: ""
    });
  }

  async function criarClienteRapido(confirmDuplicate = false) {
    setQuickSaving(true);
    setMessage("");
    clearError();

    const response = await fetch("/api/clientes/rapido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quickClienteForm, confirmDuplicate })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 409 && data.canCreateAnyway && !confirmDuplicate) {
        const matches = Array.isArray(data.matches)
          ? data.matches
              .map((match: { codigo?: string; nome?: string }) => `${match.codigo ?? ""} ${match.nome ?? ""}`.trim())
              .join("\n")
          : "";
        const shouldCreate = window.confirm(
          `Possivel cliente ja cadastrado.\n\n${matches}\n\nDeseja criar mesmo assim?`
        );

        if (shouldCreate) {
          setQuickSaving(false);
          await criarClienteRapido(true);
          return;
        }
      } else {
        applyApiError(data, "Nao foi possivel criar o cliente provisorio.");
      }
      setQuickSaving(false);
      return;
    }

    await loadOptions();
    updateForm("clienteId", data.id);
    updateForm("obraId", "");
    resetQuickClienteForm();
    setQuickClienteOpen(false);
    setQuickObraOpen(true);
    setMessage("Cliente provisorio criado e selecionado no orcamento.");
    setQuickSaving(false);
  }

  async function criarObraRapida() {
    if (!form.clienteId) {
      setError("Selecione ou cadastre um cliente antes de criar a obra provisoria.");
      setErrorDetails([]);
      return;
    }

    setQuickSaving(true);
    setMessage("");
    clearError();

    const response = await fetch("/api/obras/rapido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...quickObraForm, clienteId: form.clienteId })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel criar a obra provisoria.");
      setQuickSaving(false);
      return;
    }

    await loadOptions();
    updateForm("obraId", data.id);
    resetQuickObraForm();
    setQuickObraOpen(false);
    setMessage("Obra provisoria criada e selecionada no orcamento.");
    setQuickSaving(false);
  }

  async function criarReferenciaTecnicaRapida(localId: string) {
    const nome = window.prompt("Nome da nova referencia tecnica:");
    const nomeLimpo = nome?.trim();

    if (!nomeLimpo) {
      return;
    }

    const response = await fetch("/api/referencias-tecnicas-recursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeLimpo, ativo: true, observacao: "", formasCusteio: [] })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel criar a referencia tecnica.");
      return;
    }

    await loadOptions();
    selectReferenciaTecnicaResource(localId, {
      value: data.id,
      label: data.nome,
      nome: data.nome,
      formasCusteio: []
    });
    setMessage("Referencia tecnica criada e selecionada no item.");
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
      frentes: current.frentes.map((frente) => {
        if (frente.localId !== localId) {
          return frente;
        }

        if (key === "custoManual") {
          return {
            ...frente,
            modoCusto: Number(value) > 0 ? "MANUAL" : frente.modoCusto,
            custoManual: String(value)
          };
        }

        return recalcularFrentePlanejamento(frente, key, value);
      })
    }));
  }

  function updateItem(localId: string, key: keyof ItemForm, value: string | number) {
    setItemValidationErrors((current) => {
      if (!current[localId]) return current;
      const next = { ...current };
      delete next[localId];
      return next;
    });
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) =>
        item.localId === localId ? normalizeItemUpdate(item, key, value) : item
      )
    }));
  }

  function selectEquipmentResource(localId: string, equipamento: EquipamentoResourceOption) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        if (equipamento.legado) {
          return {
            ...item,
            classeOperacional: equipamento.value,
            recursoReferenciaId: "",
            recursoNome: equipamento.nome,
            descricao: equipamento.nome,
            capacidadePorViagem: "",
            unidadeCapacidade: "",
            unidadeEconomicaCusto: "CUSTO_FIXO",
            caracteristicasRecursoSnapshot: null,
            camposTecnicosPersonalizados: []
          };
        }

        const snapshot = createResourceSnapshotFromOption(equipamento);
        const herdados = valoresEfetivosDaHeranca(snapshot);

        return {
          ...item,
          classeOperacional: equipamento.classeOperacional,
          recursoReferenciaId: equipamento.value,
          recursoNome: equipamento.nome,
          descricao: equipamento.nome,
          capacidadePorViagem: herdados.capacidadePorViagem,
          unidadeCapacidade: herdados.unidadeCapacidade,
          unidadeEconomicaCusto:
            (herdados.unidadeEconomicaCusto as UnidadeEconomicaCusto | "") || "CUSTO_FIXO",
          valorCusto: herdados.valorCusto || "0",
          custoUnitario: herdados.valorCusto || "0",
          caracteristicasRecursoSnapshot: snapshot,
          camposTecnicosPersonalizados: []
        };
      })
    }));
  }

  function createFormaCusteioSnapshot(
    referencia: ReferenciaTecnicaResourceOption,
    forma: FormaCusteioRecursoOption,
    valorAplicado = Number(forma.valorReferencia) || 0
  ): FormaCusteioSnapshot {
    return {
      versao: 1,
      origem: "REFERENCIA_TECNICA",
      referenciaTecnicaRecursoId: referencia.value,
      referenciaTecnicaNome: referencia.nome,
      formaCusteioRecursoId: forma.id,
      formaCusteioNome: forma.nome,
      unidadeCusteioId: forma.unidadeCusteio.id,
      unidadeCusteioCodigo: forma.unidadeCusteio.codigo,
      unidadeCusteioRotulo: forma.unidadeCusteio.rotulo,
      baseEconomica: forma.unidadeCusteio.baseEconomica,
      sufixo: forma.unidadeCusteio.sufixo,
      valorReferencia: Number(forma.valorReferencia) || 0,
      valorAplicado
    };
  }

  function selectReferenciaTecnicaResource(localId: string, referencia: ReferenciaTecnicaResourceOption) {
    const formasAtivas = referencia.formasCusteio.filter((forma) => forma.ativo);
    const preferenciais = formasAtivas.filter((forma) => forma.preferencial);
    const formaInicial = preferenciais.length === 1 ? preferenciais[0] : null;
    const valorReferencia = formaInicial ? String(formaInicial.valorReferencia ?? "") : "";
    const baseEconomica = formaInicial?.unidadeCusteio.baseEconomica ?? "CUSTO_FIXO";
    const snapshot = formaInicial ? createFormaCusteioSnapshot(referencia, formaInicial) : null;

    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) =>
        item.localId === localId
          ? {
              ...item,
              referenciaTecnicaRecursoId: referencia.value,
              formaCusteioRecursoId: formaInicial?.id ?? "",
              formaCusteioSnapshot: snapshot,
              valorReferenciaCusteio: valorReferencia,
              valorAplicadoCusteio: valorReferencia,
              classeOperacional: referencia.nome,
              recursoReferenciaId: referencia.value,
              recursoNome: referencia.nome,
              descricao: referencia.nome,
              unidadeEconomicaCusto: baseEconomica,
              valorCusto: valorReferencia || item.valorCusto,
              custoUnitario: valorReferencia || item.custoUnitario,
              caracteristicasRecursoSnapshot: null,
              camposTecnicosPersonalizados: []
            }
          : item
      )
    }));
  }

  function selectFormaCusteioResource(localId: string, formaId: string) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) => {
        if (item.localId !== localId) return item;
        const referencia = referenciaTecnicaResourceOptions.find(
          (option) => option.value === item.referenciaTecnicaRecursoId
        );
        const forma = referencia?.formasCusteio.find((candidate) => candidate.id === formaId);

        if (!referencia || !forma) {
          return {
            ...item,
            formaCusteioRecursoId: "",
            formaCusteioSnapshot: null,
            valorReferenciaCusteio: "",
            valorAplicadoCusteio: ""
          };
        }

        const valorReferencia = String(forma.valorReferencia ?? "");
        return {
          ...item,
          formaCusteioRecursoId: forma.id,
          formaCusteioSnapshot: createFormaCusteioSnapshot(referencia, forma),
          valorReferenciaCusteio: valorReferencia,
          valorAplicadoCusteio: valorReferencia,
          unidadeEconomicaCusto: forma.unidadeCusteio.baseEconomica,
          valorCusto: valorReferencia,
          custoUnitario: valorReferencia
        };
      })
    }));
  }

  function updateValorAplicadoCusteio(localId: string, value: string) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) => {
        if (item.localId !== localId) return item;
        const nextSnapshot = item.formaCusteioSnapshot
          ? {
              ...item.formaCusteioSnapshot,
              valorAplicado: Number(value) || 0
            }
          : null;

        return {
          ...item,
          valorAplicadoCusteio: value,
          formaCusteioSnapshot: nextSnapshot,
          valorCusto: value,
          custoUnitario: value
        };
      })
    }));
  }

  function selectCommercialEquipment(localId: string, equipamento: EquipamentoResourceOption) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) => {
        if (item.localId !== localId) {
          return item;
        }

        const snapshot = equipamento.legado ? null : createResourceSnapshotFromOption(equipamento);
        const herdados = snapshot ? valoresEfetivosDaHeranca(snapshot) : null;
        const unidadeVenda =
          getUnidadeVendaFromUnidadeEconomica(equipamento.unidadeEconomicaPadrao) ||
          equipamento.unidadeCapacidade ||
          item.unidade ||
          "UN";

        return {
          ...item,
          origemItemComercial: "RESOURCE",
          descricaoManualComercial: "",
          servicoId: "",
          materialId: "",
          equipamentoId: equipamento.value,
          descricao: equipamento.nome,
          unidade: unidadeVenda,
          capacidadePorViagem: herdados?.capacidadePorViagem ?? item.capacidadePorViagem,
          unidadeCapacidade: herdados?.unidadeCapacidade ?? item.unidadeCapacidade,
          unidadeEconomicaCusto:
            (herdados?.unidadeEconomicaCusto as UnidadeEconomicaCusto | "") ||
            equipamento.unidadeEconomicaPadrao ||
            item.unidadeEconomicaCusto,
          valorCusto: herdados?.valorCusto || item.valorCusto,
          caracteristicasRecursoSnapshot: snapshot,
          camposTecnicosPersonalizados: []
        };
      })
    }));
  }

  function personalizeResourceField(localId: string, campo: CampoTecnicoRecurso) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) =>
        item.localId === localId
          ? {
              ...item,
              camposTecnicosPersonalizados: personalizarCampoTecnico(
                item.camposTecnicosPersonalizados,
                campo
              )
            }
          : item
      )
    }));
  }

  function addFrente() {
    setForm((current) => {
      const cenarioPadrao = current.cenarios.find((cenario) => cenario.isPadrao) ?? current.cenarios[0];
      const naturezaPadrao: NaturezaFrenteOrcamento = "COMERCIAL";
      const frente = {
        ...createEmptyFrente(current.frentes.length + 1, naturezaPadrao),
        cenarioTempId: cenarioPadrao?.localId ?? ""
      };

      return {
        ...current,
        frentes: [...current.frentes, frente],
        itens: [
          ...current.itens,
          createEmptyItem(
            "COMERCIAL",
            current.itens.length + 1,
            frente.localId
          )
        ]
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
      const primeiraFrente = current.frentes.find((frente) => frente.localId === firstFrente);
      const tipoItem: TipoItemOrcamento =
        primeiraFrente?.natureza === "OPERACIONAL" ? "SERVICO_AUXILIAR" : "COMERCIAL";

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
    setItemValidationErrors((current) => {
      if (!current[localId]) return current;
      const next = { ...current };
      delete next[localId];
      return next;
    });
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

  function createPropostaRevision(propostaLocalId: string) {
    const propostaEmitida = form.propostasComerciais.find(
      (proposta) => proposta.localId === propostaLocalId && proposta.status === "EMITIDA"
    );

    if (!propostaEmitida) {
      return;
    }

    const novaRevisao = criarNovaRevisaoProposta({
      propostaEmitida,
      propostasExistentes: form.propostasComerciais,
      criarPropostaId: () => uid("proposta"),
      criarOpcionalId: () => uid("opcional")
    }) as PropostaComercialForm;

    setForm((current) => ({
      ...current,
      propostasComerciais: [...current.propostasComerciais, novaRevisao]
    }));
    clearError();
    setMessage("Nova revisao criada a partir do orcamento atual.");
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

    setItemValidationErrors({});
    setForm(mapApiToForm(data));
  }

  async function recarregarOrcamentoAtual(orcamentoId: string) {
    const response = await fetch(`/api/orcamentos/${orcamentoId}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel recarregar o orcamento.");
      return;
    }

    setItemValidationErrors({});
    setForm(mapApiToForm(data));
  }

  async function salvarOrcamento() {
    setSaving(true);
    setMessage("");
    clearError();

    const itemValidation = validateItemsBeforeSubmit(form);
    if (Object.keys(itemValidation.errors).length > 0) {
      setItemValidationErrors(itemValidation.errors);
      setError("Corrija os itens destacados antes de salvar o orcamento.");
      setErrorDetails(Object.values(itemValidation.errors));
      setSaving(false);
      return;
    }

    const payload = buildPayload(form, economicPreview);
    debugCostFlow("A. Antes de salvar", {
      orcamentoId: selectedId || null,
      frentes: form.frentes.map((frente) => ({
        id: frente.localId,
        nome: frente.nome,
        modoCusto: frente.modoCusto,
        custoManual: Number(frente.custoManual) || 0,
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

  function ensurePropostaPersistida(propostaLocalId: string) {
    if (!selectedId) {
      setError("Salve ou selecione um orcamento antes de gerar o PDF.");
      setErrorDetails([]);
      return false;
    }

    if (propostaLocalId.startsWith("proposta-")) {
      setError("Salve o orcamento antes de visualizar ou emitir esta proposta.");
      setErrorDetails([]);
      return false;
    }

    return true;
  }

  async function abrirPdfEmNovaAba(url: string, fallback: string) {
    const popup = window.open("", "_blank");

    if (!popup) {
      setError("O navegador bloqueou a abertura do PDF. Permita pop-ups para o BasePro e tente novamente.");
      setErrorDetails([]);
      return;
    }

    popup.document.write("<p style='font-family: sans-serif'>Gerando PDF...</p>");

    const response = await fetch(url);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      popup.close();
      applyApiError(data, fallback);
      return;
    }

    // Abrir a URL real preserva o Content-Disposition da API; blob: faz o Chrome baixar com UUID.
    popup.location.href = url;
  }

  function visualizarPreviaProposta(propostaLocalId: string) {
    if (!ensurePropostaPersistida(propostaLocalId)) {
      return;
    }

    void abrirPdfEmNovaAba(
      `/api/orcamentos/${selectedId}/propostas/${propostaLocalId}/pdf/preview`,
      "Nao foi possivel gerar a previa da proposta."
    );
  }

  function visualizarPdfOficialProposta(propostaLocalId: string) {
    if (!ensurePropostaPersistida(propostaLocalId)) {
      return;
    }

    void abrirPdfEmNovaAba(
      `/api/orcamentos/${selectedId}/propostas/${propostaLocalId}/pdf/oficial`,
      "Nao foi possivel abrir o PDF oficial da proposta."
    );
  }

  async function emitirProposta(propostaLocalId: string) {
    if (!ensurePropostaPersistida(propostaLocalId)) {
      return;
    }

    if (
      !window.confirm(
        "Ao emitir esta proposta, os dados desta revisao serao bloqueados. Alteracoes futuras exigirao uma nova revisao. Deseja continuar?"
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    clearError();

    const response = await fetch(`/api/orcamentos/${selectedId}/propostas/${propostaLocalId}/emitir`, {
      method: "POST"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      applyApiError(data, "Nao foi possivel emitir a proposta.");
      setSaving(false);
      return;
    }

    if (data.orcamento) {
      setForm(mapApiToForm(data.orcamento));
    } else if (selectedId) {
      await recarregarOrcamentoAtual(selectedId);
    }

    setMessage("Proposta emitida e PDF oficial armazenado.");
    await loadOrcamentos();
    setSaving(false);
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
    <>
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
              <h2>Orcamentos</h2>
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
                      {getStatusLabel(orcamento.status)} | {formatCurrency(orcamento.valorTotal)}
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
              {form.frentes.length > 0 ? (
                <div className="orcamentos-total-breakdown">
                  <small>Comercial: {formatCurrency(totaisNaturezaForm.comercial)}</small>
                  <small>Operacional: {formatCurrency(totaisNaturezaForm.operacional)}</small>
                </div>
              ) : null}
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

          <div className="orcamentos-form-section">
            <div className="orcamentos-form-heading">
              <span>01</span>
              <h3>Cabecalho</h3>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label orcamentos-field-label-action">
                  Cliente
                  <button type="button" onClick={() => setQuickClienteOpen(true)}>
                    + Cadastro rapido
                  </button>
                </span>
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
                <span className="manager-field-label orcamentos-field-label-action">
                  Obra
                  <button
                    type="button"
                    disabled={!form.clienteId}
                    onClick={() => setQuickObraOpen(true)}
                  >
                    + Cadastro rapido
                  </button>
                </span>
                <SearchableSelect
                  value={form.obraId}
                  options={obraOptions}
                  placeholder="Digite para buscar a obra"
                  disabled={!form.clienteId}
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

          <FrentesOperacionaisSection
            cenarios={form.cenarios}
            frentes={form.frentes}
            itens={form.itens}
            itemErrors={itemValidationErrors}
            custosFrentes={motorCustosForm?.frentes ?? []}
            vendasFrentes={vendasTodasFrentesForm}
            servicoOptions={servicoOptions}
            materialOptions={materialOptions}
            equipamentoOptions={equipamentoOptions}
            referenciaTecnicaOptions={referenciaTecnicaResourceOptions}
            classeOperacionalOptions={classeOperacionalOptions}
            colaboradorOptions={colaboradorOptions}
            fornecedorOptions={fornecedorOptions}
            onAdd={addFrente}
            onRemove={removeFrente}
            onUpdate={updateFrente}
            onAddItem={addItemToFrente}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
            onSelectEquipment={selectEquipmentResource}
            onSelectReferenciaTecnica={selectReferenciaTecnicaResource}
            onSelectFormaCusteio={selectFormaCusteioResource}
            onUpdateValorAplicadoCusteio={updateValorAplicadoCusteio}
            onQuickCreateReferenciaTecnica={criarReferenciaTecnicaRapida}
            onSelectCommercialEquipment={selectCommercialEquipment}
            onPersonalizeResourceField={personalizeResourceField}
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
            onCreateRevision={createPropostaRevision}
            onRemoveProposta={removePropostaComercial}
            onUpdateProposta={updatePropostaComercial}
            onPreviewProposta={visualizarPreviaProposta}
            onEmitProposta={emitirProposta}
            onOpenOfficialPdf={visualizarPdfOficialProposta}
            onAddOpcional={addPropostaOpcional}
            onUpdateOpcional={updatePropostaOpcional}
            onRemoveOpcional={removePropostaOpcional}
            saving={saving}
          />

          {form.frentes.length === 0 ? (
            <ItensSection
              itens={form.itens}
              servicoOptions={servicoOptions}
              materialOptions={materialOptions}
              equipamentoOptions={equipamentoOptions}
              classeOperacionalOptions={classeOperacionalOptions}
              colaboradorOptions={colaboradorOptions}
              fornecedorOptions={fornecedorOptions}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdate={updateItem}
              onSelectCommercialEquipment={selectCommercialEquipment}
            />
          ) : null}

          <div className="orcamentos-form-section orcamentos-economia-section">
            <div className="orcamentos-form-heading">
              <span>04</span>
              <div>
                <h3>Engenharia economica e formacao do preco</h3>
                <small>
                  Frentes comerciais usam preco direto; frentes operacionais usam planejamento e recursos.
                </small>
              </div>
            </div>

            {form.frentes.length > 0 ? (
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
                          <strong>Memoria de calculo por frente</strong>
                          {consolidacaoEconomicaForm?.frentes.length ? (
                            <div className="orcamentos-cost-memory-list">
                              {consolidacaoEconomicaForm.frentes.map((frente) => {
                                const custo = motorCustosCenarioForm?.frentes.find(
                                  (item) => item.ref === frente.ref
                                );
                                const venda = frente.memoriaVenda
                                  .map(
                                    (item) =>
                                      `${item.quantidade.toLocaleString("pt-BR")} ${item.unidade} x ${formatCurrency(item.valorUnitario)}`
                                  )
                                  .join(" + ");

                                return (
                                  <div key={frente.ref} className="orcamentos-front-memory-row">
                                    <span>{frente.nome}</span>
                                    <strong>{formatCurrency(frente.custoDireto)}</strong>
                                    <small>
                                      Custo: {custo?.origemCusto === "RECURSOS" ? "Recursos" : "Manual"}
                                      {" | "}Venda: {venda || "pendente de precificacao"}
                                    </small>
                                    <small>
                                      Status comercial: {frente.statusComercial === "VENDA_DEFINIDA"
                                        ? `venda definida (${formatCurrency(frente.valorVenda)})`
                                        : "pendente de precificacao"}
                                    </small>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <small>
                              Nenhum recurso suficiente para calcular o custo direto. Use o modo
                              simplificado enquanto detalha os recursos.
                            </small>
                          )}
                          {motorCustosCenarioForm?.avisos.length ? (
                            <ul>
                              {motorCustosCenarioForm.avisos.slice(0, 4).map((aviso) => (
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
                          Cada frente utiliza recursos validos e, na ausencia deles, o custo
                          direto manual informado pelo engenheiro.
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
                    <div className="orcamentos-commercial-breakdown">
                      <div>
                        <span>Venda definida</span>
                        <strong>{formatCurrency(consolidacaoEconomicaForm?.valorComercialInformado ?? 0)}</strong>
                        <small>{consolidacaoEconomicaForm?.frentesComVenda ?? 0} frente(s)</small>
                      </div>
                      <div>
                        <span>Sugerido pendente</span>
                        <strong>{formatCurrency(consolidacaoEconomicaForm?.precoSugeridoPendentes ?? 0)}</strong>
                        <small>{consolidacaoEconomicaForm?.frentesPendentes ?? 0} frente(s)</small>
                      </div>
                    </div>
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
                          Opcional. Atua somente sobre o preco final consolidado, sem alterar
                          custos ou vendas informadas nas frentes.
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
              {form.frentes.length > 0 ? (
                <>
                  <span>Custo direto: {formatCurrency(custoDiretoForm)}</span>
                  <span>Indireto: {formatCurrency(custoIndiretoForm)}</span>
                  <span>Venda definida: {formatCurrency(consolidacaoEconomicaForm?.valorComercialInformado ?? 0)}</span>
                  <span>Sugerido pendente: {formatCurrency(precoSugeridoForm)}</span>
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
                  {form.frentes.length > 0
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
                  Custo direto + indireto.
                </small>
              </article>
              <article>
                <span>Valor comercial informado</span>
                <strong>
                  {formatCurrency(
                    form.frentes.length > 0
                      ? consolidacaoEconomicaForm?.valorComercialInformado ?? 0
                      : subtotalForm
                  )}
                </strong>
                <small>
                  {form.frentes.length > 0
                    ? `${consolidacaoEconomicaForm?.frentesComVenda ?? 0} frente(s) com venda definida.`
                    : "Valor informado nos itens comerciais."}
                </small>
              </article>
              <article>
                <span>Preco sugerido</span>
                <strong>{formatCurrency(precoSugeridoForm)}</strong>
                <small>
                  {form.frentes.length > 0
                    ? `Somente para ${consolidacaoEconomicaForm?.frentesPendentes ?? 0} frente(s) sem venda.`
                    : "Custo + margem + impostos."}
                </small>
              </article>
              <article>
                <span>Preco final</span>
                <strong>{formatCurrency(totalForm)}</strong>
                <small>
                  {form.frentes.length > 0
                    ? "Ajuste comercial, desconto e acrescimo aplicados."
                    : "Total comercial apos ajustes."}
                </small>
              </article>
            </div>
          </div>

          <PremissasSection
            stepLabel="05"
            premissas={form.premissas}
            onAdd={addPremissa}
            onRemove={removePremissa}
            onUpdate={updatePremissa}
          />

          <div className="orcamentos-actions">
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

    {quickClienteOpen ? (
      <div className="orcamentos-quick-backdrop" role="dialog" aria-modal="true">
        <div className="orcamentos-quick-dialog">
          <div className="orcamentos-quick-header">
            <div>
              <span>Cadastro rapido</span>
              <h3>Cliente provisorio</h3>
              <small>Crie um cliente provisorio para iniciar o orcamento sem CPF/CNPJ.</small>
            </div>
            <button type="button" onClick={() => setQuickClienteOpen(false)}>x</button>
          </div>
          <div className="orcamentos-quick-grid">
            <label className="manager-field orcamentos-span-2">
              <span className="manager-field-label">Nome ou razao social</span>
              <input
                className="field-control"
                value={quickClienteForm.nome}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, nome: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Telefone</span>
              <input
                className="field-control"
                value={quickClienteForm.telefone}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, telefone: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">WhatsApp</span>
              <input
                className="field-control"
                value={quickClienteForm.whatsapp}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, whatsapp: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">E-mail</span>
              <input
                className="field-control"
                type="email"
                value={quickClienteForm.email}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">CPF/CNPJ opcional</span>
              <input
                className="field-control"
                value={quickClienteForm.cpfCnpj}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, cpfCnpj: event.target.value }))}
              />
            </label>
            <label className="manager-field orcamentos-span-2">
              <span className="manager-field-label">Observacoes</span>
              <textarea
                className="field-control"
                rows={3}
                value={quickClienteForm.observacao}
                onChange={(event) => setQuickClienteForm((current) => ({ ...current, observacao: event.target.value }))}
              />
            </label>
          </div>
          <div className="orcamentos-quick-actions">
            <button type="button" className="button-secondary" disabled={quickSaving} onClick={() => setQuickClienteOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="button-primary" disabled={quickSaving} onClick={() => void criarClienteRapido()}>
              {quickSaving ? "Salvando..." : "Criar cliente provisorio"}
            </button>
          </div>
        </div>
      </div>
    ) : null}

    {quickObraOpen ? (
      <div className="orcamentos-quick-backdrop" role="dialog" aria-modal="true">
        <div className="orcamentos-quick-dialog">
          <div className="orcamentos-quick-header">
            <div>
              <span>Cadastro rapido</span>
              <h3>Obra provisoria</h3>
              <small>Vinculada ao cliente selecionado e usada apenas neste fluxo de orçamento.</small>
            </div>
            <button type="button" onClick={() => setQuickObraOpen(false)}>x</button>
          </div>
          <div className="orcamentos-quick-grid">
            <label className="manager-field orcamentos-span-2">
              <span className="manager-field-label">Nome ou descricao da obra</span>
              <input
                className="field-control"
                value={quickObraForm.nome}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, nome: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Cidade</span>
              <input
                className="field-control"
                value={quickObraForm.cidade}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, cidade: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Bairro</span>
              <input
                className="field-control"
                value={quickObraForm.bairro}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, bairro: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Endereco</span>
              <input
                className="field-control"
                value={quickObraForm.endereco}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, endereco: event.target.value }))}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Referencia</span>
              <input
                className="field-control"
                value={quickObraForm.referencia}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, referencia: event.target.value }))}
              />
            </label>
            <label className="manager-field orcamentos-span-2">
              <span className="manager-field-label">Observacoes</span>
              <textarea
                className="field-control"
                rows={3}
                value={quickObraForm.observacao}
                onChange={(event) => setQuickObraForm((current) => ({ ...current, observacao: event.target.value }))}
              />
            </label>
          </div>
          <div className="orcamentos-quick-actions">
            <button type="button" className="button-secondary" disabled={quickSaving} onClick={() => setQuickObraOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="button-primary" disabled={quickSaving} onClick={() => void criarObraRapida()}>
              {quickSaving ? "Salvando..." : "Criar obra provisoria"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function FrentesOperacionaisSection(props: {
  cenarios: CenarioForm[];
  frentes: FrenteForm[];
  itens: ItemForm[];
  itemErrors: Record<string, string>;
  custosFrentes: ReturnType<typeof calcularMotorCustos>["frentes"];
  vendasFrentes: NonNullable<ReturnType<typeof buildEconomicPreview>["consolidacao"]>["frentes"];
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: EquipamentoResourceOption[];
  referenciaTecnicaOptions: ReferenciaTecnicaResourceOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof FrenteForm, value: string | number) => void;
  onAddItem: (frenteLocalId: string, tipoItem: TipoItemOrcamento) => void;
  onRemoveItem: (localId: string) => void;
  onUpdateItem: (localId: string, key: keyof ItemForm, value: string | number) => void;
  onSelectEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
  onSelectReferenciaTecnica: (localId: string, referencia: ReferenciaTecnicaResourceOption) => void;
  onSelectFormaCusteio: (localId: string, formaId: string) => void;
  onUpdateValorAplicadoCusteio: (localId: string, value: string) => void;
  onQuickCreateReferenciaTecnica: (localId: string) => void;
  onSelectCommercialEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
  onPersonalizeResourceField: (localId: string, campo: CampoTecnicoRecurso) => void;
}) {
  type OperationalLevel = "principal" | "metodo" | "auxiliares" | "materiais" | "recursos";
  const [openLevels, setOpenLevels] = useState<Record<string, OperationalLevel[]>>({});
  const defaultOpenLevels: OperationalLevel[] = ["principal"];

  function getOpenLevels(frenteLocalId: string) {
    return Object.prototype.hasOwnProperty.call(openLevels, frenteLocalId)
      ? openLevels[frenteLocalId]
      : defaultOpenLevels;
  }

  function toggleLevel(frenteLocalId: string, level: OperationalLevel) {
    setOpenLevels((current) => {
      const activeLevels = Object.prototype.hasOwnProperty.call(current, frenteLocalId)
        ? current[frenteLocalId]
        : defaultOpenLevels;
      const nextLevels = activeLevels.includes(level)
        ? activeLevels.filter((activeLevel) => activeLevel !== level)
        : [...activeLevels, level];

      return { ...current, [frenteLocalId]: nextLevels };
    });
  }

  function openLevel(frenteLocalId: string, level: OperationalLevel) {
    setOpenLevels((current) => {
      const activeLevels = Object.prototype.hasOwnProperty.call(current, frenteLocalId)
        ? current[frenteLocalId]
        : defaultOpenLevels;

      return activeLevels.includes(level)
        ? current
        : { ...current, [frenteLocalId]: [...activeLevels, level] };
    });
  }

  function hasOperationalData(frente: FrenteForm, itensDaFrente: ItemForm[]) {
    return Boolean(
      frente.unidadeProducao.trim() ||
        frente.quantidadePrevista.trim() ||
        frente.produtividadeDia.trim() ||
        frente.prazoAdotadoDias.trim() ||
        frente.prazoTeoricoDias.trim() ||
        frente.metodoExecutivo.trim() ||
        itensDaFrente.some((item) => isRecursoItem(item) || item.tipoItem === "SERVICO_AUXILIAR")
    );
  }

  function updateNatureza(frente: FrenteForm, itensDaFrente: ItemForm[], value: NaturezaFrenteOrcamento) {
    if (frente.natureza === value) return;

    if (
      frente.natureza === "OPERACIONAL" &&
      value === "COMERCIAL" &&
      hasOperationalData(frente, itensDaFrente)
    ) {
      const confirmed = window.confirm(
        "Esta frente possui dados operacionais preenchidos. Ao alterar para Comercial, esses dados deixarao de participar do calculo, mas serao preservados. Deseja continuar?"
      );

      if (!confirmed) return;
    }

    props.onUpdate(frente.localId, "natureza", value);
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
            Nenhuma frente criada. Adicione uma frente para iniciar o orcamento.
          </div>
        ) : null}

        {props.frentes.map((frente) => {
          const itensDaFrente = props.itens.filter((item) => item.frenteTempId === frente.localId);
          const servicosPrincipais = itensDaFrente.filter((item) => item.tipoItem === "SERVICO_PRINCIPAL");
          const servicosAuxiliares = itensDaFrente.filter((item) => item.tipoItem === "SERVICO_AUXILIAR");
          const materiaisComerciais = itensDaFrente.filter((item) => item.tipoItem === "MATERIAL");
          const recursosPlanejamento = itensDaFrente.filter((item) => isRecursoItem(item));
          const itensComerciais = itensDaFrente.filter((item) => !isRecursoItem(item));
          const isFrenteComercial = frente.natureza === "COMERCIAL";
          const custoFrente = props.custosFrentes.find((item) => item.ref === frente.localId);
          const vendaFrente = props.vendasFrentes.find((item) => item.ref === frente.localId);
          const custoCalculadoPorRecursos = custoFrente?.origemCusto === "RECURSOS";
          const unidadeProdutividadeLabel = getProdutividadeLabel(frente.unidadeProducao);
          const frenteCalculoMessage = getFrenteCalculoMessage(frente);
          const produtividadeComparisonMessage = getProdutividadeComparisonMessage(
            parseFrenteNumber(frente.produtividadeDia),
            custoFrente?.produtividadeResultante
          );
          const quantidadePrevistaNumero = parseFrenteNumber(frente.quantidadePrevista) ?? 0;
          const custoOperacionalUnitario = quantidadePrevistaNumero > 0
            ? (custoFrente?.custoDireto ?? 0) / quantidadePrevistaNumero
            : 0;
          const unidadeCustoOperacional = frente.unidadeProducao?.trim() || "unidade";
          const openLevelIds = getOpenLevels(frente.localId);

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
                  <span className="manager-field-label">Natureza da frente</span>
                  <select
                    className="field-control"
                    value={frente.natureza}
                    onChange={(event) =>
                      updateNatureza(frente, itensDaFrente, event.target.value as NaturezaFrenteOrcamento)
                    }
                  >
                    {naturezaFrenteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="manager-field-hint">
                    Define se esta frente sera precificada diretamente ou calculada pelo Motor Operacional.
                  </small>
                </label>
                {!isFrenteComercial ? (
                  <>
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
                  <span className="manager-field-label">Produtividade planejada/dia</span>
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
                  <small className="manager-field-hint">Premissa de produção média diária prevista desta frente.</small>
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Prazo teorico</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={frente.prazoTeoricoDias}
                    placeholder="Calculado automaticamente."
                    readOnly
                  />
                  <small className="manager-field-hint">
                    Quantidade prevista dividida pela produtividade informada.
                  </small>
                </label>
                <label className="manager-field">
                  <span className="manager-field-label">Prazo adotado</span>
                  <input
                    className="field-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={frente.prazoAdotadoDias}
                    placeholder="Opcional"
                    onChange={(event) =>
                      props.onUpdate(frente.localId, "prazoAdotadoDias", event.target.value)
                    }
                  />
                  <small className="manager-field-hint">
                    Se informado, passa a ser o prazo oficial usado nos recursos.
                  </small>
                </label>
                <div className="orcamentos-planning-summary orcamentos-span-3">
                  <span className={custoFrente?.origemPrazo === "AJUSTADO" ? "is-adjusted" : ""}>
                    {custoFrente?.origemPrazo === "AJUSTADO" ? "ADOTADO" : "AUTOMÁTICO"}
                  </span>
                  <strong>
                    Prazo utilizado: {custoFrente?.prazoDias?.toLocaleString("pt-BR") ?? "-"} {custoFrente?.prazoUnidade ?? "dia(s)"}
                  </strong>
                  <small>
                    Produtividade resultante: {custoFrente?.produtividadeResultante?.toLocaleString("pt-BR", { maximumFractionDigits: 3 }) ?? "-"} {normalizeUnidadeProducao(frente.unidadeProducao)}/dia
                  </small>
                  {produtividadeComparisonMessage ? <small>{produtividadeComparisonMessage}</small> : null}
                </div>
                {frenteCalculoMessage ? (
                  <p className="orcamentos-front-validation orcamentos-span-3">{frenteCalculoMessage}</p>
                ) : null}
                  </>
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

              {isFrenteComercial ? (
                <div className="orcamentos-depth-block">
                  <div className="orcamentos-depth-heading">
                    <button
                      type="button"
                      className="orcamentos-depth-toggle"
                      aria-expanded={openLevelIds.includes("principal")}
                      onClick={() => toggleLevel(frente.localId, "principal")}
                    >
                      <div>
                        <span>Comercial</span>
                        <strong>Itens comerciais da frente</strong>
                        <small>
                          {itensComerciais.length > 0
                            ? `${itensComerciais.length} item(ns) comercial(is) informado(s).`
                            : "Informe itens, unidades, quantidades e precos de venda."}
                        </small>
                      </div>
                      <span className="orcamentos-depth-chevron" aria-hidden="true">
                        {openLevelIds.includes("principal") ? "-" : "+"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        openLevel(frente.localId, "principal");
                        props.onAddItem(frente.localId, "COMERCIAL");
                      }}
                    >
                      Adicionar item
                    </button>
                  </div>
                  {openLevelIds.includes("principal") ? (
                    <div className="orcamentos-depth-content">
                      <OperationalItemList
                        emptyLabel="Nenhum item comercial nesta frente."
                        itens={itensComerciais}
                        itemErrors={props.itemErrors}
                        servicoOptions={props.servicoOptions}
                        materialOptions={props.materialOptions}
                        equipamentoOptions={props.equipamentoOptions}
                        referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                        classeOperacionalOptions={props.classeOperacionalOptions}
                        colaboradorOptions={props.colaboradorOptions}
                        fornecedorOptions={props.fornecedorOptions}
                        onRemove={props.onRemoveItem}
                        onUpdate={props.onUpdateItem}
                        onSelectEquipment={props.onSelectEquipment}
                        onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                        onSelectFormaCusteio={props.onSelectFormaCusteio}
                        onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                        onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                        onSelectCommercialEquipment={props.onSelectCommercialEquipment}
                        onPersonalizeResourceField={props.onPersonalizeResourceField}
                      />
                      <textarea
                        className="field-control"
                        rows={2}
                        value={frente.observacao}
                        placeholder="Observacoes comerciais desta frente."
                        onChange={(event) => props.onUpdate(frente.localId, "observacao", event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelIds.includes("materiais")}
                    onClick={() => toggleLevel(frente.localId, "materiais")}
                  >
                    <div>
                    <span>Comercial</span>
                    <strong>Materiais da frente</strong>
                    <small>
                      {materiaisComerciais.length > 0
                        ? `${materiaisComerciais.length} material(is) comercializado(s).`
                        : "Materiais vendidos na proposta sem precisar virar servico."}
                    </small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelIds.includes("materiais") ? "-" : "+"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openLevel(frente.localId, "materiais");
                      props.onAddItem(frente.localId, "MATERIAL");
                    }}
                  >
                    Adicionar material
                  </button>
                </div>
                {openLevelIds.includes("materiais") ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum material comercializado nesta frente."
                      itens={materiaisComerciais}
                      itemErrors={props.itemErrors}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                      onSelectEquipment={props.onSelectEquipment}
                      onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                      onSelectFormaCusteio={props.onSelectFormaCusteio}
                      onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                      onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                      onSelectCommercialEquipment={props.onSelectCommercialEquipment}
                      onPersonalizeResourceField={props.onPersonalizeResourceField}
                    />
                  </div>
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelIds.includes("principal")}
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
                      {openLevelIds.includes("principal") ? "-" : "+"}
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
                {openLevelIds.includes("principal") ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum servico principal informado nesta frente."
                      itens={servicosPrincipais}
                      itemErrors={props.itemErrors}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                      onSelectEquipment={props.onSelectEquipment}
                      onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                      onSelectFormaCusteio={props.onSelectFormaCusteio}
                      onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                      onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                      onSelectCommercialEquipment={props.onSelectCommercialEquipment}
                      onPersonalizeResourceField={props.onPersonalizeResourceField}
                    />
                  </div>
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelIds.includes("metodo")}
                    onClick={() => toggleLevel(frente.localId, "metodo")}
                  >
                    <div>
                    <span>Nivel 2</span>
                    <strong>Metodo executivo</strong>
                    <small>{frente.metodoExecutivo.trim() ? "Metodo executivo preenchido." : "Opcional. Registra como a frente sera executada."}</small>
                    </div>
                    <span className="orcamentos-depth-chevron" aria-hidden="true">
                      {openLevelIds.includes("metodo") ? "-" : "+"}
                    </span>
                  </button>
                </div>
                {openLevelIds.includes("metodo") ? (
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
                    aria-expanded={openLevelIds.includes("auxiliares")}
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
                      {openLevelIds.includes("auxiliares") ? "-" : "+"}
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
                {openLevelIds.includes("auxiliares") ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum servico auxiliar informado."
                      itens={servicosAuxiliares}
                      itemErrors={props.itemErrors}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                      onSelectEquipment={props.onSelectEquipment}
                      onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                      onSelectFormaCusteio={props.onSelectFormaCusteio}
                      onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                      onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                      onSelectCommercialEquipment={props.onSelectCommercialEquipment}
                      onPersonalizeResourceField={props.onPersonalizeResourceField}
                    />
                  </div>
                ) : null}
              </div>

              <div className="orcamentos-depth-block">
                <div className="orcamentos-depth-heading">
                  <button
                    type="button"
                    className="orcamentos-depth-toggle"
                    aria-expanded={openLevelIds.includes("recursos")}
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
                      {openLevelIds.includes("recursos") ? "-" : "+"}
                    </span>
                  </button>
                  <button type="button" onClick={() => {
                    openLevel(frente.localId, "recursos");
                    props.onAddItem(frente.localId, "RECURSO");
                  }}>
                    Adicionar recurso
                  </button>
                </div>
                {openLevelIds.includes("recursos") ? (
                  <div className="orcamentos-depth-content">
                    <OperationalItemList
                      emptyLabel="Nenhum equipamento, equipe, material ou terceiro planejado."
                      itens={recursosPlanejamento}
                      itemErrors={props.itemErrors}
                      memoriasRecursos={custoFrente?.recursos ?? []}
                      quantidadeFrente={frente.quantidadePrevista}
                      unidadeFrente={frente.unidadeProducao}
                      servicoOptions={props.servicoOptions}
                      materialOptions={props.materialOptions}
                      equipamentoOptions={props.equipamentoOptions}
                      referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                      classeOperacionalOptions={props.classeOperacionalOptions}
                      colaboradorOptions={props.colaboradorOptions}
                      fornecedorOptions={props.fornecedorOptions}
                      onRemove={props.onRemoveItem}
                      onUpdate={props.onUpdateItem}
                      onSelectEquipment={props.onSelectEquipment}
                      onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                      onSelectFormaCusteio={props.onSelectFormaCusteio}
                      onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                      onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                      onSelectCommercialEquipment={props.onSelectCommercialEquipment}
                      onPersonalizeResourceField={props.onPersonalizeResourceField}
                    />
                    <div className="orcamentos-front-cost-panel">
                  <label className="manager-field">
                    <span className="manager-field-label">Custo direto manual da frente</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={frente.custoManual}
                      onChange={(event) =>
                        props.onUpdate(frente.localId, "custoManual", event.target.value)
                      }
                    />
                    <small className="manager-field-hint">
                      Utilizado somente quando nenhum recurso valido gerar custo para a frente.
                    </small>
                  </label>
                  <div className="orcamentos-front-cost-origin">
                    <span>
                      {custoCalculadoPorRecursos
                        ? "Origem do custo: Recursos"
                        : "Origem do custo: Manual"}
                    </span>
                    <strong>{formatCurrency(custoFrente?.custoDireto ?? 0)}</strong>
                    {quantidadePrevistaNumero > 0 ? (
                      <div className="orcamentos-front-unit-cost">
                        <span>Custo operacional unitario</span>
                        <strong>
                          {formatCurrency(custoOperacionalUnitario)}/{unidadeCustoOperacional}
                        </strong>
                      </div>
                    ) : null}
                    <small>
                      {custoCalculadoPorRecursos
                        ? `Soma atual dos recursos: ${formatCurrency(custoFrente?.custoCalculadoRecursos ?? 0)}. O custo manual nao e somado.`
                        : "Nenhum recurso valido gerou custo. O valor manual e o custo oficial desta frente."}
                    </small>
                  </div>
                  <div className="orcamentos-front-sale-status">
                    <span>
                      {vendaFrente?.statusComercial === "VENDA_DEFINIDA"
                        ? "Venda definida"
                        : "Pendente de precificacao"}
                    </span>
                    <strong>{formatCurrency(vendaFrente?.valorVenda ?? 0)}</strong>
                    <small>
                      Soma de quantidade x preco de venda dos Servicos Principais desta frente.
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
                </>
              )}
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
  onCreateRevision: (propostaLocalId: string) => void;
  onRemoveProposta: (localId: string) => void;
  onUpdateProposta: (localId: string, key: keyof PropostaComercialForm, value: string) => void;
  onPreviewProposta: (propostaLocalId: string) => void;
  onEmitProposta: (propostaLocalId: string) => void;
  onOpenOfficialPdf: (propostaLocalId: string) => void;
  onAddOpcional: (propostaLocalId: string) => void;
  onUpdateOpcional: (
    propostaLocalId: string,
    opcionalLocalId: string,
    key: keyof PropostaOpcionalForm,
    value: string | number
  ) => void;
  onRemoveOpcional: (propostaLocalId: string, opcionalLocalId: string) => void;
  saving: boolean;
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
                <label className="manager-field orcamentos-span-2">
                  <span className="manager-field-label">Apresentacao de valores no PDF</span>
                  <select
                    className="field-control"
                    value={proposta.modoExibicaoValoresPdf}
                    disabled={isEmitida}
                    onChange={(event) =>
                      props.onUpdateProposta(
                        proposta.localId,
                        "modoExibicaoValoresPdf",
                        event.target.value
                      )
                    }
                  >
                    <option value="SOMENTE_TOTAL_GLOBAL">Somente total global</option>
                    <option value="SUBTOTAL_POR_FRENTE">Subtotal por frente</option>
                    <option value="DETALHADO_POR_ITEM_E_FRENTE">Detalhado por item e frente</option>
                  </select>
                  <small className="manager-field-hint">
                    Controla apenas a apresentacao comercial do PDF desta revisao.
                  </small>
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
                <div className="orcamentos-proposta-actions">
                  {proposta.status === "RASCUNHO" ? (
                    <>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={props.saving}
                        onClick={() => props.onPreviewProposta(proposta.localId)}
                      >
                        Visualizar previa
                      </button>
                      <button
                        type="button"
                        className="button-primary"
                        disabled={props.saving}
                        onClick={() => props.onEmitProposta(proposta.localId)}
                      >
                        {props.saving ? "Emitindo..." : "Emitir proposta"}
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        disabled={props.saving}
                        onClick={() => props.onRemoveProposta(proposta.localId)}
                      >
                        Remover proposta
                      </button>
                    </>
                  ) : null}
                  {proposta.status === "EMITIDA" ? (
                    <>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => props.onOpenOfficialPdf(proposta.localId)}
                      >
                        Visualizar PDF oficial
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => props.onCreateRevision(proposta.localId)}
                      >
                        Criar nova revisao
                      </button>
                    </>
                  ) : null}
                  {proposta.status === "REJEITADA" || proposta.status === "CANCELADA" ? (
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => props.onOpenOfficialPdf(proposta.localId)}
                    >
                      Visualizar PDF oficial
                    </button>
                  ) : null}
                </div>
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
  itemErrors: Record<string, string>;
  memoriasRecursos?: CostEngineMemoriaRecurso[];
  quantidadeFrente?: string;
  unidadeFrente?: string;
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: EquipamentoResourceOption[];
  referenciaTecnicaOptions: ReferenciaTecnicaResourceOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
  onSelectEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
  onSelectReferenciaTecnica: (localId: string, referencia: ReferenciaTecnicaResourceOption) => void;
  onSelectFormaCusteio: (localId: string, formaId: string) => void;
  onUpdateValorAplicadoCusteio: (localId: string, value: string) => void;
  onQuickCreateReferenciaTecnica: (localId: string) => void;
  onSelectCommercialEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
  onPersonalizeResourceField: (localId: string, campo: CampoTecnicoRecurso) => void;
}) {
  if (props.itens.length === 0) {
    return <p className="orcamentos-operational-empty">{props.emptyLabel}</p>;
  }

  return (
    <div className="orcamentos-items-list">
      {props.itens.map((item) => {
        const memoriaRecurso = props.memoriasRecursos?.find((memoria) => memoria.recursoRef === item.localId);
        const itemError = props.itemErrors[item.localId];
        return (
        <article
          key={item.localId}
          className={`orcamentos-item-card orcamentos-operational-item${itemError ? " is-invalid" : ""}`}
        >
          <div className="orcamentos-item-head">
            <strong>Item {item.ordem}</strong>
            <span>{formatCurrency(isRecursoItem(item) ? memoriaRecurso?.custoTotal ?? calcItemCost(item) : calcItemTotal(item))}</span>
            <button type="button" onClick={() => props.onRemove(item.localId)}>
              Remover
            </button>
          </div>
          {itemError ? <p className="orcamentos-item-validation">{itemError}</p> : null}
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
                itemError={itemError}
                materialOptions={props.materialOptions}
                equipamentoOptions={props.equipamentoOptions}
                referenciaTecnicaOptions={props.referenciaTecnicaOptions}
                classeOperacionalOptions={props.classeOperacionalOptions}
                colaboradorOptions={props.colaboradorOptions}
                fornecedorOptions={props.fornecedorOptions}
                memoria={memoriaRecurso}
                quantidadeFrente={props.quantidadeFrente}
                unidadeFrente={props.unidadeFrente}
                onUpdate={props.onUpdate}
                onSelectEquipment={props.onSelectEquipment}
                onSelectReferenciaTecnica={props.onSelectReferenciaTecnica}
                onSelectFormaCusteio={props.onSelectFormaCusteio}
                onUpdateValorAplicadoCusteio={props.onUpdateValorAplicadoCusteio}
                onQuickCreateReferenciaTecnica={props.onQuickCreateReferenciaTecnica}
                onPersonalizeResourceField={props.onPersonalizeResourceField}
              />
            ) : (
              <CommercialFrontItemFields
                item={item}
                itemError={itemError}
                servicoOptions={props.servicoOptions}
                materialOptions={props.materialOptions}
                equipamentoOptions={props.equipamentoOptions}
                fornecedorOptions={props.fornecedorOptions}
                onUpdate={props.onUpdate}
                onSelectEquipment={props.onSelectCommercialEquipment}
              />
            )}
          </div>
        </article>
        );
      })}
    </div>
  );
}

function CommercialFrontItemFields(props: {
  item: ItemForm;
  itemError?: string;
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: EquipamentoResourceOption[];
  fornecedorOptions: NamedSelectOption[];
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
  onSelectEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
}) {
  const selectedCommercialEquipment =
    props.item.origemItemComercial === "RESOURCE"
      ? props.equipamentoOptions.find((option) => option.value === props.item.equipamentoId)
      : null;

  function handleOrigemChange(origem: OrigemItemComercialOrcamento) {
    if (origem === "MANUAL") {
      props.onUpdate(props.item.localId, "origemItemComercial", "MANUAL");
      props.onUpdate(props.item.localId, "servicoId", "");
      props.onUpdate(props.item.localId, "equipamentoId", "");
      props.onUpdate(
        props.item.localId,
        "descricaoManualComercial",
        props.item.descricaoManualComercial || props.item.descricao
      );
      return;
    }

    if (origem === "SERVICE") {
      props.onUpdate(props.item.localId, "origemItemComercial", "SERVICE");
      props.onUpdate(props.item.localId, "equipamentoId", "");
      props.onUpdate(props.item.localId, "descricaoManualComercial", "");
      return;
    }

    props.onUpdate(props.item.localId, "origemItemComercial", "RESOURCE");
    props.onUpdate(props.item.localId, "servicoId", "");
    props.onUpdate(props.item.localId, "descricaoManualComercial", "");
  }

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

  function handleEquipmentChange(value: string) {
    const selected = props.equipamentoOptions.find((option) => option.value === value);

    if (!selected) {
      props.onUpdate(props.item.localId, "equipamentoId", "");
      return;
    }

    props.onSelectEquipment(props.item.localId, selected);
  }

  function handleMaterialChange(value: string) {
    props.onUpdate(props.item.localId, "materialId", value);
    const selected = props.materialOptions.find((option) => option.value === value);

    if (!selected) {
      return;
    }

    props.onUpdate(props.item.localId, "descricao", selected.descricao);

    if (selected.unidadePadrao) {
      props.onUpdate(props.item.localId, "unidade", selected.unidadePadrao);
    }
  }

  return (
    <>
      {isMaterialItem(props.item) ? (
        <label className="manager-field">
          <span className="manager-field-label">Material</span>
          <SearchableSelect
            value={props.item.materialId}
            options={props.materialOptions}
            placeholder="Buscar material"
            onChange={handleMaterialChange}
          />
          <small className="manager-field-hint">Material comercializado nesta frente.</small>
        </label>
      ) : (
        <>
          <label className="manager-field">
            <span className="manager-field-label">Origem do item</span>
            <select
              className="field-control"
              value={props.item.origemItemComercial}
              onChange={(event) =>
                handleOrigemChange(event.target.value as OrigemItemComercialOrcamento)
              }
            >
              <option value="SERVICE">Servico</option>
              <option value="RESOURCE">Equipamento</option>
              <option value="MANUAL">Manual</option>
            </select>
            <small className="manager-field-hint">
              Define se o item sera vinculado a um cadastro existente ou informado livremente.
            </small>
          </label>

          {props.item.origemItemComercial === "SERVICE" ? (
            <label className="manager-field">
              <span className="manager-field-label">Item comercial</span>
              <SearchableSelect
                value={props.item.servicoId}
                options={props.servicoOptions}
                placeholder="Buscar servico"
                emptyLabel="Nenhum servico encontrado."
                onChange={handleServicoChange}
              />
              <small className="manager-field-hint">Servico cadastrado para compor esta frente.</small>
            </label>
          ) : null}

          {props.item.origemItemComercial === "RESOURCE" ? (
            <label className="manager-field">
              <span className="manager-field-label">Item comercial</span>
              <SearchableSelect
                value={props.item.equipamentoId}
                options={props.equipamentoOptions}
                placeholder="Buscar equipamento ou veiculo"
                emptyLabel="Nenhum equipamento ou veiculo encontrado."
                onChange={handleEquipmentChange}
              />
              <small className="manager-field-hint">
                {selectedCommercialEquipment
                  ? `Origem: ${getEquipamentoOrigemComercialLabel(selectedCommercialEquipment)}.`
                  : "Equipamento ou veiculo do Cadastro Mestre."}
              </small>
            </label>
          ) : null}
        </>
      )}
      {props.item.origemItemComercial === "MANUAL" && !isMaterialItem(props.item) ? (
        <>
          <label className="manager-field orcamentos-span-2">
            <span className="manager-field-label">Nome do item comercial *</span>
            <input
              className="field-control"
              value={props.item.descricaoManualComercial}
              placeholder="Ex: Terra para aterro a granel"
              onChange={(event) =>
                props.onUpdate(props.item.localId, "descricaoManualComercial", event.target.value)
              }
            />
            <small className="manager-field-hint">Nome que sera apresentado na proposta.</small>
          </label>
          <label className="manager-field">
            <span className="manager-field-label">Codigo de referencia</span>
            <input
              className="field-control"
              value={props.item.codigo}
              placeholder="Ex: 10000161"
              onChange={(event) => props.onUpdate(props.item.localId, "codigo", event.target.value)}
            />
            <small className="manager-field-hint">
              Codigo do cliente, contrato, planilha ou referencia externa.
            </small>
          </label>
        </>
      ) : null}
      <label className="manager-field">
        <span className="manager-field-label">Precificacao</span>
        <select
          className="field-control"
          value={props.item.modoPrecificacao}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "modoPrecificacao", event.target.value as ModoPrecificacaoItemOrcamento)
          }
        >
          {modoPrecificacaoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="manager-field-hint">Define se o preco vem direto ou de uma composicao.</small>
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Forma de apresentacao comercial</span>
        <select
          className="field-control"
          value={props.item.formaApresentacaoComercial}
          onChange={(event) =>
            props.onUpdate(
              props.item.localId,
              "formaApresentacaoComercial",
              event.target.value as FormaApresentacaoComercialItem
            )
          }
        >
          {formaApresentacaoComercialOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="manager-field-hint">
          {
            formaApresentacaoComercialOptions.find(
              (option) => option.value === props.item.formaApresentacaoComercial
            )?.helper
          }
        </small>
      </label>
      <label className="manager-field orcamentos-span-2">
        <span className="manager-field-label">
          {props.item.origemItemComercial === "MANUAL" ? "Descricao comercial" : "Descricao"}
        </span>
        <textarea
          className={`field-control${props.itemError ? " field-control-error" : ""}`}
          rows={props.item.origemItemComercial === "MANUAL" ? 2 : undefined}
          value={props.item.descricao}
          placeholder={
            props.item.origemItemComercial === "MANUAL"
              ? "Detalhamento complementar do item para apresentacao na proposta."
              : undefined
          }
          onChange={(event) =>
            props.onUpdate(props.item.localId, "descricao", event.target.value)
          }
        />
        {props.item.origemItemComercial === "MANUAL" ? (
          <small className="manager-field-hint">Detalhamento complementar opcional.</small>
        ) : null}
        {props.itemError ? <small className="manager-field-error">{props.itemError}</small> : null}
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Unidade</span>
        <input
          className="field-control"
          value={props.item.unidade}
          onChange={(event) => props.onUpdate(props.item.localId, "unidade", event.target.value)}
        />
      </label>
      {props.item.formaApresentacaoComercial === "PRECO_UNITARIO_REFERENCIAL" ? (
        <div className="orcamentos-composition-note">
          <strong>Preco unitario referencial</strong>
          <span>Sem quantidade contratada. Este item nao compoe subtotal nem valor global.</span>
        </div>
      ) : (
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
      )}
      <label className="manager-field">
        <span className="manager-field-label">Preco de compra</span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.precoCompra}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "precoCompra", event.target.value)
          }
        />
        <small className="manager-field-hint">Opcional. Usado para sugerir venda por markup.</small>
      </label>
      <label className="manager-field">
        <span className="manager-field-label">Markup %</span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.markupPercentual}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "markupPercentual", event.target.value)
          }
        />
        <small className="manager-field-hint">Percentual aplicado sobre o preco de compra.</small>
      </label>
      <label className="manager-field">
        <span className="manager-field-label">
          {props.item.tipoItem === "SERVICO_PRINCIPAL"
            ? "Preco de venda unitario"
            : "Valor unitario"}
        </span>
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
        <small className="manager-field-hint">Preco de venda deste item.</small>
      </label>
      {isMaterialItem(props.item) ? (
        <label className="manager-field">
          <span className="manager-field-label">Fornecedor preferencial</span>
          <SearchableSelect
            value={props.item.fornecedorPreferencialId}
            options={props.fornecedorOptions}
            placeholder="Opcional"
            onChange={(value) => props.onUpdate(props.item.localId, "fornecedorPreferencialId", value)}
          />
          <small className="manager-field-hint">Fornecedor usado como referencia comercial.</small>
        </label>
      ) : null}
      {props.item.modoPrecificacao === "COMPOSICAO" ? (
        <div className="orcamentos-composition-note orcamentos-span-2">
          <strong>Composicao preparada</strong>
          <span>
            {isServicoComercialItem(props.item)
              ? "O custo-base aplicado sera utilizado no motor de margem, impostos e acrescimos."
              : "O markup pertence a este item e nao entra no motor de margem, impostos e acrescimos."}
          </span>
        </div>
      ) : null}
      {isServicoComercialItem(props.item) && props.item.modoPrecificacao === "COMPOSICAO" ? (
        <>
          <label className="manager-field">
            <span className="manager-field-label">Custo-base personalizado</span>
            <input
              className="field-control"
              type="number"
              min="0"
              step="0.01"
              value={props.item.custoBaseSobrescrito}
              onChange={(event) =>
                props.onUpdate(props.item.localId, "custoBaseSobrescrito", event.target.value)
              }
            />
            <small className="manager-field-hint">Opcional. Quando preenchido, substitui o custo calculado antes do motor.</small>
          </label>
          <label className="manager-field">
            <span className="manager-field-label">Motivo da personalizacao</span>
            <input
              className="field-control"
              value={props.item.motivoSobrescrita}
              onChange={(event) =>
                props.onUpdate(props.item.localId, "motivoSobrescrita", event.target.value)
              }
            />
          </label>
        </>
      ) : null}
      {props.item.modoPrecificacao === "PRECO_DIRETO" ? (
        <div className="orcamentos-composition-note orcamentos-span-2">
          <strong>Preco direto</strong>
          <span>Preco direto e valor final de venda e nao recebe encargos do motor.</span>
        </div>
      ) : null}
      <label className="manager-field orcamentos-span-2">
        <span className="manager-field-label">Condicoes especificas do item</span>
        <textarea
          className="field-control"
          rows={2}
          value={props.item.observacaoComercial}
          onChange={(event) =>
            props.onUpdate(props.item.localId, "observacaoComercial", event.target.value)
          }
        />
      </label>
    </>
  );
}

function ResourceItemFields(props: {
  item: ItemForm;
  itemError?: string;
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: EquipamentoResourceOption[];
  referenciaTecnicaOptions: ReferenciaTecnicaResourceOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  memoria?: CostEngineMemoriaRecurso;
  quantidadeFrente?: string;
  unidadeFrente?: string;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
  onSelectEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
  onSelectReferenciaTecnica: (localId: string, referencia: ReferenciaTecnicaResourceOption) => void;
  onSelectFormaCusteio: (localId: string, formaId: string) => void;
  onUpdateValorAplicadoCusteio: (localId: string, value: string) => void;
  onQuickCreateReferenciaTecnica: (localId: string) => void;
  onPersonalizeResourceField: (localId: string, campo: CampoTecnicoRecurso) => void;
}) {
  const recursoOptions = getRecursoOptions(props.item.categoriaRecurso, props);
  const recursoValue = getRecursoValue(props.item);
  const referenciaSelecionada = props.referenciaTecnicaOptions.find(
    (option) => option.value === props.item.referenciaTecnicaRecursoId
  );
  const formasReferencia = referenciaSelecionada?.formasCusteio ?? [];
  const valorAplicadoPersonalizado =
    props.item.valorReferenciaCusteio.trim() &&
    props.item.valorAplicadoCusteio.trim() &&
    Number(props.item.valorReferenciaCusteio) !== Number(props.item.valorAplicadoCusteio);
  const herdaQuantidadeDaFrente =
    props.item.origemQuantidadeOperacional !== "PERSONALIZADA";
  const quantidadeOperacionalHerdada =
    props.memoria?.quantidadeOperacionalExibida !== undefined
      ? String(props.memoria.quantidadeOperacionalExibida)
      : props.quantidadeFrente ??
        (props.memoria ? String(props.memoria.quantidadeOperacional) : "");
  const quantidadeOperacionalExibida = herdaQuantidadeDaFrente
    ? quantidadeOperacionalHerdada
    : props.item.quantidadeOperacional;
  const unidadeQuantidadeOperacional = herdaQuantidadeDaFrente
    ? props.memoria?.unidadeQuantidadeOperacionalExibida ||
      props.memoria?.unidadeQuantidadeOperacional ||
      props.unidadeFrente ||
      "unidade"
    : props.item.unidadeQuantidadeOperacional ||
      props.unidadeFrente ||
      props.memoria?.unidadeQuantidadeOperacional ||
      "unidade";
  const origemQuantidadeOperacional =
    props.memoria?.origemQuantidadeOperacionalExibida || "Quantidade da Frente";
  const permitePersonalizacaoMestre =
    props.item.caracteristicasRecursoSnapshot?.herdados.permitirEdicaoOrcamento !== false;

  function personalizarQuantidadeOperacional() {
    props.onUpdate(
      props.item.localId,
      "quantidadeOperacional",
      quantidadeOperacionalExibida || "0"
    );
    props.onUpdate(props.item.localId, "unidadeQuantidadeOperacional", unidadeQuantidadeOperacional || "unidade");
    props.onUpdate(props.item.localId, "origemQuantidadeOperacional", "PERSONALIZADA");
  }

  function herdarQuantidadeOperacional() {
    props.onUpdate(props.item.localId, "quantidadeOperacional", quantidadeOperacionalHerdada || "0");
    props.onUpdate(props.item.localId, "unidadeQuantidadeOperacional", "");
    props.onUpdate(props.item.localId, "origemQuantidadeOperacional", "FRENTE");
  }

  function isInherited(campo: CampoTecnicoRecurso) {
    return campoTecnicoHerdado(
      props.item.caracteristicasRecursoSnapshot,
      props.item.camposTecnicosPersonalizados,
      campo
    );
  }

  function isPersonalized(campo: CampoTecnicoRecurso) {
    return props.item.camposTecnicosPersonalizados.includes(campo);
  }

  function updateTechnicalField(
    campo: CampoTecnicoRecurso,
    value: string
  ) {
    if (!permitePersonalizacaoMestre && isInherited(campo)) {
      return;
    }

    if (props.item.caracteristicasRecursoSnapshot && !isPersonalized(campo)) {
      props.onPersonalizeResourceField(props.item.localId, campo);
    }
    props.onUpdate(props.item.localId, campo, value);
  }

  function handleResourceChange(value: string) {
    const selected = recursoOptions.find((option) => option.value === value);
    const label = selected?.nome ?? selected?.label ?? "";

    if (props.item.categoriaRecurso === "EQUIPAMENTO") {
      const referencia = props.referenciaTecnicaOptions.find((option) => option.value === value);

      if (referencia) {
        props.onSelectReferenciaTecnica(props.item.localId, referencia);
        return;
      }

      const equipamentosDaClasse = props.equipamentoOptions.filter(
        (option) => option.classeOperacional === value
      );
      const equipamento =
        equipamentosDaClasse.find((option) => option.unidadeEconomicaPadrao) ??
        equipamentosDaClasse.find((option) => option.capacidadeM3 !== null) ??
        equipamentosDaClasse[0];
      const classeLegada = props.classeOperacionalOptions.find((option) => option.value === value);

      props.onSelectEquipment(
        props.item.localId,
        equipamento ?? {
          value,
          label: classeLegada?.label ?? value,
          nome: classeLegada?.label ?? value,
          classeOperacional: value,
          capacidadeM3: null,
          unidadeCapacidade: null,
          unidadeEconomicaPadrao: null,
          custoPadrao: null,
          permitirEdicaoOrcamento: true,
          naturezaRecurso: null,
          tipoRecurso: null,
          descricaoOperacional: null,
          caracteristicasTecnicas: null,
          legado: true
        }
      );
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
        {props.item.categoriaRecurso === "EQUIPAMENTO" ? (
          <button
            type="button"
            className="button-secondary"
            style={{ marginTop: 8 }}
            onClick={() => props.onQuickCreateReferenciaTecnica(props.item.localId)}
          >
            Criar nova referencia tecnica
          </button>
        ) : null}
      </label>
      {props.item.categoriaRecurso === "EQUIPAMENTO" && props.item.referenciaTecnicaRecursoId ? (
        <>
          <label className="manager-field">
            <span className="manager-field-label">Forma de custeio</span>
            <select
              className="field-control"
              value={props.item.formaCusteioRecursoId}
              onChange={(event) => props.onSelectFormaCusteio(props.item.localId, event.target.value)}
            >
              <option value="">Preenchimento manual</option>
              {formasReferencia.map((forma) => (
                <option key={forma.id} value={forma.id}>
                  {forma.nome} - {forma.unidadeCusteio.rotulo} - R$ {Number(forma.valorReferencia ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  {forma.preferencial ? " (preferencial)" : ""}
                </option>
              ))}
            </select>
            <small className="manager-field-hint">
              A forma sugere unidade de custeio e valor, sem alterar a Biblioteca.
            </small>
          </label>
          <label className="manager-field">
            <span className="manager-field-label">Valor de referencia</span>
            <input className="field-control" value={props.item.valorReferenciaCusteio || "-"} readOnly />
            <small className="manager-field-hint">Valor capturado da Biblioteca no momento da selecao.</small>
          </label>
          <label className="manager-field">
            <span className="manager-field-label">Valor aplicado</span>
            <input
              className="field-control"
              type="number"
              min="0"
              step="0.0001"
              value={props.item.valorAplicadoCusteio}
              onChange={(event) => props.onUpdateValorAplicadoCusteio(props.item.localId, event.target.value)}
              placeholder="0,0000"
            />
            <small className="manager-field-hint">
              {valorAplicadoPersonalizado ? "Valor personalizado neste orcamento." : "Inicialmente igual ao valor de referencia."}
            </small>
          </label>
        </>
      ) : null}
      <label className="manager-field">
        <span className="manager-field-label">Quantidade de recursos</span>
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
      <div className="manager-field orcamentos-span-3 orcamentos-operational-quantity">
        <div className="orcamentos-operational-quantity-header">
          <span className="manager-field-label">Quantidade operacional</span>
          {herdaQuantidadeDaFrente ? (
            <button type="button" onClick={personalizarQuantidadeOperacional}>
              <Pencil size={13} />
              Personalizar
            </button>
          ) : null}
        </div>
        <div className="orcamentos-operational-quantity-control">
          <input
            className="field-control"
            type="number"
            min="0"
            step="0.01"
            value={quantidadeOperacionalExibida}
            disabled={herdaQuantidadeDaFrente}
            onChange={(event) =>
              props.onUpdate(props.item.localId, "quantidadeOperacional", event.target.value)
            }
          />
          {herdaQuantidadeDaFrente ? (
            <span>{unidadeQuantidadeOperacional}</span>
          ) : (
            <select
              className="field-control"
              value={props.item.unidadeQuantidadeOperacional || unidadeQuantidadeOperacional || "unidade"}
              onChange={(event) =>
                props.onUpdate(props.item.localId, "unidadeQuantidadeOperacional", event.target.value)
              }
            >
              {unidadeQuantidadeOperacionalOptions.map((unidade) => (
                <option key={unidade} value={unidade}>
                  {unidade}
                </option>
              ))}
            </select>
          )}
        </div>
        <label className="orcamentos-operational-quantity-toggle">
          <input
            type="checkbox"
            checked={herdaQuantidadeDaFrente}
            onChange={(event) =>
              event.target.checked
                ? herdarQuantidadeOperacional()
                : personalizarQuantidadeOperacional()
            }
          />
          Herdar variavel operacional automaticamente
        </label>
        <small className={herdaQuantidadeDaFrente ? "is-inherited" : "is-personalized"}>
          {herdaQuantidadeDaFrente ? <LockKeyhole size={13} /> : <Pencil size={13} />}
          {herdaQuantidadeDaFrente
            ? `Herdado automaticamente: ${origemQuantidadeOperacional}`
            : "Quantidade e unidade operacional personalizadas nesta Frente"}
        </small>
      </div>
      <label className="manager-field">
        <span className="manager-field-label">Tipo de calculo</span>
        <select
          className="field-control"
          value={props.item.tipoCalculoRecurso}
          onChange={(event) => props.onUpdate(props.item.localId, "tipoCalculoRecurso", event.target.value)}
        >
          {tipoCalculoRecursoOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <div className="manager-field">
        <ResourceTechnicalFieldHeader
          label="Base de calculo do custo"
          inherited={isInherited("unidadeEconomicaCusto")}
          personalized={isPersonalized("unidadeEconomicaCusto")}
          allowEdit={permitePersonalizacaoMestre}
          onEdit={() => props.onPersonalizeResourceField(props.item.localId, "unidadeEconomicaCusto")}
        />
        <select
          className="field-control"
          value={props.item.unidadeEconomicaCusto}
          disabled={isInherited("unidadeEconomicaCusto")}
          onChange={(event) => updateTechnicalField("unidadeEconomicaCusto", event.target.value)}
          required
        >
          <option value="">Selecione a base de calculo</option>
          {unidadeEconomicaOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <small className="manager-field-hint">
          Unidade economica: {props.memoria?.unidadeCustoFormatada || "selecione uma base"}.
        </small>
      </div>
      <div className="manager-field">
        <ResourceTechnicalFieldHeader
          label={props.item.unidadeEconomicaCusto === "KM" ? "Custo por km" : "Valor do custo"}
          inherited={isInherited("valorCusto")}
          personalized={isPersonalized("valorCusto")}
          allowEdit={permitePersonalizacaoMestre}
          onEdit={() => props.onPersonalizeResourceField(props.item.localId, "valorCusto")}
        />
        <span className="sr-only">
          {props.item.unidadeEconomicaCusto === "KM" ? "Custo por km" : "Valor do custo"}
        </span>
        <input
          className="field-control"
          type="number"
          min="0"
          step="0.01"
          value={props.item.valorCusto}
          disabled={isInherited("valorCusto")}
          onChange={(event) => {
            updateTechnicalField("valorCusto", event.target.value);
            props.onUpdate(props.item.localId, "custoUnitario", event.target.value);
          }}
        />
      </div>
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "HORA" ? (
        <label className="manager-field">
          <span className="manager-field-label">Horas totais</span>
          <input className="field-control" type="number" min="0" step="0.01" value={props.item.horasTotais} onChange={(event) => props.onUpdate(props.item.localId, "horasTotais", event.target.value)} />
        </label>
      ) : null}
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "VIAGEM" ? (
        <label className="manager-field">
          <span className="manager-field-label">Total de viagens</span>
          <input className="field-control" type="number" min="0" step="0.01" value={props.item.viagensTotais} onChange={(event) => props.onUpdate(props.item.localId, "viagensTotais", event.target.value)} />
        </label>
      ) : null}
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "KM" ? (
        <>
          <div className="manager-field">
            <ResourceTechnicalFieldHeader
              label="Capacidade por viagem"
              inherited={isInherited("capacidadePorViagem")}
              personalized={isPersonalized("capacidadePorViagem")}
              allowEdit={permitePersonalizacaoMestre}
              onEdit={() => props.onPersonalizeResourceField(props.item.localId, "capacidadePorViagem")}
            />
            <input
              className="field-control"
              type="number"
              min="0"
              step="0.01"
              value={props.item.capacidadePorViagem}
              placeholder="Ex.: 14"
              disabled={isInherited("capacidadePorViagem")}
              onChange={(event) => updateTechnicalField("capacidadePorViagem", event.target.value)}
            />
          </div>
          <div className="manager-field">
            <ResourceTechnicalFieldHeader
              label="Unidade da capacidade"
              inherited={isInherited("unidadeCapacidade")}
              personalized={isPersonalized("unidadeCapacidade")}
              allowEdit={permitePersonalizacaoMestre}
              onEdit={() => props.onPersonalizeResourceField(props.item.localId, "unidadeCapacidade")}
            />
            <input
              className="field-control"
              value={props.item.unidadeCapacidade}
              placeholder="Ex.: m3"
              disabled={isInherited("unidadeCapacidade")}
              onChange={(event) => updateTechnicalField("unidadeCapacidade", event.target.value)}
            />
          </div>
          <label className="manager-field">
            <span className="manager-field-label">Distancia por viagem (ida e volta)</span>
            <input
              className="field-control"
              type="number"
              min="0"
              step="0.01"
              value={props.item.distanciaViagemKm}
              placeholder="Ex.: 12"
              onChange={(event) => props.onUpdate(props.item.localId, "distanciaViagemKm", event.target.value)}
            />
          </label>
        </>
      ) : null}
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "CARGA" ? (
        <label className="manager-field">
          <span className="manager-field-label">Total de cargas</span>
          <input className="field-control" type="number" min="0" step="0.01" value={props.item.cargasTotais} onChange={(event) => props.onUpdate(props.item.localId, "cargasTotais", event.target.value)} />
        </label>
      ) : null}
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "MES" ? (
        <label className="manager-field">
          <span className="manager-field-label">Prazo em meses</span>
          <input className="field-control" type="number" min="0" step="0.01" value={props.item.mesesTotais} onChange={(event) => props.onUpdate(props.item.localId, "mesesTotais", event.target.value)} />
          <small className="manager-field-hint">Se vazio, o motor usa a duracao mensal da frente quando disponivel.</small>
        </label>
      ) : null}
      {props.item.tipoCalculoRecurso === "AUTOMATICO" && props.item.unidadeEconomicaCusto === "DIA" ? (
        <label className="manager-field">
          <span className="manager-field-label">Dias trabalhados por mes</span>
          <input className="field-control" type="number" min="1" max="31" step="1" value={props.item.diasTrabalhadosMes} onChange={(event) => props.onUpdate(props.item.localId, "diasTrabalhadosMes", event.target.value)} />
          <small className="manager-field-hint">Usado apenas quando a frente estiver medida em meses.</small>
        </label>
      ) : null}
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
      {props.item.tipoCalculoRecurso === "AUTOMATICO" &&
      props.item.unidadeEconomicaCusto === "KM" ? (
        <TransportDemandPanel
          memoria={props.memoria}
          unidade={props.memoria?.unidadeCapacidade || props.item.unidadeCapacidade}
        />
      ) : null}
      <div className="orcamentos-resource-memory orcamentos-span-3">
        <div>
          <span>{props.memoria?.statusCalculo === "PENDENTE" ? "Pendente de calculo" : "Custo total calculado"}</span>
          <strong>{formatCurrency(props.memoria?.custoTotal ?? 0)}</strong>
        </div>
        <code>{props.memoria?.formula || "Preencha os parametros para visualizar a memoria de calculo."}</code>
        {props.memoria?.observacoes.map((observacao) => <small key={observacao}>{observacao}</small>)}
      </div>
    </>
  );
}

function TransportDemandPanel(props: {
  memoria?: CostEngineMemoriaRecurso;
  unidade: string;
}) {
  const { memoria } = props;
  const unidade = normalizeUnidadeProducao(props.unidade || "unidade");
  const demandaCalculada = memoria?.demandaLogisticaCalculavel === true;
  const quantidadeInvalida = memoria !== undefined && memoria.quantidadeRecursos <= 0;
  const status = demandaCalculada
    ? "Calculada"
    : quantidadeInvalida || memoria?.statusCalculo === "PENDENTE"
      ? "Pendente"
      : "Aguardando prazo";
  const mensagem = quantidadeInvalida
    ? "Informe uma quantidade de caminhões maior que zero para distribuir a demanda da frota."
    : memoria && !demandaCalculada
      ? "Informe a produtividade ou o prazo da frente para calcular a demanda diária de transporte."
      : "Preencha os parâmetros do transporte para calcular a demanda logística.";

  return (
    <section className="orcamentos-transport-demand orcamentos-span-3">
      <header className="orcamentos-transport-demand-header">
        <div className="orcamentos-transport-demand-title">
          <span className="orcamentos-transport-demand-icon" aria-hidden="true">
            <Truck size={18} />
          </span>
          <div>
            <small>Planejamento de transporte</small>
            <strong>Demanda logística para cumprir o prazo</strong>
          </div>
        </div>
        <span className={`orcamentos-transport-demand-status ${demandaCalculada ? "is-ready" : ""}`}>
          {status}
        </span>
      </header>

      {demandaCalculada && memoria ? (
        <>
          <div className="orcamentos-transport-demand-grid">
            <div>
              <span>Prazo utilizado</span>
              <strong>{formatOperationalNumber(memoria.prazoUtilizadoDemanda)} dias</strong>
            </div>
            <div>
              <span>Produção exigida</span>
              <strong>
                {formatOperationalNumber(memoria.volumeDiarioExigidoFrota)} {unidade}/dia
              </strong>
            </div>
            <div>
              <span>Volume por caminhão</span>
              <strong>
                {formatOperationalNumber(memoria.volumeDiarioExigidoPorCaminhao)} {unidade}/dia
              </strong>
            </div>
            <div>
              <span>Frota informada</span>
              <strong>{formatOperationalNumber(memoria.quantidadeRecursos)} caminhões</strong>
            </div>
            <div>
              <span>Viagens totais</span>
              <strong>{formatOperationalNumber(memoria.viagensOperacionais)} viagens</strong>
            </div>
            <div>
              <span>Demanda da frota</span>
              <strong>{formatOperationalNumber(memoria.viagensPorDiaFrota)} viagens/dia</strong>
            </div>
            <div>
              <span>Demanda por caminhão</span>
              <strong>
                {formatOperationalNumber(memoria.viagensPorCaminhaoPorDia)} viagens/dia
              </strong>
            </div>
          </div>
          <p className="orcamentos-transport-demand-guidance">
            Para cumprir o prazo utilizado, cada caminhão deverá realizar em média{" "}
            <strong>{formatOperationalNumber(memoria.viagensPorCaminhaoPorDia)} viagens por dia.</strong>
          </p>
        </>
      ) : (
        <p className="orcamentos-transport-demand-empty">{mensagem}</p>
      )}
    </section>
  );
}

function ResourceTechnicalFieldHeader(props: {
  label: string;
  inherited: boolean;
  personalized: boolean;
  allowEdit?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="orcamentos-resource-field-header">
      <div>
        <span className="manager-field-label">{props.label}</span>
        {props.inherited ? (
          <small className="orcamentos-resource-origin is-inherited">
            <LockKeyhole size={12} aria-hidden="true" />
            Herdado do Cadastro Mestre
          </small>
        ) : props.personalized ? (
          <small className="orcamentos-resource-origin is-custom">
            Valor personalizado nesta Frente
          </small>
        ) : null}
      </div>
      {props.inherited && props.allowEdit !== false ? (
        <button type="button" className="orcamentos-resource-edit" onClick={props.onEdit}>
          <Pencil size={12} aria-hidden="true" />
          Editar
        </button>
      ) : props.inherited && props.allowEdit === false ? (
        <small className="orcamentos-resource-origin is-inherited">Edicao desabilitada no Cadastro Mestre</small>
      ) : null}
    </div>
  );
}

function getRecursoOptions(
  categoria: CategoriaRecursoOrcamento,
  options: {
    materialOptions: MaterialSelectOption[];
    equipamentoOptions: EquipamentoResourceOption[];
    referenciaTecnicaOptions: ReferenciaTecnicaResourceOption[];
    classeOperacionalOptions: BasicSelectOption[];
    colaboradorOptions: NamedSelectOption[];
    fornecedorOptions: NamedSelectOption[];
  }
) : RecursoSelectOption[] {
  if (categoria === "EQUIPAMENTO") {
    return [
      ...options.referenciaTecnicaOptions,
      ...options.classeOperacionalOptions.map((option) => ({
        ...option,
        label: `${option.label} (legado)`
      }))
    ];
  }
  if (categoria === "MATERIAL") return options.materialOptions;
  if (categoria === "EQUIPE") return options.colaboradorOptions;
  return options.fornecedorOptions;
}

function getRecursoValue(item: ItemForm) {
  if (item.categoriaRecurso === "EQUIPAMENTO") {
    return item.referenciaTecnicaRecursoId || item.classeOperacional;
  }
  if (item.categoriaRecurso === "MATERIAL") return item.materialId;
  return item.recursoReferenciaId;
}

function getRecursoPlaceholder(categoria: CategoriaRecursoOrcamento) {
  if (categoria === "EQUIPAMENTO") return "Buscar referencia tecnica";
  if (categoria === "MATERIAL") return "Buscar material";
  if (categoria === "EQUIPE") return "Buscar colaborador/equipe";
  return "Buscar fornecedor/terceiro";
}

function ItensSection(props: {
  itens: ItemForm[];
  servicoOptions: ServicoSelectOption[];
  materialOptions: MaterialSelectOption[];
  equipamentoOptions: EquipamentoResourceOption[];
  classeOperacionalOptions: BasicSelectOption[];
  colaboradorOptions: NamedSelectOption[];
  fornecedorOptions: NamedSelectOption[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
  onSelectCommercialEquipment: (localId: string, equipamento: EquipamentoResourceOption) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>02</span>
        <h3>Itens comerciais</h3>
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
              <label className="manager-field">
                <span className="manager-field-label">Tipo de item</span>
                <select
                  className="field-control"
                  value={item.tipoItem}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "tipoItem", event.target.value as TipoItemOrcamento)
                  }
                >
                  {[tipoItemOptions[0]].map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <CommercialFrontItemFields
                item={item}
                servicoOptions={props.servicoOptions}
                materialOptions={props.materialOptions}
                equipamentoOptions={props.equipamentoOptions}
                fornecedorOptions={props.fornecedorOptions}
                onUpdate={props.onUpdate}
                onSelectEquipment={props.onSelectCommercialEquipment}
              />
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

export function buildPayload(
  form: OrcamentoForm,
  previewCalculado?: ReturnType<typeof buildEconomicPreview>
) {
  const itensPreenchidos = normalizeItemsForPayload(form.itens, form.frentes).filter(isItemPreenchido);
  const itensValidos =
    form.frentes.length > 0
      ? itensPreenchidos.filter((item) => Boolean(item.frenteTempId))
      : itensPreenchidos;
  const economicPreview = previewCalculado ?? buildEconomicPreview(form);
  const formacaoPreco = buildFormacaoPayload(form, economicPreview);
  const tipoLegado: TipoOrcamento = form.frentes.some((frente) => frente.natureza === "OPERACIONAL")
    ? "OPERACIONAL"
    : "COMERCIAL";

  return {
    tipo: tipoLegado,
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
    cenarios: form.cenarios.map(mapCenarioPayload),
    propostasComerciais: form.propostasComerciais.map(mapPropostaComercialPayload),
    frentes: form.frentes.map(mapFrentePayload),
    itens: itensValidos.map(mapItemPayload),
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
    modoExibicaoValoresPdf: proposta.modoExibicaoValoresPdf,
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

function mapItemPayload(item: ItemForm) {
  const recurso = isRecursoItem(item);
  const servicoOperacional =
    item.tipoItem === "SERVICO_PRINCIPAL" || item.tipoItem === "SERVICO_AUXILIAR";
  const origemComercial = recurso ? null : item.origemItemComercial;
  const nomeManual = getManualCommercialName(item);
  const descricaoComercial =
    origemComercial === "MANUAL"
      ? item.descricao.trim() === nomeManual
        ? ""
        : item.descricao.trim()
      : item.descricao.trim();

  return {
    tempId: item.localId,
    frenteTempId: item.frenteTempId.trim(),
    tipoItem: item.tipoItem,
    origemItemComercial: origemComercial,
    descricaoManualComercial: origemComercial === "MANUAL" ? nomeManual : "",
    servicoId: recurso || origemComercial === "RESOURCE" || origemComercial === "MANUAL" ? null : item.servicoId || null,
    materialId:
      recurso && item.categoriaRecurso === "MATERIAL"
        ? item.materialId || null
        : servicoOperacional
          ? null
          : item.materialId || null,
    equipamentoId:
      recurso || servicoOperacional || item.tipoItem === "MATERIAL" || origemComercial !== "RESOURCE"
        ? null
        : item.equipamentoId || null,
    referenciaTecnicaRecursoId:
      recurso && item.categoriaRecurso === "EQUIPAMENTO"
        ? item.referenciaTecnicaRecursoId || null
        : null,
    formaCusteioRecursoId:
      recurso && item.categoriaRecurso === "EQUIPAMENTO"
        ? item.formaCusteioRecursoId || null
        : null,
    formaCusteioSnapshot:
      recurso && item.categoriaRecurso === "EQUIPAMENTO"
        ? item.formaCusteioSnapshot
        : null,
    valorReferenciaCusteio:
      recurso && item.valorReferenciaCusteio ? Number(item.valorReferenciaCusteio) : null,
    valorAplicadoCusteio:
      recurso && item.valorAplicadoCusteio ? Number(item.valorAplicadoCusteio) : null,
    categoriaRecurso: recurso ? item.categoriaRecurso : null,
    classeOperacional:
      recurso && item.categoriaRecurso === "EQUIPAMENTO" ? item.classeOperacional.trim() : "",
    recursoReferenciaId: recurso ? item.recursoReferenciaId.trim() : "",
    recursoNome: recurso ? item.recursoNome.trim() : "",
    modoPrecificacao: recurso ? "PRECO_DIRETO" : item.modoPrecificacao,
    formaApresentacaoComercial: recurso
      ? "QUANTIDADE_DEFINIDA"
      : item.formaApresentacaoComercial,
    precoCompra: !recurso && item.precoCompra ? Number(item.precoCompra) : null,
    markupPercentual: !recurso && item.markupPercentual ? Number(item.markupPercentual) : null,
    precoVendaSobrescrito: !recurso ? item.precoVendaSobrescrito : false,
    custoCalculadoOriginal: !recurso && item.custoCalculadoOriginal ? Number(item.custoCalculadoOriginal) : null,
    custoBaseSobrescrito: !recurso && item.custoBaseSobrescrito ? Number(item.custoBaseSobrescrito) : null,
    custoBaseAplicado: !recurso && item.custoBaseAplicado ? Number(item.custoBaseAplicado) : null,
    origemCustoAplicado: !recurso ? item.origemCustoAplicado : "CALCULADO_AUTOMATICAMENTE",
    precoCalculado: !recurso && item.precoCalculado ? Number(item.precoCalculado) : null,
    precoAplicado: !recurso && item.precoAplicado ? Number(item.precoAplicado) : null,
    origemValorAplicado: !recurso ? item.origemValorAplicado : "CALCULADO_AUTOMATICAMENTE",
    motivoSobrescrita: !recurso ? item.motivoSobrescrita : "",
    fornecedorPreferencialId: !recurso ? item.fornecedorPreferencialId || null : null,
    exibirNoPdf: !recurso ? item.exibirNoPdf : false,
    observacaoComercial: !recurso ? item.observacaoComercial : "",
    ordem: item.ordem,
    codigo: item.codigo.trim(),
    descricao: descricaoComercial,
    unidade: item.unidade.trim(),
    quantidade: Number(item.quantidade) || 0,
    quantidadeOperacional:
      recurso && item.quantidadeOperacional ? Number(item.quantidadeOperacional) : null,
    origemQuantidadeOperacional: recurso ? item.origemQuantidadeOperacional : "FRENTE",
    unidadeQuantidadeOperacional:
      recurso ? item.unidadeQuantidadeOperacional.trim() || null : null,
    produtividade: recurso ? null : item.produtividade ? Number(item.produtividade) : null,
    custoUnitario: recurso ? Number(item.custoUnitario) || 0 : Number(item.custoUnitario) || 0,
    tipoCalculoRecurso: item.tipoCalculoRecurso,
    unidadeEconomicaCusto: recurso && item.unidadeEconomicaCusto ? item.unidadeEconomicaCusto : null,
    valorCusto: recurso ? Number(item.valorCusto || item.custoUnitario) || 0 : null,
    horasDia: recurso && item.horasDia ? Number(item.horasDia) : null,
    horasTotais: recurso && item.horasTotais ? Number(item.horasTotais) : null,
    viagensDia: recurso && item.viagensDia ? Number(item.viagensDia) : null,
    viagensTotais: recurso && item.viagensTotais ? Number(item.viagensTotais) : null,
    distanciaViagemKm: recurso && item.distanciaViagemKm ? Number(item.distanciaViagemKm) : null,
    quilometrosTotais: recurso && item.quilometrosTotais ? Number(item.quilometrosTotais) : null,
    capacidadePorViagem: recurso && item.capacidadePorViagem ? Number(item.capacidadePorViagem) : null,
    unidadeCapacidade: recurso ? item.unidadeCapacidade.trim() : "",
    caracteristicasRecursoSnapshot:
      recurso || origemComercial === "RESOURCE" ? item.caracteristicasRecursoSnapshot : null,
    camposTecnicosPersonalizados: recurso ? item.camposTecnicosPersonalizados : [],
    cargasTotais: recurso && item.cargasTotais ? Number(item.cargasTotais) : null,
    mesesTotais: recurso && item.mesesTotais ? Number(item.mesesTotais) : null,
    diasTrabalhadosMes: recurso ? Number(item.diasTrabalhadosMes) || 22 : null,
    custoTotalCalculado: recurso ? Number(item.custoTotalCalculado) || 0 : 0,
    memoriaCalculo: recurso ? item.memoriaCalculo.trim() : "",
    valorUnitario: recurso ? 0 : Number(item.valorUnitario) || 0,
    observacao: item.observacao.trim()
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
      form.frentes.length > 0
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

function toFiniteNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatOperationalPayloadNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return String(Math.round(value * 10000) / 10000);
}

function getPrazoUtilizadoFrente(frente?: Pick<FrenteForm, "prazoAdotadoDias" | "prazoEstimadoDias" | "prazoTeoricoDias"> | null) {
  if (!frente) {
    return 0;
  }

  return (
    toFiniteNumber(frente.prazoAdotadoDias) ||
    toFiniteNumber(frente.prazoEstimadoDias) ||
    toFiniteNumber(frente.prazoTeoricoDias)
  );
}

function getFrenteByItem(item: ItemForm, frentes: FrenteForm[]) {
  return frentes.find((frente) => frente.localId === item.frenteTempId);
}

function resolveAutomaticOperationalQuantity(
  item: ItemForm,
  frente?: Pick<
    FrenteForm,
    "quantidadePrevista" | "unidadeProducao" | "prazoAdotadoDias" | "prazoEstimadoDias" | "prazoTeoricoDias"
  > | null
) {
  if (!isRecursoItem(item) || item.origemQuantidadeOperacional === "PERSONALIZADA") {
    return null;
  }

  const normalized = normalizeOperationalResource(item, frente);
  return {
    quantidade: normalized.quantidadeOperacionalResolvida,
    unidade: normalized.unidadeOperacionalResolvida
  };
}

function normalizeItemForPayload(item: ItemForm, frentes: FrenteForm[] = []): ItemForm {
  const normalized: ItemForm = {
    ...item,
    frenteTempId: item.frenteTempId.trim(),
    descricaoManualComercial: item.descricaoManualComercial.trim(),
    servicoId: item.servicoId.trim(),
    materialId: item.materialId.trim(),
    equipamentoId: item.equipamentoId.trim(),
    referenciaTecnicaRecursoId: item.referenciaTecnicaRecursoId.trim(),
    formaCusteioRecursoId: item.formaCusteioRecursoId.trim(),
    classeOperacional: item.classeOperacional.trim(),
    recursoReferenciaId: item.recursoReferenciaId.trim(),
    recursoNome: item.recursoNome.trim(),
    fornecedorPreferencialId: item.fornecedorPreferencialId.trim(),
    codigo: item.codigo.trim(),
    descricao: item.descricao.trim(),
    unidade: item.unidade.trim(),
    unidadeQuantidadeOperacional: item.unidadeQuantidadeOperacional.trim(),
    unidadeCapacidade: item.unidadeCapacidade.trim(),
    memoriaCalculo: item.memoriaCalculo.trim(),
    observacao: item.observacao.trim()
  };

  if (isRecursoItem(normalized)) {
    const frente = getFrenteByItem(normalized, frentes);
    const automaticQuantity = resolveAutomaticOperationalQuantity(normalized, frente);

    return {
      ...normalized,
      descricao: getResourceDescricaoResolvida(normalized),
      origemQuantidadeOperacional:
        normalized.origemQuantidadeOperacional === "PERSONALIZADA"
          ? "PERSONALIZADA"
          : "FRENTE",
      quantidadeOperacional:
        normalized.origemQuantidadeOperacional === "PERSONALIZADA"
          ? normalized.quantidadeOperacional
          : formatOperationalPayloadNumber(automaticQuantity?.quantidade ?? 0),
      unidadeQuantidadeOperacional:
        normalized.origemQuantidadeOperacional === "PERSONALIZADA"
          ? normalized.unidadeQuantidadeOperacional
          : automaticQuantity?.unidade ?? normalized.unidadeQuantidadeOperacional
    };
  }

  return normalizeManualCommercialIdentity(normalized);
}

export function normalizeItemsForPayload(itens: ItemForm[], frentes: FrenteForm[] = []) {
  return reordenarItens(itens.map((item) => normalizeItemForPayload(item, frentes)).filter(isItemPreenchido));
}

function getResourceDescricaoResolvida(item: Pick<ItemForm, "descricao" | "recursoNome" | "classeOperacional" | "recursoReferenciaId">) {
  return resolveOperationalResourceDescription(item);
}

function getItemDescricaoEfetiva(item: ItemForm) {
  if (isRecursoItem(item)) {
    return getResourceDescricaoResolvida(item);
  }

  const origemComercial = isRecursoItem(item) ? null : item.origemItemComercial;
  const nomeManual = getManualCommercialName(item);

  if (origemComercial === "MANUAL") {
    return nomeManual;
  }

  return item.descricao.trim();
}

function hasPositiveNumber(value: string) {
  return Number(value) > 0;
}

function isUnidadeInformada(item: ItemForm) {
  const unidade = item.unidade.trim();
  return Boolean(unidade && unidade !== "UN");
}

function isItemPreenchido(item: ItemForm) {
  return Boolean(
    getItemDescricaoEfetiva(item) ||
      item.descricaoManualComercial.trim() ||
      item.codigo.trim() ||
      item.servicoId ||
      item.materialId ||
      item.equipamentoId ||
      item.referenciaTecnicaRecursoId ||
      item.formaCusteioRecursoId ||
      item.classeOperacional ||
      item.recursoReferenciaId ||
      item.recursoNome ||
      item.fornecedorPreferencialId ||
      item.unidadeQuantidadeOperacional.trim() ||
      isUnidadeInformada(item) ||
      Number(item.quantidade) !== 1 ||
      hasPositiveNumber(item.quantidadeOperacional) ||
      hasPositiveNumber(item.valorUnitario) ||
      hasPositiveNumber(item.precoCompra) ||
      hasPositiveNumber(item.markupPercentual) ||
      hasPositiveNumber(item.custoUnitario) ||
      hasPositiveNumber(item.valorCusto) ||
      hasPositiveNumber(item.horasTotais) ||
      hasPositiveNumber(item.viagensTotais) ||
      hasPositiveNumber(item.distanciaViagemKm) ||
      hasPositiveNumber(item.quilometrosTotais) ||
      hasPositiveNumber(item.capacidadePorViagem) ||
      hasPositiveNumber(item.cargasTotais) ||
      hasPositiveNumber(item.mesesTotais) ||
      item.observacao.trim()
  );
}

export function validateItemsBeforeSubmit(form: Pick<OrcamentoForm, "frentes" | "itens">) {
  const errors: Record<string, string> = {};
  const normalizedItems = normalizeItemsForPayload(form.itens, form.frentes);
  const itensValidos =
    form.frentes.length > 0
      ? normalizedItems.filter((item) => Boolean(item.frenteTempId))
      : normalizedItems;

  itensValidos.forEach((item) => {
    const descricao = getItemDescricaoEfetiva(item);

    if (descricao.length < 2) {
      errors[item.localId] = isRecursoItem(item)
        ? `Item ${item.ordem}: o recurso nao possui identificacao valida. Selecione novamente o recurso.`
        : `Item ${item.ordem}: informe uma descricao com pelo menos 2 caracteres.`;
      return;
    }

    if (
      isRecursoItem(item) &&
      item.origemQuantidadeOperacional === "PERSONALIZADA" &&
      !item.unidadeQuantidadeOperacional.trim()
    ) {
      errors[item.localId] =
        `Item ${item.ordem}: informe a unidade da quantidade operacional personalizada para o recurso.`;
      return;
    }

    if (
      isRecursoItem(item) &&
      item.origemQuantidadeOperacional !== "PERSONALIZADA" &&
      !item.unidadeQuantidadeOperacional.trim()
    ) {
      errors[item.localId] =
        `Item ${item.ordem}: nao foi possivel resolver a unidade operacional automaticamente do recurso "${descricao}". Revise a base de calculo.`;
    }
  });

  return { errors };
}

function isPremissaPreenchida(premissa: PremissaForm) {
  return Boolean(premissa.descricao.trim());
}

function mapFrentePayload(frente: FrenteForm) {
  return {
    cenarioTempId: frente.cenarioTempId,
    tempId: frente.localId,
    ordem: frente.ordem,
    natureza: frente.natureza,
    nome: frente.nome,
    descricao: frente.descricao,
    metodoExecutivo: frente.metodoExecutivo,
    unidadeProducao: frente.unidadeProducao,
    quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
    produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
    prazoEstimadoDias: frente.prazoAdotadoDias
      ? Number(frente.prazoAdotadoDias)
      : frente.prazoTeoricoDias
        ? Number(frente.prazoTeoricoDias)
        : null,
    prazoTeoricoDias: frente.prazoTeoricoDias ? Number(frente.prazoTeoricoDias) : null,
    prazoAdotadoDias: frente.prazoAdotadoDias ? Number(frente.prazoAdotadoDias) : null,
    origemPrazo: frente.prazoAdotadoDias ? "AJUSTADO" : "AUTOMATICO",
    modoCusto: frente.modoCusto,
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
    natureza: frente.natureza ?? (item.tipo === "COMERCIAL" ? "COMERCIAL" : "OPERACIONAL"),
    nome: frente.nome,
    descricao: frente.descricao ?? "",
    metodoExecutivo: frente.metodoExecutivo ?? "",
    unidadeProducao: frente.unidadeProducao ?? "",
    quantidadePrevista: toStringValue(frente.quantidadePrevista),
    produtividadeDia: toStringValue(frente.produtividadeDia),
    prazoEstimadoDias: toStringValue(frente.prazoEstimadoDias),
    prazoTeoricoDias: toStringValue(frente.prazoTeoricoDias),
    prazoAdotadoDias: toStringValue(frente.prazoAdotadoDias),
    origemPrazo: frente.origemPrazo ?? "AUTOMATICO",
    modoCusto: frente.modoCusto === "MANUAL" ? "MANUAL" : "AUTO",
    custoManual: toStringValue(frente.custoManual ?? 0),
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
    modoExibicaoValoresPdf: proposta.modoExibicaoValoresPdf ?? "SOMENTE_TOTAL_GLOBAL",
    condicoesComerciais: proposta.condicoesComerciais ?? "",
    observacao: proposta.observacao ?? "",
    emitidaEm: proposta.emitidaEm ?? null,
    pdfOficialUrl: proposta.pdfOficialUrl ?? null,
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
  const hasFrontArchitecture = frentes.length > 0;

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
        hasFrontArchitecture
          ? "0"
          : toStringValue(item.formacaoPreco?.precoFinal ?? 0),
      observacao: toStringValue(item.formacaoPreco?.observacao ?? "")
    },
    cenarios,
    propostasComerciais: propostas,
    frentes,
    itens:
      item.itens.length > 0
        ? normalizeItemsForPayload(item.itens.map((orcamentoItem) => {
            const isRecurso = orcamentoItem.tipoItem === "RECURSO";
            const origemItemComercial =
              orcamentoItem.origemItemComercial ??
              (orcamentoItem.equipamentoId
                ? "RESOURCE"
                : orcamentoItem.servicoId
                  ? "SERVICE"
                  : "MANUAL");
            const nomeManual =
              !isRecurso && origemItemComercial === "MANUAL"
                ? orcamentoItem.descricaoManualComercial || orcamentoItem.descricao
                : orcamentoItem.descricaoManualComercial ?? "";
            const descricao =
              isRecurso
                ? (
                    orcamentoItem.descricao ||
                    orcamentoItem.recursoNome ||
                    orcamentoItem.classeOperacional ||
                    orcamentoItem.recursoReferenciaId ||
                    ""
                  )
                : origemItemComercial === "MANUAL" &&
              nomeManual &&
              orcamentoItem.descricao === nomeManual
                ? ""
                : orcamentoItem.descricao;

            return {
              localId: orcamentoItem.id,
              frenteTempId: orcamentoItem.frenteId ?? "",
              tipoItem: orcamentoItem.tipoItem,
              origemItemComercial,
              descricaoManualComercial: nomeManual,
              servicoId: orcamentoItem.servicoId ?? "",
              materialId: orcamentoItem.materialId ?? "",
              equipamentoId: orcamentoItem.equipamentoId ?? "",
              referenciaTecnicaRecursoId: orcamentoItem.referenciaTecnicaRecursoId ?? "",
              formaCusteioRecursoId: orcamentoItem.formaCusteioRecursoId ?? "",
              formaCusteioSnapshot:
                normalizarFormaCusteioSnapshot(orcamentoItem.formaCusteioSnapshot),
              valorReferenciaCusteio: toStringValue(orcamentoItem.valorReferenciaCusteio),
              valorAplicadoCusteio: toStringValue(orcamentoItem.valorAplicadoCusteio),
              categoriaRecurso: orcamentoItem.categoriaRecurso ?? "EQUIPAMENTO",
              classeOperacional: orcamentoItem.classeOperacional ?? "",
              recursoReferenciaId: orcamentoItem.recursoReferenciaId ?? "",
              recursoNome: orcamentoItem.recursoNome ?? "",
              modoPrecificacao: orcamentoItem.modoPrecificacao ?? "PRECO_DIRETO",
              formaApresentacaoComercial:
                orcamentoItem.formaApresentacaoComercial ?? "QUANTIDADE_DEFINIDA",
              precoCompra: toStringValue(orcamentoItem.precoCompra),
              markupPercentual: toStringValue(orcamentoItem.markupPercentual),
              precoVendaSobrescrito: Boolean(orcamentoItem.precoVendaSobrescrito),
              custoCalculadoOriginal: toStringValue(orcamentoItem.custoCalculadoOriginal),
              custoBaseSobrescrito: toStringValue(orcamentoItem.custoBaseSobrescrito),
              custoBaseAplicado: toStringValue(orcamentoItem.custoBaseAplicado),
              origemCustoAplicado: orcamentoItem.origemCustoAplicado ?? "CALCULADO_AUTOMATICAMENTE",
              precoCalculado: toStringValue(orcamentoItem.precoCalculado),
              precoAplicado: toStringValue(orcamentoItem.precoAplicado),
              origemValorAplicado: orcamentoItem.origemValorAplicado ?? "CALCULADO_AUTOMATICAMENTE",
              motivoSobrescrita: orcamentoItem.motivoSobrescrita ?? "",
              fornecedorPreferencialId: orcamentoItem.fornecedorPreferencialId ?? "",
              exibirNoPdf: orcamentoItem.exibirNoPdf !== false,
              observacaoComercial: orcamentoItem.observacaoComercial ?? "",
              ordem: orcamentoItem.ordem,
              codigo: orcamentoItem.codigo ?? "",
              descricao,
              unidade: orcamentoItem.unidade,
              quantidade: toStringValue(orcamentoItem.quantidade),
              quantidadeOperacional: toStringValue(orcamentoItem.quantidadeOperacional),
              origemQuantidadeOperacional:
                orcamentoItem.origemQuantidadeOperacional ?? "FRENTE",
              unidadeQuantidadeOperacional: orcamentoItem.unidadeQuantidadeOperacional ?? "",
              produtividade: toStringValue(orcamentoItem.produtividade),
              custoUnitario: toStringValue(orcamentoItem.custoUnitario),
              tipoCalculoRecurso: orcamentoItem.tipoCalculoRecurso ?? "AUTOMATICO",
              unidadeEconomicaCusto: orcamentoItem.unidadeEconomicaCusto ?? "",
              valorCusto: toStringValue(orcamentoItem.valorCusto ?? orcamentoItem.custoUnitario),
              horasDia: toStringValue(orcamentoItem.horasDia ?? 8),
              horasTotais: toStringValue(orcamentoItem.horasTotais),
              viagensDia: toStringValue(orcamentoItem.viagensDia),
              viagensTotais: toStringValue(orcamentoItem.viagensTotais),
              distanciaViagemKm: toStringValue(orcamentoItem.distanciaViagemKm),
              quilometrosTotais: toStringValue(orcamentoItem.quilometrosTotais),
              capacidadePorViagem: toStringValue(orcamentoItem.capacidadePorViagem),
              unidadeCapacidade: orcamentoItem.unidadeCapacidade ?? "",
              caracteristicasRecursoSnapshot: normalizarSnapshotCaracteristicasRecurso(
                orcamentoItem.caracteristicasRecursoSnapshot
              ),
              camposTecnicosPersonalizados: orcamentoItem.camposTecnicosPersonalizados ?? [],
              cargasTotais: toStringValue(orcamentoItem.cargasTotais),
              mesesTotais: toStringValue(orcamentoItem.mesesTotais),
              diasTrabalhadosMes: toStringValue(orcamentoItem.diasTrabalhadosMes ?? 22),
              custoTotalCalculado: toStringValue(orcamentoItem.custoTotalCalculado ?? 0),
              memoriaCalculo: orcamentoItem.memoriaCalculo ?? "",
              valorUnitario: toStringValue(orcamentoItem.valorUnitario),
              observacao: orcamentoItem.observacao ?? ""
            };
          }), frentes)
        : [
            createEmptyItem(
              frentes[0]?.natureza === "OPERACIONAL" ? "SERVICO_PRINCIPAL" : "COMERCIAL",
              1,
              firstFrenteId
            )
          ],
    premissas: buildPremissasForm(item)
  };
}
