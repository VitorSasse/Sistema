"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SearchableSelect, type SearchableSelectOption } from "@/components/form/searchable-select";
import { loadOperationalOptions } from "@/lib/client/operational-options";
import { avaliarSnapshotTecnicoEconomico } from "@/lib/engineering-core/economic-resource-status";

type ClienteOption = {
  id: string;
  codigo?: string | null;
  nome: string;
};

type ObraOption = {
  id: string;
  codigo?: string | null;
  nome: string;
  clienteId: string;
};

type EquipamentoOption = {
  id: string;
  descricao: string;
  placaOuTag: string;
  classeOperacional?: string | null;
  capacidadeM3?: string | number | null;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: string | null;
  custoPadrao?: string | number | null;
};

type OrcamentoReferenciaOption = {
  id: string;
  codigo: string;
  titulo?: string | null;
  clienteId: string;
  obraId?: string | null;
  valorTotal?: number | null;
};

type FrenteOrcamentoReferenciaOption = {
  id: string;
  ordem: number;
  natureza: string;
  nome: string;
  descricao?: string | null;
  unidade?: string | null;
  quantidadePrevista?: number | null;
  receitaPrevista?: number | null;
};

type RecursoBoletim = {
  id: string;
  boletimId?: string;
  frenteExecutadaId?: string;
  recursoId?: string | null;
  origem: string;
  origemRegistroTipo?: string | null;
  origemRegistroId?: string | null;
  origemRegistroData?: string | null;
  editavel?: boolean;
  nomeSnapshot: string;
  quantidadeRealizada: string | number;
  unidadeRealizada: string;
  quantidadeRecursos?: string | number | null;
  snapshotTecnicoEconomico?: Record<string, unknown> | null;
  observacao?: string | null;
};

type Boletim = {
  id: string;
  dataBoletim: string;
  status: "ABERTO" | "FECHADO";
  observacoes?: string | null;
  recursos: RecursoBoletim[];
};

type FrenteExecucao = {
  id: string;
  nome?: string | null;
  unidade?: string | null;
  quantidadeExecutada: string | number | null;
  receitaRealizada: string | number | null;
};

type Execucao = {
  id: string;
  descricao?: string | null;
  origem?: string | null;
  status: string;
  estadoEncargos?: "SEM_ENCARGOS" | "COM_ENCARGOS" | "ENCARGOS_PENDENTES";
  cliente?: { id?: string; nome?: string | null; nomeFantasia?: string | null; codigo?: string | null } | null;
  obra?: { id?: string; nome?: string | null; codigo?: string | null } | null;
  frentes: FrenteExecucao[];
  encargosEconomicos?: EncargoEconomicoExecucao[];
  boletins?: Boletim[];
  resultados?: Array<{
    id: string;
    resultadoOperacionalJson?: Record<string, unknown> | null;
    economiaJson?: Record<string, unknown> | null;
  }>;
};

type EncargoEconomicoExecucao = {
  id?: string;
  tipo: string;
  descricao: string;
  formaCalculo: "PERCENTUAL_SOBRE_RECEITA" | "VALOR_INFORMADO";
  percentual?: string | number | null;
  valorInformado?: string | number | null;
  observacao?: string | null;
  origem?: "MANUAL" | "OUTRO_MODULO";
};

type FatoOperacional = {
  id: string;
  origemTipo: string;
  origemLabel: string;
  data: string;
  cliente: string;
  obra: string;
  recursoId: string | null;
  recurso: string;
  identificadorRecurso: string;
  servico: string;
  quantidade: number;
  unidade: string;
  origemFato: string;
  materialId: string | null;
  materialCodigo: string | null;
  materialDescricao: string | null;
  materialUnidade: string | null;
  statusVinculo: "DISPONIVEL" | "VINCULADO";
  custoDisponivel: boolean;
};

type ComparativoValor = {
  previsto: number | null;
  realizado: number | null;
  desvioAbsoluto: number | null;
  desvioPercentual: number | null;
};

type Comparativo = {
  referenciaDisponivel: boolean;
  motivo?: string;
  frentes: Array<{
    frenteId: string;
    nome: string;
    unidade: string | null;
    quantidade: ComparativoValor;
    receita: ComparativoValor;
    custo: ComparativoValor;
    resultado: ComparativoValor;
    margem: ComparativoValor;
    recursos: Array<{
      status: "CORRESPONDENTE" | "SOMENTE_PREVISTO" | "SOMENTE_REALIZADO";
      recurso: string;
      unidade: string | null;
      quantidade: ComparativoValor;
      custo: ComparativoValor;
      origem: { previsto: string | null; realizado: string | null };
    }>;
  }>;
};

const unidades = ["m3", "m2", "h", "dia", "diaria", "carga", "viagem", "km", "mes", "un"];
const basesEconomicas = ["CARGA", "VIAGEM", "HORA", "DIA", "KM", "M3", "M2", "MES", "UNIDADE", "CUSTO_FIXO"];
const JORNADA_PADRAO_EXECUCAO_HORAS_DIA = 8;
const formasCalculoEncargo = [
  { value: "PERCENTUAL_SOBRE_RECEITA", label: "Percentual sobre receita" },
  { value: "VALOR_INFORMADO", label: "Valor informado" }
] as const;

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function number(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${toNumber(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message ?? "Nao foi possivel concluir a operacao.");
  }

  return data;
}

function initialExecucaoForm() {
  return {
    clienteId: "",
    obraId: "",
    orcamentoId: "",
    frenteOrigemId: "",
    frenteOrigemIds: [] as string[],
    descricao: "",
    frenteNome: "",
    unidade: "",
    quantidade: "",
    receita: ""
  };
}

function execucaoFormFromSelected(execucao: Execucao | null | undefined) {
  const frente = execucao?.frentes?.[0];

  return {
    clienteId: execucao?.cliente?.id ?? "",
    obraId: execucao?.obra?.id ?? "",
    orcamentoId: "",
    frenteOrigemId: "",
    frenteOrigemIds: [] as string[],
    descricao: execucao?.descricao ?? "",
    frenteNome: frente?.nome ?? "",
    unidade: frente?.unidade ?? "",
    quantidade: frente?.quantidadeExecutada === null || frente?.quantidadeExecutada === undefined ? "" : String(frente.quantidadeExecutada),
    receita: frente?.receitaRealizada === null || frente?.receitaRealizada === undefined ? "" : String(frente.receitaRealizada)
  };
}

function initialBoletimForm() {
  return {
    dataBoletim: todayInput(),
    observacoes: ""
  };
}

function initialRecursoForm(frenteId = "") {
  return {
    frenteExecutadaId: frenteId,
    equipamentoId: "",
    nomeSnapshot: "",
    quantidadeRealizada: "",
    unidadeRealizada: "carga",
    quantidadeRecursos: "1",
    baseEconomica: "CARGA",
    valorCusto: "",
    unidadeCusto: "R$/carga",
    distanciaIdaKm: "",
    distanciaVoltaKm: "",
    distanciaViagemKm: "",
    horasDia: String(JORNADA_PADRAO_EXECUCAO_HORAS_DIA),
    observacao: ""
  };
}

function newEncargo(): EncargoEconomicoExecucao {
  return {
    tipo: "",
    descricao: "",
    formaCalculo: "PERCENTUAL_SOBRE_RECEITA",
    percentual: "",
    valorInformado: "",
    observacao: "",
    origem: "MANUAL"
  };
}

function encargosFormFromSelected(execucao: Execucao | null | undefined) {
  const encargos = execucao?.encargosEconomicos ?? [];
  return {
    possuiEncargos: execucao?.estadoEncargos === "COM_ENCARGOS" ||
      execucao?.estadoEncargos === "ENCARGOS_PENDENTES" ||
      encargos.length > 0,
    encargos: encargos.length ? encargos.map((encargo) => ({
      id: encargo.id,
      tipo: encargo.tipo,
      descricao: encargo.descricao,
      formaCalculo: encargo.formaCalculo,
      percentual: encargo.percentual === null || encargo.percentual === undefined ? "" : String(encargo.percentual),
      valorInformado: encargo.valorInformado === null || encargo.valorInformado === undefined ? "" : String(encargo.valorInformado),
      observacao: encargo.observacao ?? "",
      origem: encargo.origem ?? "MANUAL"
    })) : [newEncargo()]
  };
}

function initialEconomicForm(recurso?: RecursoBoletim | null) {
  const snapshot = recurso?.snapshotTecnicoEconomico ?? {};
  const metadados = (snapshot.metadados as Record<string, unknown> | undefined) ?? {};
  const distanciaIdaKm = metadados.distanciaIdaKm === undefined ? "" : String(metadados.distanciaIdaKm);
  const distanciaVoltaKm = metadados.distanciaVoltaKm === undefined ? "" : String(metadados.distanciaVoltaKm);

  return {
    frenteExecutadaId: recurso?.frenteExecutadaId ?? "",
    recursoId: recurso?.recursoId ?? "",
    nomeSnapshot: recurso?.nomeSnapshot ?? "",
    quantidadeRealizada: recurso?.quantidadeRealizada === undefined ? "" : String(recurso.quantidadeRealizada),
    unidadeRealizada: recurso?.unidadeRealizada ?? "carga",
    quantidadeRecursos: recurso?.quantidadeRecursos === null || recurso?.quantidadeRecursos === undefined ? "1" : String(recurso.quantidadeRecursos),
    origem: recurso?.origem ?? "MANUAL",
    origemRegistroTipo: recurso?.origemRegistroTipo ?? "",
    origemRegistroId: recurso?.origemRegistroId ?? "",
    origemRegistroData: recurso?.origemRegistroData ?? "",
    editavel: recurso?.editavel ?? true,
    baseEconomica: String(snapshot.baseEconomica ?? "CARGA"),
    valorCusto: snapshot.valorCusto === undefined ? "" : String(snapshot.valorCusto),
    unidadeCusto: String(snapshot.unidadeCusto ?? "R$/carga"),
    origemCusto: resolveEconomicOriginValue(snapshot),
    valorBibliotecaOriginal: metadados.valorBibliotecaOriginal === undefined ? "" : String(metadados.valorBibliotecaOriginal),
    quantidadeOperacional: snapshot.quantidadeOperacional === undefined ? "" : String(snapshot.quantidadeOperacional),
    unidadeQuantidadeOperacional: String(snapshot.unidadeQuantidadeOperacional ?? recurso?.unidadeRealizada ?? "carga"),
    capacidadePorViagem: snapshot.capacidadePorViagem === undefined ? "" : String(snapshot.capacidadePorViagem),
    unidadeCapacidade: String(snapshot.unidadeCapacidade ?? ""),
    componenteEconomico: String(snapshot.componenteEconomico ?? "TRANSPORTE"),
    materialId: String(snapshot.materialId ?? ""),
    materialCodigo: String(snapshot.materialCodigo ?? ""),
    materialDescricao: String(snapshot.materialDescricao ?? ""),
    materialUnidade: String(snapshot.materialUnidade ?? ""),
    materialQuantidade: snapshot.materialQuantidade === undefined ? "" : String(snapshot.materialQuantidade),
    materialBaseEconomica: String(snapshot.materialBaseEconomica ?? (snapshot.materialUnidade ? String(snapshot.materialUnidade).toUpperCase() : "M3")),
    materialValorCusto: snapshot.materialValorCusto === undefined ? "" : String(snapshot.materialValorCusto),
    materialUnidadeCusto: String(snapshot.materialUnidadeCusto ?? (snapshot.materialUnidade ? `R$/${snapshot.materialUnidade}` : "R$/m3")),
    distanciaIdaKm,
    distanciaVoltaKm,
    distanciaViagemKm: snapshot.distanciaViagemKm === undefined ? "" : String(snapshot.distanciaViagemKm),
    quilometrosTotais: snapshot.quilometrosTotais === undefined ? "" : String(snapshot.quilometrosTotais),
    viagensTotais: snapshot.viagensTotais === undefined ? "" : String(snapshot.viagensTotais),
    cargasTotais: snapshot.cargasTotais === undefined ? "" : String(snapshot.cargasTotais),
    horasDia: snapshot.horasDia === undefined ? String(JORNADA_PADRAO_EXECUCAO_HORAS_DIA) : String(snapshot.horasDia),
    horasTotais: snapshot.horasTotais === undefined ? "" : String(snapshot.horasTotais),
    mesesTotais: snapshot.mesesTotais === undefined ? "" : String(snapshot.mesesTotais),
    motivoPersonalizacao: String(metadados.motivoPersonalizacao ?? ""),
    observacao: recurso?.observacao ?? ""
  };
}

function initialFatosFilter() {
  return {
    dataInicio: todayInput(),
    dataFim: todayInput(),
    obraId: "",
    recursoId: "",
    servicoId: ""
  };
}

function clienteLabel(cliente: ClienteOption) {
  return cliente.codigo ? `${cliente.codigo} - ${cliente.nome}` : cliente.nome;
}

function unidadeCustoFromBase(base: string) {
  const map: Record<string, string> = {
    CARGA: "R$/carga",
    VIAGEM: "R$/viagem",
    HORA: "R$/h",
    DIA: "R$/dia",
    KM: "R$/km",
    M3: "R$/m3",
    M2: "R$/m2",
    MES: "R$/mes",
    UNIDADE: "R$/un",
    CUSTO_FIXO: "R$"
  };
  return map[base] ?? "R$/un";
}

function baseEconomicaLabel(base: string) {
  const map: Record<string, string> = {
    CARGA: "Carga",
    VIAGEM: "Viagem",
    HORA: "Hora",
    DIA: "Dia",
    KM: "Km",
    M3: "m3",
    M2: "m2",
    MES: "Mes",
    UNIDADE: "Unidade",
    CUSTO_FIXO: "Custo fixo"
  };
  return map[base] ?? base;
}

function distanciaCicloKm(form: {
  distanciaIdaKm?: string | number | null;
  distanciaVoltaKm?: string | number | null;
  distanciaViagemKm?: string | number | null;
}) {
  const ida = toNumber(form.distanciaIdaKm);
  const volta = toNumber(form.distanciaVoltaKm);
  if (ida > 0 || volta > 0) return ida + volta;
  return toNumber(form.distanciaViagemKm);
}

function unidadeOperacionalPadraoPorBase(base: string, atual: string) {
  const map: Record<string, string> = {
    CARGA: "carga",
    VIAGEM: "viagem",
    KM: "viagem",
    HORA: "h",
    M3: "m3",
    M2: "m2",
    MES: "mes",
    UNIDADE: "unidade"
  };
  return map[base] ?? atual;
}

function quantidadeLabelPorBase(base: string) {
  const map: Record<string, string> = {
    CARGA: "Quantidade de cargas",
    VIAGEM: "Quantidade de viagens",
    KM: "Quantidade de viagens",
    HORA: "Quantidade de horas",
    DIA: "Quantidade realizada",
    M3: "Quantidade em m3",
    M2: "Quantidade em m2",
    MES: "Quantidade de meses",
    UNIDADE: "Quantidade",
    CUSTO_FIXO: "Quantidade"
  };
  return map[base] ?? "Quantidade";
}

function optionalNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function economicPendingReasonFromSnapshot(snapshot: Record<string, unknown>) {
  const avaliacao = avaliarSnapshotTecnicoEconomico(snapshot);

  if (avaliacao.status === "CUSTO_DEFINIDO" || avaliacao.status === "SEM_CUSTO") return "ok";
  return avaliacao.motivo;
}

function resolveEconomicOriginValue(snapshot: Record<string, unknown>) {
  const metadados = (snapshot.metadados as Record<string, unknown> | undefined) ?? {};
  const origemCusto = String(metadados.origemCusto ?? snapshot.origem ?? metadados.origem ?? "");
  const pendingReason = economicPendingReasonFromSnapshot(snapshot);

  if (pendingReason !== "ok") return "PENDENTE";
  if (origemCusto.includes("PROVISORIO")) return "RECURSO_PROVISORIO";
  if (origemCusto.includes("PERSONALIZADO") || origemCusto.includes("PENDENTE")) return "PERSONALIZADO_EXECUCAO";
  return "BIBLIOTECA_RECURSOS";
}

function economicStatus(recurso: RecursoBoletim) {
  const snapshot = recurso.snapshotTecnicoEconomico ?? {};
  const pendingReason = economicPendingReasonFromSnapshot(snapshot);

  if (pendingReason !== "ok") return "CUSTO PENDENTE";
  return "CUSTO DEFINIDO";
}

function economicPendingReason(recurso: RecursoBoletim) {
  return economicPendingReasonFromSnapshot(recurso.snapshotTecnicoEconomico ?? {});
}

function economicOriginLabel(recurso: RecursoBoletim) {
  const snapshot = recurso.snapshotTecnicoEconomico ?? {};
  const metadados = (snapshot.metadados as Record<string, unknown> | undefined) ?? {};
  const origem = String(metadados.origemCusto ?? metadados.origem ?? snapshot.origem ?? "");

  if (origem.includes("PERSONALIZADO")) return "Personalizado na execucao";
  if (origem.includes("PROVISORIO")) return "Recurso provisorio";
  if (origem.includes("PENDENTE")) {
    return economicPendingReasonFromSnapshot(snapshot) === "ok" ? "Personalizado na execucao" : "Pendente";
  }
  return "Biblioteca";
}

function buildEconomicSnapshot(form: ReturnType<typeof initialEconomicForm>, previous?: Record<string, unknown> | null) {
  const existing = previous ?? {};
  const metadados = (existing.metadados as Record<string, unknown> | undefined) ?? {};
  const distanciaViagemKm = distanciaCicloKm(form);
  const valorCusto = toNumber(form.valorCusto);
  const horasDia = optionalNumber(form.horasDia) ?? JORNADA_PADRAO_EXECUCAO_HORAS_DIA;
  const jornadaPadraoOriginal = toNumber(metadados.jornadaPadraoOriginal) || JORNADA_PADRAO_EXECUCAO_HORAS_DIA;
  const origemJornada = horasDia === jornadaPadraoOriginal ? "PADRAO" : "PERSONALIZADA_EXECUCAO";
  const possuiPendenciaReal =
    valorCusto <= 0 ||
    (form.baseEconomica === "KM" && distanciaViagemKm <= 0 && toNumber(form.quilometrosTotais) <= 0);
  const origemCusto = possuiPendenciaReal
    ? "PENDENTE_CONFIGURACAO"
    : form.origemCusto === "PENDENTE"
      ? "PERSONALIZADO_EXECUCAO"
      : form.origemCusto;
  const snapshot: Record<string, unknown> = {
    ...existing,
    baseEconomica: form.baseEconomica,
    valorCusto,
    custoUnitario: valorCusto,
    unidadeCusto: form.unidadeCusto || unidadeCustoFromBase(form.baseEconomica),
    componenteEconomico: form.componenteEconomico,
    materialId: form.materialId || undefined,
    materialCodigo: form.materialCodigo || undefined,
    materialDescricao: form.materialDescricao || undefined,
    materialUnidade: form.materialUnidade || undefined,
    materialQuantidade: optionalNumber(form.materialQuantidade),
    materialBaseEconomica: form.materialBaseEconomica || undefined,
    materialValorCusto: optionalNumber(form.materialValorCusto),
    materialUnidadeCusto: form.materialUnidadeCusto || undefined,
    quantidadeOperacional: optionalNumber(form.quantidadeOperacional) ?? toNumber(form.quantidadeRealizada),
    unidadeQuantidadeOperacional: form.unidadeQuantidadeOperacional || form.unidadeRealizada,
    capacidadePorViagem: optionalNumber(form.capacidadePorViagem),
    unidadeCapacidade: form.unidadeCapacidade || undefined,
    distanciaViagemKm: distanciaViagemKm > 0 ? distanciaViagemKm : undefined,
    quilometrosTotais: optionalNumber(form.quilometrosTotais),
    viagensTotais: optionalNumber(form.viagensTotais),
    cargasTotais: optionalNumber(form.cargasTotais),
    horasDia,
    horasTotais: optionalNumber(form.horasTotais),
    mesesTotais: optionalNumber(form.mesesTotais),
    metadados: {
      ...metadados,
      origem: form.origemCusto === "RECURSO_PROVISORIO" ? "RECURSO_PROVISORIO" : String(metadados.origem ?? "BIBLIOTECA_RECURSOS"),
      origemCusto,
      valorBibliotecaOriginal: optionalNumber(form.valorBibliotecaOriginal) ?? null,
      valorCustoUtilizado: valorCusto,
      motivoPersonalizacao: form.motivoPersonalizacao || null,
      jornadaPadraoOriginal,
      jornadaUtilizada: horasDia,
      origemJornada,
      distanciaIdaKm: optionalNumber(form.distanciaIdaKm) ?? null,
      distanciaVoltaKm: optionalNumber(form.distanciaVoltaKm) ?? null,
      materialIdentificado: Boolean(form.materialDescricao),
      materialDescricao: form.materialDescricao || null,
      componenteEconomico: form.componenteEconomico
    }
  };

  const materialValorCusto = optionalNumber(form.materialValorCusto);
  if (form.materialId || form.materialDescricao) {
    snapshot.componentesEconomicos = [
      {
        tipo: "TRANSPORTE",
        nome: form.nomeSnapshot,
        categoria: existing.categoria,
        classeOperacional: existing.classeOperacional,
        baseEconomica: form.baseEconomica,
        valorCusto,
        custoUnitario: valorCusto,
        unidadeCusto: form.unidadeCusto || unidadeCustoFromBase(form.baseEconomica),
        quantidadeOperacional: optionalNumber(form.quantidadeOperacional) ?? toNumber(form.quantidadeRealizada),
        unidadeQuantidadeOperacional: form.unidadeQuantidadeOperacional || form.unidadeRealizada,
        capacidadePorViagem: optionalNumber(form.capacidadePorViagem),
        unidadeCapacidade: form.unidadeCapacidade || undefined,
        distanciaViagemKm: distanciaViagemKm > 0 ? distanciaViagemKm : undefined,
        quilometrosTotais: optionalNumber(form.quilometrosTotais),
        viagensTotais: optionalNumber(form.viagensTotais),
        cargasTotais: optionalNumber(form.cargasTotais),
        horasDia,
        horasTotais: optionalNumber(form.horasTotais),
        mesesTotais: optionalNumber(form.mesesTotais)
      },
      {
        tipo: "MATERIAL",
        nome: form.materialDescricao || "Material",
        categoria: "MATERIAL",
        classeOperacional: form.materialDescricao || undefined,
        baseEconomica: form.materialBaseEconomica || "M3",
        valorCusto: materialValorCusto ?? 0,
        custoUnitario: materialValorCusto ?? 0,
        unidadeCusto: form.materialUnidadeCusto || unidadeCustoFromBase(form.materialBaseEconomica || "M3"),
        quantidadeOperacional: optionalNumber(form.materialQuantidade),
        unidadeQuantidadeOperacional: form.materialUnidade || undefined,
        materialId: form.materialId,
        materialCodigo: form.materialCodigo || undefined,
        materialDescricao: form.materialDescricao || undefined,
        materialUnidade: form.materialUnidade || undefined,
        metadados: {
          statusEconomico: materialValorCusto && materialValorCusto > 0 ? "DEFINIDO" : "SEM_CUSTO"
        }
      }
    ];
  }

  Object.keys(snapshot).forEach((key) => {
    if (snapshot[key] === undefined) delete snapshot[key];
  });

  return snapshot;
}

function normalizeClienteOption(item: { id: string; codigo?: string | null; nome?: string | null; nomeFantasia?: string | null }) {
  return {
    id: item.id,
    codigo: item.codigo ?? null,
    nome: item.nomeFantasia || item.nome || item.codigo || "Cliente sem nome"
  };
}

function extractRealizado(selected: Execucao | null) {
  const latest = selected?.resultados?.[0];
  const resultadoOperacionalJson = latest?.resultadoOperacionalJson as Record<string, unknown> | undefined;
  const operacional = (resultadoOperacionalJson?.resultadoOperacional ?? resultadoOperacionalJson) as Record<string, unknown> | undefined;
  const economiaJson = latest?.economiaJson as Record<string, unknown> | undefined;
  const consolidado = operacional?.consolidado as Record<string, unknown> | undefined;
  const economia = economiaJson?.economia as Record<string, unknown> | undefined;
  const unidadesResultado = operacional?.unidades as Array<Record<string, unknown>> | undefined;
  const recursos = (unidadesResultado ?? []).flatMap((unidade) => (unidade.recursos as Array<Record<string, unknown>> | undefined) ?? []);

  return {
    custo: toNumber(consolidado?.custoOperacionalTotal),
    encargos: toNumber(economia?.encargosEconomicos),
    custoTotalExecucao: toNumber(economia?.custoTotalExecucao ?? consolidado?.custoOperacionalTotal),
    statusEncargos: String(economia?.statusEncargos ?? "SEM_ENCARGOS"),
    encargosDetalhes: (economia?.encargos as Array<Record<string, unknown>> | undefined) ?? [],
    quantidade: toNumber(consolidado?.quantidadeTotal),
    receita: toNumber(economia?.receita),
    resultado: toNumber(economia?.resultado),
    margem: typeof economia?.margemPercentual === "number" ? economia.margemPercentual : null,
    recursos
  };
}

function hasQuantidadeServico(selected: Execucao | null) {
  return (selected?.frentes ?? []).some((frente) => frente.quantidadeExecutada !== null && frente.quantidadeExecutada !== undefined && frente.quantidadeExecutada !== "");
}

function countPendingEconomicResources(boletins: Boletim[]) {
  return boletins.reduce((total, boletim) => {
    return total + boletim.recursos.filter((recurso) => economicPendingReason(recurso) !== "ok").length;
  }, 0);
}

function findResultadosRecurso(recurso: RecursoBoletim, recursosCalculados: Array<Record<string, unknown>>) {
  const diretos = recursosCalculados.filter((calculado) => (
    String(calculado.recursoRealizadoId ?? "") === recurso.id ||
    String(calculado.recursoBoletimId ?? "") === recurso.id ||
    String(calculado.id ?? "") === recurso.id
  ));

  if (diretos.length) return diretos;

  return recursosCalculados.filter((calculado) => (
    Boolean(recurso.origemRegistroId) &&
    String(calculado.origemRegistroId ?? "") === String(recurso.origemRegistroId) &&
    String(calculado.origemRegistroTipo ?? "") === String(recurso.origemRegistroTipo ?? "")
  ));
}

function findResultadoRecurso(recurso: RecursoBoletim, recursosCalculados: Array<Record<string, unknown>>) {
  return findResultadosRecurso(recurso, recursosCalculados)[0] ?? null;
}

function custoRealizadoRecursoLabel(
  recurso: RecursoBoletim,
  resultadoRecurso: Record<string, unknown> | null,
  possuiResultado: boolean
) {
  if (resultadoRecurso) {
    const status = String(resultadoRecurso.statusCalculo ?? "");
    const custo = toNumber(resultadoRecurso.custoTotal);
    if (status === "SEM_CUSTO") return "Sem custo";
    if ((status === "PENDENTE" || status === "NAO_INFORMADO") && custo <= 0) return "Pendente";
    return money(custo);
  }
  if (economicPendingReason(recurso) !== "ok") return "Pendente";
  return possuiResultado ? "Nao retornado pelo Nucleo" : "Aguardando consolidacao";
}

function dateKey(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function boletimStatusByDate(boletins: Boletim[]) {
  return new Map(boletins.map((boletim) => [dateKey(boletim.dataBoletim), boletim.status]));
}

export function ExecucoesManager() {
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedBoletimId, setSelectedBoletimId] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [createMode, setCreateMode] = useState<"DIRETA" | "ORCAMENTO">("DIRETA");
  const [orcamentosReferencia, setOrcamentosReferencia] = useState<OrcamentoReferenciaOption[]>([]);
  const [frentesReferencia, setFrentesReferencia] = useState<FrenteOrcamentoReferenciaOption[]>([]);
  const [comparativo, setComparativo] = useState<Comparativo | null>(null);
  const [fatos, setFatos] = useState<FatoOperacional[]>([]);
  const [selectedFatos, setSelectedFatos] = useState<string[]>([]);
  const [fatosPanelOpen, setFatosPanelOpen] = useState(false);
  const [fatosFilter, setFatosFilter] = useState(initialFatosFilter);
  const [execucaoForm, setExecucaoForm] = useState(initialExecucaoForm);
  const [headerForm, setHeaderForm] = useState(initialExecucaoForm);
  const [encargosForm, setEncargosForm] = useState(() => encargosFormFromSelected(null));
  const [editingHeader, setEditingHeader] = useState(false);
  const [boletimForm, setBoletimForm] = useState(initialBoletimForm);
  const [recursoForm, setRecursoForm] = useState(initialRecursoForm);
  const [editingRecursoId, setEditingRecursoId] = useState("");
  const [economicForm, setEconomicForm] = useState(initialEconomicForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [referenciasLoading, setReferenciasLoading] = useState(false);
  const [referenciasError, setReferenciasError] = useState("");

  const selected = useMemo(
    () => execucoes.find((execucao) => execucao.id === selectedId) ?? execucoes[0] ?? null,
    [execucoes, selectedId]
  );
  const boletins = selected?.boletins ?? [];
  const selectedBoletim = boletins.find((boletim) => boletim.id === selectedBoletimId) ?? boletins[0] ?? null;
  const statusBoletimPorData = useMemo(() => boletimStatusByDate(boletins), [boletins]);
  const fatosDisponiveis = fatos.filter((fato) => fato.statusVinculo === "DISPONIVEL");
  const fatosComBoletimFechado = fatosDisponiveis.filter((fato) => statusBoletimPorData.get(dateKey(fato.data)) === "FECHADO");
  const fatosVinculaveis = fatosDisponiveis.filter((fato) => statusBoletimPorData.get(dateKey(fato.data)) !== "FECHADO");
  const recursoEmEdicao = selectedBoletim?.recursos.find((recurso) => recurso.id === editingRecursoId) ?? null;
  const economicBase = economicForm.baseEconomica;
  const showDistanceFields = economicBase === "KM";
  const showMaterialFields = economicForm.componenteEconomico === "MATERIAL" || Boolean(economicForm.materialDescricao);
  const isBibliotecaCost = economicForm.origemCusto === "BIBLIOTECA_RECURSOS";
  const isPersonalizedCost = economicForm.origemCusto === "PERSONALIZADO_EXECUCAO" || economicForm.origemCusto === "RECURSO_PROVISORIO" || economicForm.origemCusto === "PENDENTE";
  const showJornadaDiaria = economicBase === "DIA" && (
    economicForm.unidadeRealizada.toLowerCase().startsWith("h") ||
    economicForm.unidadeQuantidadeOperacional.toLowerCase().startsWith("h")
  );
  const distanciaCiclo = distanciaCicloKm(economicForm);
  const recursoBase = recursoForm.baseEconomica;
  const recursoDistanciaCiclo = distanciaCicloKm(recursoForm);
  const showRecursoDistanceFields = recursoBase === "KM";
  const showRecursoJornadaDiaria = recursoBase === "DIA" && recursoForm.unidadeRealizada.toLowerCase().startsWith("h");
  const recursoQuantidadeLabel = quantidadeLabelPorBase(recursoBase);
  const possuiQuantidadeServico = hasQuantidadeServico(selected);
  const possuiBoletimAbertoComRecursos = boletins.some((boletim) => boletim.status === "ABERTO" && boletim.recursos.length > 0);
  const recursosPendentesEconomicos = countPendingEconomicResources(boletins);
  const obrasFiltradas = execucaoForm.clienteId
    ? obras.filter((obra) => obra.clienteId === execucaoForm.clienteId)
    : obras;
  const clienteOptions = useMemo<SearchableSelectOption[]>(
    () => clientes.map((cliente) => ({
      value: cliente.id,
      label: clienteLabel(cliente)
    })),
    [clientes]
  );
  const obraOptions = useMemo<SearchableSelectOption[]>(
    () => obrasFiltradas.map((obra) => ({
      value: obra.id,
      label: obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome
    })),
    [obrasFiltradas]
  );
  const headerObrasFiltradas = headerForm.clienteId
    ? obras.filter((obra) => obra.clienteId === headerForm.clienteId)
    : obras;
  const headerObraOptions = useMemo<SearchableSelectOption[]>(
    () => headerObrasFiltradas.map((obra) => ({
      value: obra.id,
      label: obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome
    })),
    [headerObrasFiltradas]
  );
  const orcamentoOptions = useMemo<SearchableSelectOption[]>(
    () => orcamentosReferencia.map((orcamento) => ({
      value: orcamento.id,
      label: `${orcamento.codigo}${orcamento.titulo ? ` - ${orcamento.titulo}` : ""}`
    })),
    [orcamentosReferencia]
  );
  const frentesSelecionadasReferencia = frentesReferencia.filter((frente) => execucaoForm.frenteOrigemIds.includes(frente.id));
  const frenteSelecionadaReferencia = frentesSelecionadasReferencia[0] ?? null;
  const selectedFrenteIdsKey = useMemo(
    () => (selected?.frentes ?? []).map((frente) => frente.id).join("|"),
    [selected?.frentes]
  );

  const totais = useMemo(() => {
    const frentes = selected?.frentes ?? [];
    return {
      receita: frentes.reduce((total, frente) => total + toNumber(frente.receitaRealizada), 0),
      quantidade: frentes.reduce((total, frente) => total + toNumber(frente.quantidadeExecutada), 0)
    };
  }, [selected]);
  const realizado = useMemo(() => extractRealizado(selected), [selected]);
  const resultadoRecursoEmEdicao = recursoEmEdicao ? findResultadoRecurso(recursoEmEdicao, realizado.recursos) : null;

  async function loadExecucoes(preferSelectedId = selected?.id) {
    const execucoesData = await fetchJson<{ items: Execucao[] }>("/api/execucoes");
    setExecucoes(execucoesData.items);

    const nextSelectedId = preferSelectedId && execucoesData.items.some((item) => item.id === preferSelectedId)
      ? preferSelectedId
      : execucoesData.items[0]?.id ?? "";
    setSelectedId(nextSelectedId);

    if (nextSelectedId) {
      await loadComparativo(nextSelectedId);
    }
  }

  async function loadOptions() {
    setOptionsLoading(true);
    setOptionsError("");

    try {
      const opcoesData = await loadOperationalOptions();
      setClientes((opcoesData.clientes ?? []).map(normalizeClienteOption));
      setObras((opcoesData.obras ?? []).map((obra) => ({
        id: obra.id,
        codigo: obra.codigo ?? null,
        nome: obra.nome || obra.codigo || "Obra sem nome",
        clienteId: obra.clienteId ?? ""
      })));
      setEquipamentos((opcoesData.equipamentos ?? []).map((equipamento) => ({
        id: equipamento.id,
        descricao: equipamento.descricao || equipamento.placaOuTag || "Recurso sem descricao",
        placaOuTag: equipamento.placaOuTag || "-",
        classeOperacional: equipamento.classeOperacional ?? null,
        capacidadeM3: equipamento.capacidadeM3 ?? null,
        unidadeCapacidade: equipamento.unidadeCapacidade ?? null,
        unidadeEconomicaPadrao: equipamento.unidadeEconomicaPadrao ?? null,
        custoPadrao: equipamento.custoPadrao ?? null
      })));
    } catch (err) {
      setOptionsError(err instanceof Error ? err.message : "Nao foi possivel carregar clientes, obras e recursos.");
    } finally {
      setOptionsLoading(false);
    }
  }

  async function loadReferenciasOrcamento() {
    if (createMode !== "ORCAMENTO") {
      setOrcamentosReferencia([]);
      setFrentesReferencia([]);
      setReferenciasError("");
      return;
    }

    setReferenciasLoading(true);
    setReferenciasError("");

    try {
      const params = new URLSearchParams();
      if (execucaoForm.clienteId) params.set("clienteId", execucaoForm.clienteId);
      if (execucaoForm.obraId) params.set("obraId", execucaoForm.obraId);
      if (execucaoForm.orcamentoId) params.set("orcamentoId", execucaoForm.orcamentoId);

      const data = await fetchJson<{
        orcamentos: OrcamentoReferenciaOption[];
        frentes: FrenteOrcamentoReferenciaOption[];
      }>(`/api/execucoes/referencias-orcamento?${params.toString()}`);

      setOrcamentosReferencia(data.orcamentos ?? []);
      setFrentesReferencia(data.frentes ?? []);
    } catch (err) {
      setReferenciasError(err instanceof Error ? err.message : "Nao foi possivel carregar orcamentos e frentes.");
    } finally {
      setReferenciasLoading(false);
    }
  }

  async function loadAll(preferSelectedId = selected?.id) {
    await Promise.all([
      loadExecucoes(preferSelectedId),
      loadOptions()
    ]);
  }

  async function refreshSelected(id = selected?.id) {
    if (!id) return;
    const data = await fetchJson<{ item: Execucao }>(`/api/execucoes/${id}`);
    setExecucoes((current) => {
      const exists = current.some((item) => item.id === id);
      return exists ? current.map((item) => (item.id === id ? data.item : item)) : [data.item, ...current];
    });
    setSelectedId(id);
    await loadComparativo(id);
  }

  async function loadComparativo(id: string) {
    const data = await fetchJson<{ item: Comparativo }>(`/api/execucoes/${id}/comparativo`);
    setComparativo(data.item);
  }

  async function loadFatos() {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set("execucaoId", selected.id);
    if (fatosFilter.obraId) params.set("obraId", fatosFilter.obraId);
    if (fatosFilter.dataInicio) params.set("dataInicio", fatosFilter.dataInicio);
    if (fatosFilter.dataFim) params.set("dataFim", fatosFilter.dataFim);
    if (fatosFilter.recursoId) params.set("recursoId", fatosFilter.recursoId);
    if (fatosFilter.servicoId) params.set("servicoId", fatosFilter.servicoId);

    const data = await fetchJson<{ items: FatoOperacional[] }>(`/api/execucoes/fatos?${params.toString()}`);
    setFatos(data.items);
    setSelectedFatos((current) => current.filter((id) => data.items.some((item) => item.id === id && item.statusVinculo === "DISPONIVEL")));
    setFatosPanelOpen(data.items.some((item) => item.statusVinculo === "DISPONIVEL"));
  }

  useEffect(() => {
    loadExecucoes().catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar execucoes."));
    loadOptions().catch((err) => setOptionsError(err instanceof Error ? err.message : "Nao foi possivel carregar clientes, obras e recursos."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadReferenciasOrcamento().catch((err) => setReferenciasError(err instanceof Error ? err.message : "Nao foi possivel carregar orcamentos e frentes."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMode, execucaoForm.clienteId, execucaoForm.obraId, execucaoForm.orcamentoId]);

  useEffect(() => {
    const ids = new Set((selected?.frentes ?? []).map((frente) => frente.id));
    const primeiraFrente = selected?.frentes?.[0]?.id ?? "";

    if (!ids.has(recursoForm.frenteExecutadaId)) {
      setRecursoForm((current) => ({ ...current, frenteExecutadaId: primeiraFrente }));
    }
  }, [recursoForm.frenteExecutadaId, selected?.id, selectedFrenteIdsKey]);

  useEffect(() => {
    setHeaderForm(execucaoFormFromSelected(selected));
    setEncargosForm(encargosFormFromSelected(selected));
    setEditingHeader(false);
  }, [selected?.id, selected?.estadoEncargos, selected?.encargosEconomicos?.length]);

  useEffect(() => {
    setFatosFilter((current) => ({ ...current, obraId: selected?.obra?.id ?? "" }));
  }, [selected?.id, selected?.obra?.id]);

  useEffect(() => {
    if (!recursoEmEdicao) {
      setEditingRecursoId("");
      setEconomicForm(initialEconomicForm());
      return;
    }

    setEconomicForm(initialEconomicForm(recursoEmEdicao));
  }, [recursoEmEdicao?.id]);

  async function handleCreateExecucao(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = createMode === "ORCAMENTO"
        ? {
          clienteId: execucaoForm.clienteId || null,
          obraId: execucaoForm.obraId || null,
          descricao: execucaoForm.descricao || frenteSelecionadaReferencia?.nome || "",
          origem: "ORCAMENTO",
          status: "EM_ANDAMENTO",
          orcamentoOrigemId: execucaoForm.orcamentoId || null,
          frenteOrigemId: execucaoForm.frenteOrigemIds[0] || null,
          frenteOrigemIds: execucaoForm.frenteOrigemIds,
          frentes: []
        }
        : {
          clienteId: execucaoForm.clienteId || null,
          obraId: execucaoForm.obraId || null,
          descricao: execucaoForm.descricao || "",
          origem: "DIRETA",
          status: "EM_ANDAMENTO",
          frentes: execucaoForm.frenteNome || execucaoForm.unidade || execucaoForm.quantidade || execucaoForm.receita
            ? [
              {
                nome: execucaoForm.frenteNome || "",
                unidade: execucaoForm.quantidade ? execucaoForm.unidade : "",
                quantidadeExecutada: execucaoForm.quantidade ? Number(execucaoForm.quantidade) : null,
                receitaRealizada: execucaoForm.receita ? Number(execucaoForm.receita) : null,
                recursos: []
              }
              ]
            : []
        };
      const data = await fetchJson<{ item: Execucao }>("/api/execucoes", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setExecucaoForm(initialExecucaoForm());
      setCreateMode("DIRETA");
      setFrentesReferencia([]);
      setOrcamentosReferencia([]);
      setMessage("Execucao aberta.");
      await loadExecucoes(data.item.id);
      loadOptions().catch((err) => setOptionsError(err instanceof Error ? err.message : "Nao foi possivel recarregar clientes, obras e recursos."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel abrir a execucao.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveHeader(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const primeiraFrente = selected.frentes?.[0];
      const payload = {
        clienteId: headerForm.clienteId || null,
        obraId: headerForm.obraId || null,
        descricao: headerForm.descricao || "",
        origem: selected.origem || "DIRETA",
        status: selected.status,
        frentes: headerForm.frenteNome || headerForm.unidade || headerForm.quantidade || headerForm.receita || primeiraFrente?.id
          ? [
            {
              id: primeiraFrente?.id,
              nome: headerForm.frenteNome || "",
              unidade: headerForm.quantidade ? headerForm.unidade : "",
              quantidadeExecutada: headerForm.quantidade ? Number(headerForm.quantidade) : null,
              receitaRealizada: headerForm.receita ? Number(headerForm.receita) : null,
              recursos: []
            }
          ]
          : []
      };
      const data = await fetchJson<{ item: Execucao }>(`/api/execucoes/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      setExecucoes((current) => current.map((item) => (item.id === selected.id ? data.item : item)));
      setSelectedId(data.item.id);
      setHeaderForm(execucaoFormFromSelected(data.item));
      setEditingHeader(false);
      setMessage("Execucao atualizada.");
      await loadComparativo(data.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a execucao.");
    } finally {
      setLoading(false);
    }
  }

  function updateEncargo(index: number, patch: Partial<EncargoEconomicoExecucao>) {
    setEncargosForm((current) => ({
      ...current,
      encargos: current.encargos.map((encargo, currentIndex) =>
        currentIndex === index ? { ...encargo, ...patch } : encargo
      )
    }));
  }

  async function handleSaveEncargos(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const encargos = encargosForm.possuiEncargos
        ? encargosForm.encargos
          .filter((encargo) => encargo.tipo.trim() || encargo.descricao.trim())
          .map((encargo) => ({
            tipo: encargo.tipo,
            descricao: encargo.descricao,
            formaCalculo: encargo.formaCalculo,
            percentual: encargo.formaCalculo === "PERCENTUAL_SOBRE_RECEITA" && encargo.percentual !== "" ? Number(encargo.percentual) : undefined,
            valorInformado: encargo.formaCalculo === "VALOR_INFORMADO" && encargo.valorInformado !== "" ? Number(encargo.valorInformado) : undefined,
            observacao: encargo.observacao || null,
            origem: encargo.origem ?? "MANUAL"
          }))
        : [];
      const data = await fetchJson<{ item: Execucao }>(`/api/execucoes/${selected.id}/encargos`, {
        method: "PATCH",
        body: JSON.stringify({
          estadoEncargos: encargosForm.possuiEncargos ? "COM_ENCARGOS" : "SEM_ENCARGOS",
          encargos
        })
      });
      setExecucoes((current) => current.map((item) => (item.id === selected.id ? data.item : item)));
      setEncargosForm(encargosFormFromSelected(data.item));
      setMessage("Encargos economicos atualizados. Consolide a execucao para atualizar o resultado.");
      await loadComparativo(data.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar os encargos economicos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBoletim(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson<{ item: Boletim }>(`/api/execucoes/${selected.id}/boletins`, {
        method: "POST",
        body: JSON.stringify({
          dataBoletim: boletimForm.dataBoletim,
          observacoes: boletimForm.observacoes,
          recursos: []
        })
      });
      setBoletimForm(initialBoletimForm());
      setSelectedBoletimId(data.item.id);
      setMessage("Boletim aberto.");
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o boletim.");
    } finally {
      setLoading(false);
    }
  }

  function applyEquipamento(id: string) {
    const equipamento = equipamentos.find((item) => item.id === id);
    setRecursoForm((current) => ({
      ...current,
      equipamentoId: id,
      nomeSnapshot: equipamento ? `${equipamento.placaOuTag} - ${equipamento.descricao}` : current.nomeSnapshot,
      baseEconomica: equipamento?.unidadeEconomicaPadrao ?? current.baseEconomica,
      valorCusto: equipamento?.custoPadrao ? String(equipamento.custoPadrao) : current.valorCusto,
      unidadeCusto: equipamento?.unidadeEconomicaPadrao ? unidadeCustoFromBase(equipamento.unidadeEconomicaPadrao) : current.unidadeCusto
    }));
  }

  async function handleAddRecurso(event: FormEvent) {
    event.preventDefault();
    if (!selectedBoletim) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const quantidadeRealizada = Number(recursoForm.quantidadeRealizada);
      const quantidadeRecursos = Number(recursoForm.quantidadeRecursos || 1);
      const valorCusto = Number(recursoForm.valorCusto);
      const distanciaViagemKm = distanciaCicloKm(recursoForm);
      const unidadeQuantidadeOperacional = recursoForm.baseEconomica === "KM"
        ? "viagem"
        : recursoForm.unidadeRealizada;
      const snapshotTecnicoEconomico = {
        origem: recursoForm.equipamentoId ? "BIBLIOTECA_RECURSOS" : "RECURSO_PROVISORIO",
        baseEconomica: recursoForm.baseEconomica,
        valorCusto,
        custoUnitario: valorCusto,
        unidadeCusto: recursoForm.unidadeCusto,
        quantidadeOperacional: quantidadeRealizada,
        unidadeQuantidadeOperacional,
        distanciaViagemKm: recursoForm.baseEconomica === "KM" && distanciaViagemKm > 0 ? distanciaViagemKm : undefined,
        viagensTotais: recursoForm.baseEconomica === "KM" || recursoForm.baseEconomica === "VIAGEM" ? quantidadeRealizada : undefined,
        cargasTotais: recursoForm.baseEconomica === "CARGA" ? quantidadeRealizada : undefined,
        horasTotais: recursoForm.baseEconomica === "HORA" || recursoForm.unidadeRealizada.toLowerCase().startsWith("h") ? quantidadeRealizada : undefined,
        horasDia: recursoForm.baseEconomica === "DIA" ? optionalNumber(recursoForm.horasDia) ?? JORNADA_PADRAO_EXECUCAO_HORAS_DIA : undefined,
        mesesTotais: recursoForm.baseEconomica === "MES" ? quantidadeRealizada : undefined,
        metadados: {
          origem: recursoForm.equipamentoId ? "BIBLIOTECA_RECURSOS" : "RECURSO_PROVISORIO",
          origemCusto: recursoForm.equipamentoId && valorCusto > 0 ? "BIBLIOTECA_RECURSOS" : recursoForm.equipamentoId ? "PENDENTE_CADASTRO_MESTRE" : "RECURSO_PROVISORIO",
          valorCustoUtilizado: valorCusto,
          distanciaIdaKm: recursoForm.baseEconomica === "KM" ? optionalNumber(recursoForm.distanciaIdaKm) : undefined,
          distanciaVoltaKm: recursoForm.baseEconomica === "KM" ? optionalNumber(recursoForm.distanciaVoltaKm) : undefined,
          distanciaCicloKm: recursoForm.baseEconomica === "KM" && distanciaViagemKm > 0 ? distanciaViagemKm : undefined,
          jornadaPadraoOriginal: recursoForm.baseEconomica === "DIA" ? JORNADA_PADRAO_EXECUCAO_HORAS_DIA : undefined,
          jornadaUtilizada: recursoForm.baseEconomica === "DIA" ? optionalNumber(recursoForm.horasDia) ?? JORNADA_PADRAO_EXECUCAO_HORAS_DIA : undefined,
          origemJornada: recursoForm.baseEconomica === "DIA" && optionalNumber(recursoForm.horasDia) !== JORNADA_PADRAO_EXECUCAO_HORAS_DIA ? "PERSONALIZADA_EXECUCAO" : undefined
        }
      };
      await fetchJson(`/api/execucoes/boletins/${selectedBoletim.id}/recursos`, {
        method: "POST",
        body: JSON.stringify({
          frenteExecutadaId: recursoForm.frenteExecutadaId,
          recursoId: recursoForm.equipamentoId || null,
          nomeSnapshot: recursoForm.nomeSnapshot,
          quantidadeRealizada,
          unidadeRealizada: recursoForm.unidadeRealizada,
          quantidadeRecursos,
          origem: "MANUAL",
          snapshotTecnicoEconomico,
          observacao: recursoForm.observacao
        })
      });
      setRecursoForm(initialRecursoForm(selected?.frentes?.[0]?.id ?? ""));
      setMessage("Recurso registrado no boletim.");
      await refreshSelected(selected?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel adicionar o recurso.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFecharBoletim(id: string) {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/boletins/${id}/fechar`, { method: "POST" });
      setMessage("Boletim fechado e comparativo atualizado.");
      await refreshSelected(selected.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel fechar o boletim.";
      setError(message === "EXISTEM_RECURSOS_COM_CUSTO_PENDENTE" ? "Configure os custos pendentes antes de fechar o boletim." : message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExcluirBoletim(id: string) {
    if (!selected) return;
    const confirmed = window.confirm(
      "Excluir este boletim removera apenas a consolidacao deste dia. Os lancamentos operacionais originais continuarao preservados e poderao ser vinculados novamente."
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const currentExecucaoId = selected.id;
      await fetchJson(`/api/execucoes/boletins/${id}`, { method: "DELETE" });
      setMessage("Boletim excluido. Os lancamentos originais foram preservados e podem ser vinculados novamente.");
      setSelectedBoletimId("");
      await refreshSelected(currentExecucaoId);
      await loadFatos();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel excluir o boletim.";
      setError(message === "BOLETIM_FECHADO_NAO_PODE_SER_EXCLUIDO" ? "Boletim fechado nao pode ser excluido." : message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConsolidar() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson<{ item: Execucao }>(`/api/execucoes/${selected.id}/consolidar`, { method: "POST" });
      const resultadoAtualizado = extractRealizado(data.item);
      const pendentes = countPendingEconomicResources(data.item.boletins ?? []);
      setMessage(
        resultadoAtualizado.recursos.length > 0
          ? pendentes > 0
            ? `Execucao recalculada para conferencia. Existem ${pendentes} recurso(s) com configuracao economica pendente.`
            : "Execucao recalculada para conferencia."
          : pendentes > 0
            ? "Nenhum recurso economicamente completo participou do resultado. Configure os custos pendentes e consolide novamente."
            : "Execucao recalculada para conferencia sem recursos vinculados."
      );
      await refreshSelected(selected.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel consolidar.";
      setError(message === "EXISTEM_RECURSOS_COM_CUSTO_PENDENTE" ? "Configure os custos pendentes antes de consolidar a execucao." : message);
    } finally {
      setLoading(false);
    }
  }

  function handleAbrirRelatorio() {
    if (!selected) return;
    window.open(`/api/execucoes/${selected.id}/relatorio`, "_blank", "noopener,noreferrer");
  }

  async function handleVincularFatos() {
    const fatosParaVincular = selectedFatos.filter((id) => fatosVinculaveis.some((fato) => fato.id === id));
    if (!selected || !recursoForm.frenteExecutadaId || !fatosParaVincular.length) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson<{ items: RecursoBoletim[] }>(`/api/execucoes/${selected.id}/fatos/vincular`, {
        method: "POST",
        body: JSON.stringify({
          frenteExecutadaId: recursoForm.frenteExecutadaId,
          fatosIds: fatosParaVincular
        })
      });
      const nextBoletimId = data.items[0]?.boletimId ?? "";
      setMessage(`${data.items.length} fato(s) vinculado(s) aos boletins da execucao.`);
      setSelectedFatos([]);
      setFatosPanelOpen(false);
      await refreshSelected(selected.id);
      if (nextBoletimId) setSelectedBoletimId(nextBoletimId);
      await loadFatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel vincular os fatos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEconomicConfig(event: FormEvent) {
    event.preventDefault();
    if (!selected || !recursoEmEdicao) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson<{ item: RecursoBoletim }>(`/api/execucoes/boletins/recursos/${recursoEmEdicao.id}`, {
        method: "PUT",
        body: JSON.stringify({
          frenteExecutadaId: economicForm.frenteExecutadaId,
          recursoId: economicForm.recursoId || null,
          nomeSnapshot: economicForm.nomeSnapshot,
          quantidadeRealizada: Number(economicForm.quantidadeRealizada),
          unidadeRealizada: economicForm.unidadeRealizada,
          quantidadeRecursos: Number(economicForm.quantidadeRecursos || 1),
          origem: economicForm.origem,
          origemRegistroTipo: economicForm.origemRegistroTipo || null,
          origemRegistroId: economicForm.origemRegistroId || null,
          origemRegistroData: economicForm.origemRegistroData || null,
          editavel: economicForm.editavel,
          snapshotTecnicoEconomico: buildEconomicSnapshot(economicForm, recursoEmEdicao.snapshotTecnicoEconomico),
          observacao: economicForm.observacao
        })
      });
      setEditingRecursoId("");
      setMessage("Configuracao economica atualizada. Use Consolidar Execucao para recalcular o resultado ou feche o boletim.");
      await refreshSelected(selected.id);
      await loadFatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o custo do recurso.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDesvincularRecurso(id: string) {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/boletins/recursos/${id}`, { method: "DELETE" });
      setMessage("Fato desvinculado da execucao. O lancamento original foi preservado.");
      await refreshSelected(selected.id);
      await loadFatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel desvincular o fato.");
    } finally {
      setLoading(false);
    }
  }

  const primeiraFrenteComparativo = comparativo?.frentes[0];

  return (
    <div className="execucoes-page">
      <div className="execucoes-hero">
        <div>
          <span className="page-kicker">Execucao e Resultado</span>
          <h1 className="page-title">Boletim Diario de Producao</h1>
          <p>Consolide fatos realizados, execute o Nucleo e acompanhe Orçado x Realizado sem duplicar calculos.</p>
        </div>
        <div className="toolbar-actions">
          <button className="button-secondary" type="button" onClick={handleAbrirRelatorio} disabled={!selected || loading}>
            Gerar relatorio
          </button>
          <button className="button-primary" type="button" onClick={handleConsolidar} disabled={!selected || loading}>
            Consolidar Execucao
          </button>
        </div>
      </div>

        {message ? <div className="execucoes-alert is-success">{message}</div> : null}
        {error ? <div className="execucoes-alert is-error">{error}</div> : null}
        {optionsError ? <div className="execucoes-alert is-error">{optionsError}</div> : null}
        {referenciasError ? <div className="execucoes-alert is-error">{referenciasError}</div> : null}

      <section className="execucoes-grid">
        <aside className="execucoes-panel execucoes-list">
          <div className="execucoes-panel-heading">
            <span className="page-kicker">Lista</span>
            <strong>Execucoes</strong>
          </div>
          {execucoes.length ? (
            execucoes.map((execucao) => (
              <button
                key={execucao.id}
                className={`execucoes-list-item${selected?.id === execucao.id ? " is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedId(execucao.id);
                  setSelectedBoletimId("");
                  loadComparativo(execucao.id).catch(() => undefined);
                }}
              >
                <strong>{execucao.descricao || "Execucao sem descricao"}</strong>
                <span>{execucao.cliente?.nomeFantasia || execucao.cliente?.nome || "Cliente nao informado"}</span>
                <small>{execucao.status}</small>
              </button>
            ))
          ) : (
            <div className="empty-state">Nenhuma execucao aberta.</div>
          )}

          <form className="execucoes-create-form" onSubmit={handleCreateExecucao}>
            <span className="page-kicker">Nova execucao</span>
            <div className="execucoes-mode-switch" role="group" aria-label="Modo de criacao da execucao">
              <button
                type="button"
                className={createMode === "DIRETA" ? "is-active" : ""}
                onClick={() => {
                  setCreateMode("DIRETA");
                  setExecucaoForm(initialExecucaoForm());
                }}
              >
                Direta / sem orcamento
              </button>
              <button
                type="button"
                className={createMode === "ORCAMENTO" ? "is-active" : ""}
                onClick={() => {
                  setCreateMode("ORCAMENTO");
                  setExecucaoForm(initialExecucaoForm());
                }}
              >
                Vinculada a orcamento
              </button>
            </div>
            <SearchableSelect
              value={execucaoForm.clienteId}
              onChange={(value) => setExecucaoForm((current) => ({
                ...current,
                clienteId: value,
                obraId: "",
                orcamentoId: "",
                frenteOrigemId: "",
                frenteOrigemIds: []
              }))}
              options={clienteOptions}
              placeholder={optionsLoading ? "Carregando clientes..." : "Digite codigo ou nome do cliente"}
              emptyLabel="Nenhum cliente encontrado."
              disabled={optionsLoading}
            />
            <SearchableSelect
              value={execucaoForm.obraId}
              options={obraOptions}
              placeholder={execucaoForm.clienteId ? "Digite codigo ou nome da obra" : "Digite para buscar obra em todas as obras"}
              emptyLabel="Nenhuma obra encontrada."
              disabled={optionsLoading}
              onChange={(value) => {
                const obra = obras.find((item) => item.id === value);
                setExecucaoForm((current) => ({
                  ...current,
                  obraId: value,
                  clienteId: obra?.clienteId || current.clienteId,
                  orcamentoId: "",
                  frenteOrigemId: "",
                  frenteOrigemIds: []
                }));
              }}
            />
            {createMode === "ORCAMENTO" ? (
              <>
                <SearchableSelect
                  value={execucaoForm.orcamentoId}
                  options={orcamentoOptions}
                  placeholder={referenciasLoading ? "Carregando orcamentos..." : "Digite codigo ou titulo do orcamento"}
                  emptyLabel="Nenhum orcamento encontrado para cliente/obra."
                  disabled={referenciasLoading || !execucaoForm.obraId}
                  onChange={(value) => setExecucaoForm((current) => ({
                    ...current,
                    orcamentoId: value,
                    frenteOrigemId: "",
                    frenteOrigemIds: []
                  }))}
                />
                <div className="execucoes-reference-picker">
                  <span>Frentes do orcamento</span>
                  {referenciasLoading ? (
                    <small>Carregando frentes...</small>
                  ) : frentesReferencia.length ? (
                    frentesReferencia.map((frente) => {
                      const checked = execucaoForm.frenteOrigemIds.includes(frente.id);

                      return (
                        <label key={frente.id} className="execucoes-reference-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!execucaoForm.orcamentoId}
                            onChange={() => {
                              setExecucaoForm((current) => {
                                const nextIds = checked
                                  ? current.frenteOrigemIds.filter((id) => id !== frente.id)
                                  : [...current.frenteOrigemIds, frente.id];
                                const primeira = frentesReferencia.find((item) => item.id === nextIds[0]) ?? null;

                                return {
                                  ...current,
                                  frenteOrigemId: nextIds[0] ?? "",
                                  frenteOrigemIds: nextIds,
                                  descricao: primeira?.nome ?? current.descricao,
                                  frenteNome: primeira?.nome ?? current.frenteNome,
                                  unidade: primeira?.unidade ?? "",
                                  quantidade: primeira?.quantidadePrevista === null || primeira?.quantidadePrevista === undefined ? "" : String(primeira.quantidadePrevista),
                                  receita: primeira?.receitaPrevista === null || primeira?.receitaPrevista === undefined ? "" : String(primeira.receitaPrevista)
                                };
                              });
                            }}
                          />
                          <span>
                            <strong>Frente {frente.ordem || "-"} - {frente.nome}</strong>
                            <small>
                              {number(frente.quantidadePrevista)} {frente.unidade ?? ""}
                              {" | Receita prevista: "}
                              {money(frente.receitaPrevista ?? 0)}
                            </small>
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <small>Nenhuma frente encontrada neste orcamento.</small>
                  )}
                </div>
                {frentesSelecionadasReferencia.length ? (
                  <div className="execucoes-reference-preview">
                    <span>Referencias previstas que serao preservadas</span>
                    <strong>{frentesSelecionadasReferencia.length} frente(s) selecionada(s)</strong>
                    {frentesSelecionadasReferencia.map((frente) => (
                      <small key={frente.id}>
                        Frente {frente.ordem || "-"} - {frente.nome}: {number(frente.quantidadePrevista)} {frente.unidade ?? ""}
                        {" | Receita prevista: "}
                        {money(frente.receitaPrevista ?? 0)}
                      </small>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <input placeholder="Descricao da execucao (opcional)" value={execucaoForm.descricao} onChange={(event) => setExecucaoForm((current) => ({ ...current, descricao: event.target.value }))} />
                <input placeholder="Frente / servico (opcional)" value={execucaoForm.frenteNome} onChange={(event) => setExecucaoForm((current) => ({ ...current, frenteNome: event.target.value }))} />
                <div className="execucoes-inline">
                  <input placeholder="Quantidade (opcional)" type="number" step="0.0001" value={execucaoForm.quantidade} onChange={(event) => setExecucaoForm((current) => ({ ...current, quantidade: event.target.value, unidade: event.target.value ? current.unidade : "" }))} />
                  <select value={execucaoForm.unidade} onChange={(event) => setExecucaoForm((current) => ({ ...current, unidade: event.target.value }))} disabled={!execucaoForm.quantidade}>
                    <option value="">{execucaoForm.quantidade ? "Unidade" : "Sem quantidade"}</option>
                    {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
                  </select>
                </div>
                <input placeholder="Receita contratada (opcional)" type="number" step="0.01" value={execucaoForm.receita} onChange={(event) => setExecucaoForm((current) => ({ ...current, receita: event.target.value }))} />
              </>
            )}
            <button
              className="button-primary"
              type="submit"
              disabled={loading || (createMode === "ORCAMENTO" && (!execucaoForm.clienteId || !execucaoForm.obraId || !execucaoForm.orcamentoId || !execucaoForm.frenteOrigemIds.length))}
            >
              Abrir execucao
            </button>
          </form>
        </aside>

        <div className="execucoes-main">
          <section className="execucoes-panel">
            <div className="execucoes-panel-heading is-row">
              <div>
                <span className="page-kicker">Cabecalho</span>
                <strong>{selected?.descricao || "Execucao sem descricao"}</strong>
              </div>
              {selected ? (
                <button
                  className="button-secondary"
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setHeaderForm(execucaoFormFromSelected(selected));
                    setEditingHeader((current) => !current);
                  }}
                >
                  {editingHeader ? "Cancelar edicao" : "Editar execucao"}
                </button>
              ) : null}
            </div>
            {editingHeader && selected ? (
              <form className="execucoes-resource-form" onSubmit={handleSaveHeader}>
                <div className="execucoes-inline">
                  <SearchableSelect
                    value={headerForm.clienteId}
                    onChange={(value) => setHeaderForm((current) => ({ ...current, clienteId: value, obraId: "" }))}
                    options={clienteOptions}
                    placeholder={optionsLoading ? "Carregando clientes..." : "Digite codigo ou nome do cliente"}
                    emptyLabel="Nenhum cliente encontrado."
                    disabled={optionsLoading}
                  />
                  <SearchableSelect
                    value={headerForm.obraId}
                    options={headerObraOptions}
                    placeholder={headerForm.clienteId ? "Digite codigo ou nome da obra" : "Digite para buscar obra em todas as obras"}
                    emptyLabel="Nenhuma obra encontrada."
                    disabled={optionsLoading}
                    onChange={(value) => {
                      const obra = obras.find((item) => item.id === value);
                      setHeaderForm((current) => ({
                        ...current,
                        obraId: value,
                        clienteId: obra?.clienteId || current.clienteId
                      }));
                    }}
                  />
                </div>
                <input placeholder="Descricao da execucao (opcional)" value={headerForm.descricao} onChange={(event) => setHeaderForm((current) => ({ ...current, descricao: event.target.value }))} />
                <input placeholder="Frente / servico (opcional)" value={headerForm.frenteNome} onChange={(event) => setHeaderForm((current) => ({ ...current, frenteNome: event.target.value }))} />
                <div className="execucoes-inline">
                  <input placeholder="Quantidade executada (opcional)" type="number" step="0.0001" value={headerForm.quantidade} onChange={(event) => setHeaderForm((current) => ({ ...current, quantidade: event.target.value, unidade: event.target.value ? current.unidade : "" }))} />
                  <select value={headerForm.unidade} onChange={(event) => setHeaderForm((current) => ({ ...current, unidade: event.target.value }))} disabled={!headerForm.quantidade}>
                    <option value="">{headerForm.quantidade ? "Unidade" : "Sem quantidade"}</option>
                    {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
                  </select>
                </div>
                <input placeholder="Receita realizada / contratada (opcional)" type="number" step="0.01" value={headerForm.receita} onChange={(event) => setHeaderForm((current) => ({ ...current, receita: event.target.value }))} />
                <div className="execucoes-inline">
                  <button className="button-primary" type="submit" disabled={loading}>Salvar execucao</button>
                  <button className="button-secondary" type="button" disabled={loading} onClick={() => {
                    setHeaderForm(execucaoFormFromSelected(selected));
                    setEditingHeader(false);
                  }}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="execucoes-summary-grid">
                <Info label="Cliente" value={selected?.cliente?.nomeFantasia || selected?.cliente?.nome || "-"} />
                <Info label="Obra" value={selected?.obra?.nome || "-"} />
                <Info label="Servico / Frente" value={selected?.frentes?.map((frente) => frente.nome).filter(Boolean).join(", ") || "-"} />
                <Info label="Situacao" value={selected?.status || "-"} />
                <Info label="Receita realizada / contratada" value={money(totais.receita)} />
                <Info label="Quantidade do servico" value={possuiQuantidadeServico ? number(totais.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "") : "Nao informada"} />
                <Info label="Quantidade realizada consolidada" value={possuiQuantidadeServico ? number(primeiraFrenteComparativo?.quantidade.realizado ?? totais.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "") : "Nao informada"} />
              </div>
            )}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Encargos economicos</span>
              <strong>Composicao economica opcional</strong>
              <p>Encargos nao sao recursos operacionais. Eles afetam apenas o resultado economico da execucao.</p>
            </div>
            <form className="execucoes-resource-form" onSubmit={handleSaveEncargos}>
              <label className="execucoes-checkline">
                <input
                  type="checkbox"
                  checked={encargosForm.possuiEncargos}
                  disabled={!selected || loading}
                  onChange={(event) => setEncargosForm((current) => ({
                    possuiEncargos: event.target.checked,
                    encargos: current.encargos.length ? current.encargos : [newEncargo()]
                  }))}
                />
                Esta execucao possui encargos economicos?
              </label>
              {!encargosForm.possuiEncargos ? (
                <div className="execucoes-economics-note">
                  Sem encargos economicos. Este e um estado valido e nao gera pendencia.
                </div>
              ) : (
                <div className="execucoes-encargos-list">
                  {encargosForm.encargos.map((encargo, index) => (
                    <div className="execucoes-encargo-row" key={`${encargo.id ?? "novo"}-${index}`}>
                      <input
                        placeholder="Tipo do encargo"
                        value={encargo.tipo}
                        onChange={(event) => updateEncargo(index, { tipo: event.target.value })}
                        required
                      />
                      <input
                        placeholder="Descricao"
                        value={encargo.descricao}
                        onChange={(event) => updateEncargo(index, { descricao: event.target.value })}
                        required
                      />
                      <select
                        value={encargo.formaCalculo}
                        onChange={(event) => updateEncargo(index, {
                          formaCalculo: event.target.value as EncargoEconomicoExecucao["formaCalculo"],
                          percentual: "",
                          valorInformado: ""
                        })}
                      >
                        {formasCalculoEncargo.map((forma) => (
                          <option key={forma.value} value={forma.value}>{forma.label}</option>
                        ))}
                      </select>
                      {encargo.formaCalculo === "PERCENTUAL_SOBRE_RECEITA" ? (
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="% sobre receita"
                          value={encargo.percentual ?? ""}
                          onChange={(event) => updateEncargo(index, { percentual: event.target.value })}
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Valor informado"
                          value={encargo.valorInformado ?? ""}
                          onChange={(event) => updateEncargo(index, { valorInformado: event.target.value })}
                        />
                      )}
                      <input
                        placeholder="Observacao"
                        value={encargo.observacao ?? ""}
                        onChange={(event) => updateEncargo(index, { observacao: event.target.value })}
                      />
                      <button
                        className="button-secondary"
                        type="button"
                        disabled={loading}
                        onClick={() => setEncargosForm((current) => ({
                          ...current,
                          encargos: current.encargos.length > 1
                            ? current.encargos.filter((_, currentIndex) => currentIndex !== index)
                            : [newEncargo()]
                        }))}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={loading}
                    onClick={() => setEncargosForm((current) => ({
                      ...current,
                      encargos: [...current.encargos, newEncargo()]
                    }))}
                  >
                    Adicionar encargo
                  </button>
                </div>
              )}
              <button className="button-primary" type="submit" disabled={!selected || loading}>Salvar encargos</button>
            </form>
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading is-row">
              <div>
                <span className="page-kicker">Boletins</span>
                <strong>Consolidacao diaria</strong>
              </div>
              <form className="execucoes-new-boletim" onSubmit={handleCreateBoletim}>
                <input type="date" value={boletimForm.dataBoletim} onChange={(event) => setBoletimForm((current) => ({ ...current, dataBoletim: event.target.value }))} />
                <input placeholder="Observacoes" value={boletimForm.observacoes} onChange={(event) => setBoletimForm((current) => ({ ...current, observacoes: event.target.value }))} />
                <button className="button-primary" type="submit" disabled={!selected || loading}>Novo Boletim</button>
              </form>
            </div>
            <div className="execucoes-boletins">
              {boletins.map((boletim) => (
                <article key={boletim.id} className={`execucoes-boletim${selectedBoletim?.id === boletim.id ? " is-active" : ""}`}>
                  <button className="execucoes-boletim-main" type="button" onClick={() => setSelectedBoletimId(boletim.id)}>
                    <strong>{new Date(boletim.dataBoletim).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong>
                    <span>{boletim.status}</span>
                    <small>{boletim.recursos.length} recurso(s)</small>
                  </button>
                  {boletim.status === "ABERTO" ? (
                    <button className="button-secondary" type="button" disabled={loading} onClick={() => handleExcluirBoletim(boletim.id)}>
                      Excluir boletim
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
            {selectedBoletim?.status === "ABERTO" ? (
              <button className="button-secondary" type="button" disabled={loading} onClick={() => handleFecharBoletim(selectedBoletim.id)}>
                Fechar boletim selecionado
              </button>
            ) : null}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading is-row">
              <div>
                <span className="page-kicker">Lancamentos elegiveis</span>
                <strong>{fatosDisponiveis.length ? `${fatosDisponiveis.length} novo(s) lancamento(s) encontrado(s)` : "Nenhum novo lancamento elegivel"}</strong>
                <p>Mostra apenas fatos ainda nao vinculados a esta Execucao. Os fatos ja usados ficam nos boletins.</p>
              </div>
              <div className="section-row-actions">
                <button className="button-secondary" type="button" disabled={!selected || loading} onClick={() => loadFatos().catch((err) => setError(err instanceof Error ? err.message : "Falha ao buscar lancamentos elegiveis."))}>
                  Atualizar elegiveis
                </button>
                {fatosDisponiveis.length ? (
                  <button className="button-secondary" type="button" disabled={loading} onClick={() => setFatosPanelOpen((current) => !current)}>
                    {fatosPanelOpen ? "Ocultar" : "Visualizar"}
                  </button>
                ) : null}
              </div>
            </div>
            <div className="execucoes-resource-form">
              <div className="execucoes-inline">
                <input type="date" value={fatosFilter.dataInicio} onChange={(event) => setFatosFilter((current) => ({ ...current, dataInicio: event.target.value }))} />
                <input type="date" value={fatosFilter.dataFim} onChange={(event) => setFatosFilter((current) => ({ ...current, dataFim: event.target.value }))} />
              </div>
              <div className="execucoes-inline">
                <select value={fatosFilter.obraId} onChange={(event) => setFatosFilter((current) => ({ ...current, obraId: event.target.value }))}>
                  <option value="">Todas as obras</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ` : ""}{obra.nome}</option>
                  ))}
                </select>
                <select value={fatosFilter.recursoId} onChange={(event) => setFatosFilter((current) => ({ ...current, recursoId: event.target.value }))}>
                  <option value="">Todos os recursos</option>
                  {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.placaOuTag} - {equipamento.descricao}</option>)}
                </select>
              </div>
              <div className="execucoes-inline">
                <select value={recursoForm.frenteExecutadaId} onChange={(event) => setRecursoForm((current) => ({ ...current, frenteExecutadaId: event.target.value }))}>
                  {(selected?.frentes ?? []).map((frente) => <option key={frente.id} value={frente.id}>Destino: {frente.nome || "Frente sem descricao"}</option>)}
                </select>
                <button className="button-secondary" type="button" disabled={!fatosVinculaveis.length || loading} onClick={() => setSelectedFatos(fatosVinculaveis.map((fato) => fato.id))}>
                  Selecionar todos
                </button>
                <button className="button-secondary" type="button" disabled={!selectedFatos.length || loading} onClick={() => setSelectedFatos([])}>
                  Limpar selecao
                </button>
                <button className="button-primary" type="button" disabled={!selectedFatos.length || loading} onClick={handleVincularFatos}>
                  Vincular selecionados
                </button>
              </div>
            </div>
            {fatosDisponiveis.length ? (
              <div className="execucoes-economics-note">
                {fatosVinculaveis.length} lancamento(s) pronto(s) para vinculo.
                {fatosComBoletimFechado.length ? ` ${fatosComBoletimFechado.length} lancamento(s) pertencem a data com boletim fechado e exigem tratamento explicito.` : ""}
              </div>
            ) : (
              <div className="execucoes-economics-note">
                Todos os lancamentos encontrados ja foram vinculados, ou nao ha novos lancamentos elegiveis para os filtros atuais.
              </div>
            )}
            {fatosPanelOpen && fatosDisponiveis.length ? (
              <div className="data-table-wrap">
                <table className="data-table data-table-compact">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Origem</th>
                      <th>Recurso</th>
                      <th>Identificador</th>
                      <th>Qtd</th>
                      <th>Un</th>
                      <th>Material</th>
                      <th>Obra</th>
                      <th>Status</th>
                      <th>Selecionar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fatosDisponiveis.map((fato) => {
                      const boletimStatus = statusBoletimPorData.get(dateKey(fato.data));
                      const bloqueadoPorBoletimFechado = boletimStatus === "FECHADO";

                      return (
                        <tr key={fato.id}>
                          <td>{new Date(fato.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                          <td>{fato.origemLabel}</td>
                          <td>{fato.recurso}</td>
                          <td>{fato.identificadorRecurso}</td>
                          <td>{number(fato.quantidade)}</td>
                          <td>{fato.unidade}</td>
                          <td>{fato.materialDescricao ? `${fato.materialCodigo ? `${fato.materialCodigo} - ` : ""}${fato.materialDescricao}` : "-"}</td>
                          <td>{fato.obra}</td>
                          <td>{bloqueadoPorBoletimFechado ? "BOLETIM FECHADO" : fato.custoDisponivel ? "ELEGIVEL" : "ELEGIVEL / CUSTO PENDENTE"}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedFatos.includes(fato.id)}
                              disabled={bloqueadoPorBoletimFechado}
                              onChange={(event) => {
                                setSelectedFatos((current) => event.target.checked
                                  ? [...current, fato.id]
                                  : current.filter((id) => id !== fato.id));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Recursos do boletim</span>
              <strong>{selectedBoletim ? `Boletim ${new Date(selectedBoletim.dataBoletim).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : "Nenhum boletim selecionado"}</strong>
            </div>
            <div className="data-table-wrap">
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Recurso</th>
                    <th>Quantidade</th>
                    <th>Unidade</th>
                    <th>Material</th>
                    <th>Base</th>
                    <th>Custo</th>
                    <th>Custo realizado</th>
                    <th>Origem custo</th>
                    <th>Status economico</th>
                    <th>Observacoes</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBoletim?.recursos ?? []).map((recurso) => {
                    const resultadoRecurso = findResultadoRecurso(recurso, realizado.recursos);
                    const componentesResultado = (resultadoRecurso?.componentesEconomicos as Array<Record<string, unknown>> | undefined) ?? [];
                    const custoRealizadoLabel = custoRealizadoRecursoLabel(recurso, resultadoRecurso, Boolean(selected?.resultados?.length));
                    const detalheCusto = componentesResultado.map((item) =>
                      `${String(item.tipo ?? "COMPONENTE")}: ${String(item.statusCalculo ?? "") === "SEM_CUSTO" ? "Sem custo" : String(item.statusCalculo ?? "") === "PENDENTE" ? "Pendente" : money(toNumber(item.custoTotal))}`
                    ).join(" | ");
                    return (
                      <tr key={recurso.id}>
                        <td>{recurso.origem}{recurso.editavel === false ? " / Fato existente" : " / Manual"}</td>
                        <td title={recurso.origemRegistroTipo ? `${recurso.origemRegistroTipo} ${recurso.origemRegistroId}` : recurso.recursoId ?? undefined}>{recurso.nomeSnapshot}</td>
                        <td>{number(recurso.quantidadeRealizada)}</td>
                        <td>{recurso.unidadeRealizada}</td>
                        <td>{String(recurso.snapshotTecnicoEconomico?.materialDescricao ?? "-")}</td>
                        <td>{String(recurso.snapshotTecnicoEconomico?.baseEconomica ?? "-")}</td>
                        <td>{money(toNumber(recurso.snapshotTecnicoEconomico?.valorCusto))} {String(recurso.snapshotTecnicoEconomico?.unidadeCusto ?? "")}</td>
                        <td title={detalheCusto || undefined}>{custoRealizadoLabel}</td>
                        <td>{economicOriginLabel(recurso)}</td>
                        <td>{economicStatus(recurso)}{economicPendingReason(recurso) === "ok" ? "" : ` / ${economicPendingReason(recurso)}`}</td>
                        <td>{recurso.observacao || "-"}</td>
                        <td>
                          {selectedBoletim?.status === "ABERTO" ? (
                            <div className="execucoes-action-stack">
                              <button className="button-secondary" type="button" disabled={loading} onClick={() => setEditingRecursoId(recurso.id)}>
                                {economicStatus(recurso) === "CUSTO PENDENTE" ? "Configurar custo" : "Editar custo"}
                              </button>
                              <button className="button-secondary" type="button" disabled={loading} onClick={() => handleDesvincularRecurso(recurso.id)}>
                                Desvincular
                              </button>
                            </div>
                          ) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selectedBoletim?.status === "ABERTO" && recursoEmEdicao ? (
              <form className="execucoes-resource-form" onSubmit={handleSaveEconomicConfig}>
                <div className="execucoes-panel-heading">
                  <span className="page-kicker">Configuracao economica</span>
                  <strong>{recursoEmEdicao.nomeSnapshot}</strong>
                  <p>Configure apenas a base e o custo unitario. O custo realizado continua sendo calculado pelo Nucleo de Engenharia.</p>
                </div>
                <div className="execucoes-economics-summary">
                  <Info label="Recurso" value={economicForm.nomeSnapshot || "-"} />
                  <Info label="Quantidade realizada" value={number(economicForm.quantidadeRealizada, ` ${economicForm.unidadeRealizada}`)} />
                  {showMaterialFields ? <Info label="Material" value={[economicForm.materialCodigo, economicForm.materialDescricao].filter(Boolean).join(" - ") || "-"} /> : null}
                  <Info label="Origem do custo" value={isBibliotecaCost ? "Biblioteca" : "Personalizado na execucao"} />
                </div>
                {isBibliotecaCost ? (
                  <div className="execucoes-economics-origin">
                    <span>Valor da Biblioteca</span>
                    <strong>{economicForm.valorCusto ? `${money(toNumber(economicForm.valorCusto))} ${economicForm.unidadeCusto}` : "Nao cadastrado"}</strong>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() =>
                        setEconomicForm((current) => ({
                          ...current,
                          origemCusto: "PERSONALIZADO_EXECUCAO",
                          valorBibliotecaOriginal: current.valorBibliotecaOriginal || current.valorCusto
                        }))
                      }
                    >
                      Personalizar nesta execucao
                    </button>
                  </div>
                ) : null}
                <div className="execucoes-inline">
                  <label>
                    <span>Base economica</span>
                    <select
                      value={economicForm.baseEconomica}
                      disabled={isBibliotecaCost}
                      onChange={(event) => setEconomicForm((current) => ({ ...current, baseEconomica: event.target.value, unidadeCusto: unidadeCustoFromBase(event.target.value) }))}
                    >
                      {basesEconomicas.map((base) => <option key={base} value={base}>{baseEconomicaLabel(base)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Custo unitario</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Custo unitario"
                      value={economicForm.valorCusto}
                      disabled={isBibliotecaCost}
                      onChange={(event) => setEconomicForm((current) => ({ ...current, valorCusto: event.target.value }))}
                      required
                    />
                  </label>
                </div>
                <div className="execucoes-inline">
                  <label>
                    <span>Unidade economica</span>
                    <input
                      placeholder={unidadeCustoFromBase(economicForm.baseEconomica)}
                      value={economicForm.unidadeCusto}
                      disabled={isBibliotecaCost}
                      onChange={(event) => setEconomicForm((current) => ({ ...current, unidadeCusto: event.target.value }))}
                      required
                    />
                  </label>
                  <Info label="Valor utilizado" value={economicForm.valorCusto ? `${money(toNumber(economicForm.valorCusto))} ${economicForm.unidadeCusto}` : "Pendente"} />
                </div>
                {showMaterialFields ? (
                  <div className="execucoes-economics-dynamic">
                    <div className="execucoes-economics-note">
                      Componente MATERIAL: {[economicForm.materialCodigo, economicForm.materialDescricao, economicForm.materialUnidade].filter(Boolean).join(" - ")}
                    </div>
                    <div className="execucoes-inline">
                      <label>
                        <span>Quantidade do material</span>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder={economicForm.materialUnidade || "unidade"}
                          value={economicForm.materialQuantidade}
                          disabled={isBibliotecaCost}
                          onChange={(event) => setEconomicForm((current) => ({ ...current, materialQuantidade: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Base do material</span>
                        <select
                          value={economicForm.materialBaseEconomica}
                          disabled={isBibliotecaCost}
                          onChange={(event) => setEconomicForm((current) => ({
                            ...current,
                            materialBaseEconomica: event.target.value,
                            materialUnidadeCusto: unidadeCustoFromBase(event.target.value)
                          }))}
                        >
                          {basesEconomicas.map((base) => <option key={base} value={base}>{baseEconomicaLabel(base)}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="execucoes-inline">
                      <label>
                        <span>Custo unitario do material</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Custo unitario"
                          value={economicForm.materialValorCusto}
                          disabled={isBibliotecaCost}
                          onChange={(event) => setEconomicForm((current) => ({ ...current, materialValorCusto: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>Unidade economica do material</span>
                        <input
                          placeholder={unidadeCustoFromBase(economicForm.materialBaseEconomica)}
                          value={economicForm.materialUnidadeCusto}
                          disabled={isBibliotecaCost}
                          onChange={(event) => setEconomicForm((current) => ({ ...current, materialUnidadeCusto: event.target.value }))}
                        />
                      </label>
                    </div>
                    <div className="execucoes-economics-note">
                      Transporte e material sao enviados como componentes separados ao Nucleo. A tela nao calcula o custo realizado.
                    </div>
                  </div>
                ) : null}
                {showDistanceFields ? (
                  <div className="execucoes-economics-dynamic">
                    <div className="execucoes-inline">
                      <label>
                        <span>Distancia ida</span>
                        <input type="number" step="0.0001" placeholder="km" value={economicForm.distanciaIdaKm} onChange={(event) => setEconomicForm((current) => ({ ...current, distanciaIdaKm: event.target.value }))} />
                      </label>
                      <label>
                        <span>Distancia volta</span>
                        <input type="number" step="0.0001" placeholder="km" value={economicForm.distanciaVoltaKm} onChange={(event) => setEconomicForm((current) => ({ ...current, distanciaVoltaKm: event.target.value }))} />
                      </label>
                    </div>
                    <div className="execucoes-economics-summary">
                      <Info label="Cargas/viagens realizadas" value={number(economicForm.quantidadeRealizada, ` ${economicForm.unidadeRealizada}`)} />
                      <Info label="Distancia do ciclo" value={distanciaCiclo > 0 ? number(distanciaCiclo, " km") : "Informe ida e volta"} />
                    </div>
                  </div>
                ) : null}
                {showJornadaDiaria ? (
                  <div className="execucoes-economics-dynamic">
                    <div className="execucoes-inline">
                      <label>
                        <span>Jornada diaria</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder={`${JORNADA_PADRAO_EXECUCAO_HORAS_DIA} h/dia`}
                          value={economicForm.horasDia}
                          onChange={(event) => setEconomicForm((current) => ({ ...current, horasDia: event.target.value }))}
                        />
                      </label>
                      <Info
                        label="Origem da jornada"
                        value={toNumber(economicForm.horasDia) === JORNADA_PADRAO_EXECUCAO_HORAS_DIA ? "Padrao" : "Personalizada na execucao"}
                      />
                    </div>
                    <div className="execucoes-economics-summary">
                      <Info label="Quantidade realizada" value={number(economicForm.quantidadeRealizada, ` ${economicForm.unidadeRealizada}`)} />
                      <Info label="Custo unitario" value={economicForm.valorCusto ? `${money(toNumber(economicForm.valorCusto))}/dia` : "Pendente"} />
                      <Info
                        label="Custo realizado"
                        value={recursoEmEdicao
                          ? custoRealizadoRecursoLabel(recursoEmEdicao, resultadoRecursoEmEdicao, Boolean(selected?.resultados?.length))
                          : "Aguardando consolidacao"}
                      />
                    </div>
                    <div className="execucoes-economics-note">
                      A UI envia quantidade, unidade, custo diario e jornada diaria. O Nucleo interpreta e calcula o custo realizado.
                    </div>
                  </div>
                ) : null}
                {economicBase === "CARGA" || economicBase === "VIAGEM" ? (
                  <div className="execucoes-economics-note">
                    {economicBase === "CARGA" ? "Quantidade de cargas" : "Quantidade de viagens"}: {number(economicForm.quantidadeRealizada, ` ${economicForm.unidadeRealizada}`)}.
                  </div>
                ) : null}
                {economicBase === "HORA" ? (
                  <div className="execucoes-economics-note">
                    Base por hora: nenhum parametro adicional e necessario para o Motor.
                  </div>
                ) : null}
                {isPersonalizedCost ? (
                  <>
                    <input placeholder="Motivo da personalizacao" value={economicForm.motivoPersonalizacao} onChange={(event) => setEconomicForm((current) => ({ ...current, motivoPersonalizacao: event.target.value }))} />
                    <textarea placeholder="Observacoes" value={economicForm.observacao} onChange={(event) => setEconomicForm((current) => ({ ...current, observacao: event.target.value }))} />
                  </>
                ) : null}
                <div className="execucoes-inline">
                  <button className="button-primary" type="submit" disabled={loading}>Salvar custo</button>
                  <button className="button-secondary" type="button" disabled={loading} onClick={() => setEditingRecursoId("")}>Cancelar</button>
                </div>
              </form>
            ) : null}
            {selectedBoletim?.status === "ABERTO" ? (
              <form className="execucoes-resource-form" onSubmit={handleAddRecurso}>
                <div className="execucoes-panel-heading">
                  <span className="page-kicker">Recurso complementar</span>
                  <strong>Registrar recurso operacional complementar</strong>
                  <p>Use para recursos executados que nao vieram dos lancamentos. O custo continua sendo calculado pelo Nucleo.</p>
                </div>
                <select value={recursoForm.frenteExecutadaId} onChange={(event) => setRecursoForm((current) => ({ ...current, frenteExecutadaId: event.target.value }))} required>
                  {(selected?.frentes ?? []).map((frente) => <option key={frente.id} value={frente.id}>{frente.nome}</option>)}
                </select>
                <select value={recursoForm.equipamentoId} onChange={(event) => applyEquipamento(event.target.value)}>
                  <option value="">Recurso provisorio</option>
                  {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.placaOuTag} - {equipamento.descricao}</option>)}
                </select>
                <input placeholder="Nome do recurso" value={recursoForm.nomeSnapshot} onChange={(event) => setRecursoForm((current) => ({ ...current, nomeSnapshot: event.target.value }))} required />
                <div className="execucoes-inline">
                  <input type="number" step="0.0001" placeholder={recursoQuantidadeLabel} value={recursoForm.quantidadeRealizada} onChange={(event) => setRecursoForm((current) => ({ ...current, quantidadeRealizada: event.target.value }))} required />
                  <select value={recursoForm.unidadeRealizada} onChange={(event) => setRecursoForm((current) => ({ ...current, unidadeRealizada: event.target.value }))}>
                    {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
                  </select>
                </div>
                <div className="execucoes-inline">
                  <input type="number" step="0.0001" placeholder="Qtd recursos" value={recursoForm.quantidadeRecursos} onChange={(event) => setRecursoForm((current) => ({ ...current, quantidadeRecursos: event.target.value }))} />
                  <select
                    value={recursoForm.baseEconomica}
                    onChange={(event) => {
                      const base = event.target.value;
                      setRecursoForm((current) => ({
                        ...current,
                        baseEconomica: base,
                        unidadeRealizada: unidadeOperacionalPadraoPorBase(base, current.unidadeRealizada),
                        unidadeCusto: unidadeCustoFromBase(base)
                      }));
                    }}
                  >
                    {basesEconomicas.map((base) => <option key={base} value={base}>{baseEconomicaLabel(base)}</option>)}
                  </select>
                </div>
                <div className="execucoes-inline">
                  <input type="number" step="0.01" placeholder="Custo unitario" value={recursoForm.valorCusto} onChange={(event) => setRecursoForm((current) => ({ ...current, valorCusto: event.target.value }))} required />
                  <input placeholder="Unidade economica" value={recursoForm.unidadeCusto} onChange={(event) => setRecursoForm((current) => ({ ...current, unidadeCusto: event.target.value }))} required />
                </div>
                {showRecursoDistanceFields ? (
                  <div className="execucoes-economics-block">
                    <div className="execucoes-inline">
                      <label>
                        <span>Distancia ida (km)</span>
                        <input type="number" step="0.0001" placeholder="Km ida" value={recursoForm.distanciaIdaKm} onChange={(event) => setRecursoForm((current) => ({ ...current, distanciaIdaKm: event.target.value }))} />
                      </label>
                      <label>
                        <span>Distancia volta (km)</span>
                        <input type="number" step="0.0001" placeholder="Km volta" value={recursoForm.distanciaVoltaKm} onChange={(event) => setRecursoForm((current) => ({ ...current, distanciaVoltaKm: event.target.value }))} />
                      </label>
                    </div>
                    <div className="execucoes-economics-note">
                      Distancia do ciclo: {recursoDistanciaCiclo > 0 ? number(recursoDistanciaCiclo, " km") : "informe ida e volta"}
                    </div>
                  </div>
                ) : null}
                {showRecursoJornadaDiaria ? (
                  <label>
                    <span>Jornada diaria</span>
                    <input type="number" step="0.01" min="0" placeholder="8 h/dia" value={recursoForm.horasDia} onChange={(event) => setRecursoForm((current) => ({ ...current, horasDia: event.target.value }))} />
                  </label>
                ) : null}
                <textarea placeholder="Observacoes" value={recursoForm.observacao} onChange={(event) => setRecursoForm((current) => ({ ...current, observacao: event.target.value }))} />
                <button className="button-primary" type="submit" disabled={loading}>Adicionar recurso</button>
              </form>
            ) : null}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Resultado</span>
              <strong>{comparativo?.referenciaDisponivel ? "Comparativo Orcado x Realizado" : "Resultado realizado"}</strong>
            </div>
            {!comparativo?.referenciaDisponivel ? (
              <>
                <div className="empty-state">
                  Execucao sem referencia prevista. O resultado abaixo representa apenas o realizado consolidado pelos boletins.
                  {possuiBoletimAbertoComRecursos ? " Existem recursos em boletim aberto; use Consolidar Execucao para recalcular sem fechar, ou feche o boletim para homologar o dia." : ""}
                  {recursosPendentesEconomicos > 0 ? ` Resultado parcial - existem ${recursosPendentesEconomicos} recurso(s) com configuracao economica pendente.` : ""}
                </div>
                <div className="execucoes-comparison-grid">
                  <Info label="Quantidade realizada" value={possuiQuantidadeServico ? number(realizado.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "") : "Nao informada"} />
                  <Info label="Custo operacional" value={money(realizado.custo)} />
                  <Info label="Encargos economicos" value={money(realizado.encargos)} />
                  <Info label="Custo total da execucao" value={money(realizado.custoTotalExecucao)} />
                  <Info label="Receita realizada" value={money(realizado.receita)} />
                  <Info label="Resultado realizado" value={money(realizado.resultado)} />
                  <Info label="Margem realizada" value={realizado.margem === null ? "-" : number(realizado.margem, "%")} />
                  <Info label="Status encargos" value={realizado.statusEncargos.replaceAll("_", " ")} />
                </div>
                {realizado.encargosDetalhes.length ? (
                  <details className="execucoes-economics-note">
                    <summary>Composicao dos encargos</summary>
                    <ul>
                      {realizado.encargosDetalhes.map((encargo, index) => (
                        <li key={`${String(encargo.id ?? index)}-${index}`}>
                          {String(encargo.descricao ?? encargo.tipo ?? "Encargo")}: {money(toNumber(encargo.valorCalculado))} ({String(encargo.formaCalculo ?? "-")})
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                <div className="data-table-wrap">
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th>Qtd</th>
                        <th>Unidade</th>
                        <th>Base</th>
                        <th>Custo unit.</th>
                        <th>Custo total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realizado.recursos.map((recurso, index) => (
                        <tr key={`${String(recurso.id ?? index)}-${index}`}>
                          <td>{String(recurso.nomeTecnico ?? "-")}</td>
                          <td>{number(recurso.quantidadeOperacional as number)}</td>
                          <td>{String(recurso.unidadeQuantidadeOperacional ?? "-")}</td>
                          <td>{String(recurso.baseEconomica ?? "-")}</td>
                          <td>{money(toNumber(recurso.custoUnitario))}</td>
                          <td>{money(toNumber(recurso.custoTotal))}</td>
                          <td>{String(recurso.statusCalculo ?? "-")}</td>
                        </tr>
                      ))}
                      {!realizado.recursos.length ? (
                        <tr>
                          <td colSpan={7}>
                            {recursosPendentesEconomicos > 0
                              ? "Nenhum recurso economicamente completo participou do resultado. Configure os custos pendentes e consolide novamente."
                              : "Nenhum resultado consolidado ainda. Feche um boletim ou consolide a execucao."}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="execucoes-comparison-grid">
                  <Metric title="Quantidade" value={primeiraFrenteComparativo?.quantidade} suffix={primeiraFrenteComparativo?.unidade ? ` ${primeiraFrenteComparativo.unidade}` : ""} />
                  <Metric title="Receita" value={primeiraFrenteComparativo?.receita} moneyValue />
                  <Metric title="Custo" value={primeiraFrenteComparativo?.custo} moneyValue />
                  <Metric title="Resultado" value={primeiraFrenteComparativo?.resultado} moneyValue />
                  <Metric title="Margem" value={primeiraFrenteComparativo?.margem} suffix="%" />
                </div>
                <div className="data-table-wrap">
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th>Previsto</th>
                        <th>Realizado</th>
                        <th>Diferenca</th>
                        <th>Origem</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(primeiraFrenteComparativo?.recursos ?? []).map((recurso, index) => (
                        <tr key={`${recurso.recurso}-${index}`}>
                          <td>{recurso.recurso}</td>
                          <td>{money(recurso.custo.previsto)}</td>
                          <td>{money(recurso.custo.realizado)}</td>
                          <td>{money(recurso.custo.desvioAbsoluto)}</td>
                          <td>{recurso.origem.previsto ? "Previsto e realizado" : "Fato realizado"}</td>
                          <td>{recurso.status === "CORRESPONDENTE" ? "OK" : recurso.status.replaceAll("_", " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="execucoes-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ title, value, moneyValue = false, suffix = "" }: { title: string; value?: ComparativoValor; moneyValue?: boolean; suffix?: string }) {
  const format = (item: number | null | undefined) => (moneyValue ? money(item) : number(item, suffix));

  return (
    <div className="execucoes-metric">
      <span>{title}</span>
      <strong>{format(value?.realizado)}</strong>
      <small>Previsto: {format(value?.previsto)}</small>
      <small>Desvio: {format(value?.desvioAbsoluto)} / {number(value?.desvioPercentual, "%")}</small>
    </div>
  );
}
