import { OrigemReferenciaPrevistaExecucao, Prisma } from "@prisma/client";
import type { ResultadoNucleoEngenharia } from "@/lib/engineering-core";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";

type DbClientComparativo = {
  execucao: {
    findFirst: (args: Prisma.ExecucaoFindFirstArgs) => Promise<unknown>;
  };
  execucaoReferenciaPrevista: {
    upsert: (args: Prisma.ExecucaoReferenciaPrevistaUpsertArgs) => Promise<unknown>;
  };
};

type EconomiaUnidadeSnapshot = {
  id: string;
  economia: {
    receita: number;
    resultado: number;
    margemPercentual: number | null;
  };
};

type ResultadoSnapshotPersistido = {
  resultadoOperacionalJson: unknown;
  economiaJson?: unknown;
};

export type ReferenciaPrevistaExecucaoInput = {
  execucaoId: string;
  origem: OrigemReferenciaPrevistaExecucao;
  orcamentoOrigemId?: string | null;
  propostaOrigemId?: string | null;
  cenarioOrigemId?: string | null;
  frentesOrigem?: Array<{
    frenteOrigemId: string;
    frenteExecutadaId: string;
    nome?: string | null;
    ordem?: number | null;
  }>;
  resultadoPrevisto: ResultadoNucleoEngenharia;
};

export type StatusCorrespondenciaRecurso = "CORRESPONDENTE" | "SOMENTE_PREVISTO" | "SOMENTE_REALIZADO";

export type ComparativoValor = {
  previsto: number | null;
  realizado: number | null;
  desvioAbsoluto: number | null;
  desvioPercentual: number | null;
};

export type ComparativoRecursoExecucao = {
  status: StatusCorrespondenciaRecurso;
  recurso: string;
  referenciaTecnicaId: string | null;
  identidadeOperacionalComparativa: string | null;
  unidade: string | null;
  quantidade: ComparativoValor;
  custo: ComparativoValor;
  origem: {
    previsto: string | null;
    realizado: string | null;
  };
};

export type ComparativoFrenteExecucao = {
  frenteId: string;
  nome: string;
  unidade: string | null;
  quantidade: ComparativoValor;
  receita: ComparativoValor;
  custo: ComparativoValor;
  resultado: ComparativoValor;
  margem: ComparativoValor;
  recursos: ComparativoRecursoExecucao[];
  origem: {
    previsto: string;
    realizado: string;
  };
};

export type ComparativoExecucao = {
  execucaoId: string;
  referenciaDisponivel: boolean;
  motivo?: "EXECUCAO_SEM_REFERENCIA_PREVISTA" | "EXECUCAO_NAO_ENCONTRADA";
  origemPrevista?: {
    tipo: OrigemReferenciaPrevistaExecucao;
    orcamentoOrigemId?: string | null;
    propostaOrigemId?: string | null;
    cenarioOrigemId?: string | null;
  };
  frentes: ComparativoFrenteExecucao[];
};

type UnidadeComparavel = {
  id: string;
  nome: string;
  unidade: string | null;
  quantidade: number;
  receita: number;
  custo: number;
  resultado: number;
  margemPercentual: number | null;
  recursos: RecursoComparavel[];
};

type RecursoComparavel = {
  id: string;
  referenciaTecnicaId: string | null;
  identidadeOperacionalComparativa: string | null;
  nome: string;
  categoria: string | null;
  classeOperacional: string | null;
  componenteEconomico: string | null;
  baseEconomica: string | null;
  capacidadePorViagem: number;
  unidadeCapacidade: string | null;
  unidade: string | null;
  quantidade: number;
  custo: number;
  rastreabilidade: string[];
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number | null, precision = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function compararValor(previsto: number | null, realizado: number | null): ComparativoValor {
  const desvioAbsoluto = previsto !== null && realizado !== null ? realizado - previsto : null;
  const desvioPercentual = previsto !== null && realizado !== null && previsto !== 0
    ? ((realizado - previsto) / previsto) * 100
    : null;

  return {
    previsto,
    realizado,
    desvioAbsoluto: round(desvioAbsoluto),
    desvioPercentual: round(desvioPercentual)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUnit(value: unknown) {
  const unit = normalizeText(value);
  if (!unit) return "";
  if (unit.includes("carga")) return "carga";
  if (unit.includes("viagem")) return "viagem";
  if (unit.includes("hora") || unit === "h") return "hora";
  if (unit.includes("dia") || unit.includes("diaria")) return "dia";
  if (unit.includes("km")) return "km";
  if (unit.includes("m3")) return "m3";
  if (unit.includes("m2")) return "m2";
  if (unit.includes("mes")) return "mes";
  return unit;
}

function extrairResultadoOperacional(snapshot: ResultadoSnapshotPersistido) {
  if (!isRecord(snapshot.resultadoOperacionalJson)) return null;
  const maybeWrapped = snapshot.resultadoOperacionalJson.resultadoOperacional;
  return isRecord(maybeWrapped) ? maybeWrapped : snapshot.resultadoOperacionalJson;
}

function extrairEconomiaUnidades(snapshot: ResultadoSnapshotPersistido) {
  if (!isRecord(snapshot.economiaJson)) return new Map<string, EconomiaUnidadeSnapshot["economia"]>();
  const unidades = Array.isArray(snapshot.economiaJson.unidades) ? snapshot.economiaJson.unidades : [];

  return new Map(
    unidades
      .filter((unidade): unidade is EconomiaUnidadeSnapshot => isRecord(unidade) && typeof unidade.id === "string" && isRecord(unidade.economia))
      .map((unidade) => [unidade.id, unidade.economia])
  );
}

function transformarResultadoNucleoEmSnapshot(resultado: ResultadoNucleoEngenharia): ResultadoSnapshotPersistido {
  return {
    resultadoOperacionalJson: {
      resultadoOperacional: {
        contextoDeCalculo: resultado.contextoDeCalculo,
        consolidado: {
          custoOperacionalTotal: resultado.consolidado.custoOperacionalTotal,
          quantidadeTotal: resultado.consolidado.quantidadeTotal
        },
        unidades: resultado.unidades.map((unidade) => {
          const { economia: _economia, recursos, ...operacional } = unidade;
          return {
            ...operacional,
            recursos: recursos.map((recurso) => {
              const { memoriaCalculo: _memoriaCalculo, ...recursoOperacional } = recurso;
              return recursoOperacional;
            })
          };
        })
      }
    },
    economiaJson: {
      economia: resultado.consolidado.economia,
      unidades: resultado.unidades
        .filter((unidade) => Boolean(unidade.economia))
        .map((unidade) => ({
          id: unidade.id,
          economia: unidade.economia
        }))
    }
  };
}

function extrairUnidadesComparaveis(snapshot: ResultadoSnapshotPersistido) {
  const operacional = extrairResultadoOperacional(snapshot);
  const economiaUnidades = extrairEconomiaUnidades(snapshot);
  const unidades = isRecord(operacional) && Array.isArray(operacional.unidades) ? operacional.unidades : [];

  return unidades
    .filter((unidade): unidade is Record<string, unknown> => isRecord(unidade) && typeof unidade.id === "string")
    .map<UnidadeComparavel>((unidade) => {
      const economia = economiaUnidades.get(String(unidade.id));
      const recursos = Array.isArray(unidade.recursos) ? unidade.recursos : [];

      return {
        id: String(unidade.id),
        nome: String(unidade.nome ?? unidade.id),
        unidade: typeof unidade.unidade === "string" ? unidade.unidade : null,
        quantidade: toNumber(unidade.quantidade),
        receita: toNumber(economia?.receita),
        custo: toNumber(unidade.custoOperacionalTotal),
        resultado: toNumber(economia?.resultado),
        margemPercentual: economia?.margemPercentual ?? null,
        recursos: recursos
          .filter((recurso): recurso is Record<string, unknown> => isRecord(recurso) && typeof recurso.id === "string")
          .map(mapRecursoComparavel)
      };
    });
}

function resolveOperationalQuantity(recurso: Record<string, unknown>) {
  const baseEconomica = normalizeText(recurso.baseEconomica).toUpperCase();
  const unidade = normalizeUnit(recurso.unidadeQuantidadeOperacional);
  const quantidade = toNumber(recurso.quantidadeOperacional);
  const horasTotais = toNumber(recurso.horasTotais);
  const horasDia = toNumber(recurso.horasDia);
  const viagensOperacionais = toNumber(recurso.viagensOperacionais);
  const viagensTotais = toNumber(recurso.viagensTotais);
  const cargasTotais = toNumber(recurso.cargasTotais);
  const quilometrosTotais = toNumber(recurso.quilometrosTotais);
  const custoTotal = toNumber(recurso.custoTotal);
  const custoUnitario = toNumber(recurso.custoUnitario);
  const quantidadeRecursos = Math.max(1, toNumber(recurso.quantidadeRecursos));

  if (baseEconomica === "DIA" && unidade === "hora" && horasDia > 0) {
    return {
      quantidade: horasTotais > 0 ? horasTotais / horasDia : quantidade / horasDia,
      unidade: "dia"
    };
  }

  if (baseEconomica === "DIA" && unidade !== "dia" && custoTotal > 0 && custoUnitario > 0) {
    return {
      quantidade: custoTotal / custoUnitario / quantidadeRecursos,
      unidade: "dia"
    };
  }

  if (baseEconomica === "HORA" && unidade !== "hora" && custoTotal > 0 && custoUnitario > 0) {
    return {
      quantidade: custoTotal / custoUnitario / quantidadeRecursos,
      unidade: "hora"
    };
  }

  if (baseEconomica === "KM" && viagensOperacionais > 0) {
    return {
      quantidade: viagensOperacionais,
      unidade: "viagem"
    };
  }

  if (baseEconomica === "VIAGEM" && viagensTotais > 0) {
    return {
      quantidade: viagensTotais,
      unidade: "viagem"
    };
  }

  if (baseEconomica === "CARGA" && cargasTotais > 0) {
    return {
      quantidade: cargasTotais,
      unidade: "carga"
    };
  }

  if (baseEconomica === "KM" && quilometrosTotais > 0) {
    return {
      quantidade: quilometrosTotais,
      unidade: "km"
    };
  }

  return {
    quantidade,
    unidade: unidade || (typeof recurso.unidadeQuantidadeOperacional === "string" ? recurso.unidadeQuantidadeOperacional : null)
  };
}

function buildIdentidadeOperacionalComparativa(recurso: Record<string, unknown>) {
  const referenciaTecnicaId = typeof recurso.referenciaTecnicaId === "string" && recurso.referenciaTecnicaId.trim()
    ? recurso.referenciaTecnicaId.trim()
    : null;

  const componente = normalizeText(recurso.componenteEconomico);
  const categoria = normalizeText(recurso.categoria);
  const classe = normalizeText(recurso.classeOperacional);
  const base = normalizeText(recurso.baseEconomica);
  const capacidade = toNumber(recurso.capacidadePorViagem);
  const unidadeCapacidade = normalizeUnit(recurso.unidadeCapacidade);

  if (base === "km" && capacidade > 0 && unidadeCapacidade) {
    return [
      "funcao:transporte-km",
      `capacidade:${round(capacidade, 4)}`,
      `unidade-capacidade:${unidadeCapacidade}`
    ].join("|");
  }

  const partes = [
    componente ? `componente:${componente}` : null,
    categoria ? `categoria:${categoria}` : null,
    classe ? `classe:${classe}` : null,
    base ? `base:${base}` : null,
    capacidade > 0 ? `capacidade:${round(capacidade, 4)}` : null,
    unidadeCapacidade ? `unidade-capacidade:${unidadeCapacidade}` : null
  ].filter(Boolean);

  const hasSemanticRole = Boolean(classe || (componente && categoria) || (categoria && capacidade > 0 && unidadeCapacidade));
  if (hasSemanticRole && partes.length >= 2) return partes.join("|");

  return referenciaTecnicaId ? `referencia:${referenciaTecnicaId}` : null;
}

function mapRecursoComparavel(recurso: Record<string, unknown>): RecursoComparavel {
  const quantidadeComparavel = resolveOperationalQuantity(recurso);
  const id = String(recurso.id);
  const recursoRealizadoId = typeof recurso.recursoRealizadoId === "string" ? recurso.recursoRealizadoId : null;
  const recursoBoletimId = typeof recurso.recursoBoletimId === "string" ? recurso.recursoBoletimId : null;

  return {
    id,
    referenciaTecnicaId: typeof recurso.referenciaTecnicaId === "string" ? recurso.referenciaTecnicaId : null,
    identidadeOperacionalComparativa: buildIdentidadeOperacionalComparativa(recurso),
    nome: String(recurso.nomeTecnico ?? recurso.id),
    categoria: typeof recurso.categoria === "string" ? recurso.categoria : null,
    classeOperacional: typeof recurso.classeOperacional === "string" ? recurso.classeOperacional : null,
    componenteEconomico: typeof recurso.componenteEconomico === "string" ? recurso.componenteEconomico : null,
    baseEconomica: typeof recurso.baseEconomica === "string" ? recurso.baseEconomica : null,
    capacidadePorViagem: toNumber(recurso.capacidadePorViagem),
    unidadeCapacidade: typeof recurso.unidadeCapacidade === "string" ? recurso.unidadeCapacidade : null,
    unidade: quantidadeComparavel.unidade,
    quantidade: quantidadeComparavel.quantidade,
    custo: toNumber(recurso.custoTotal),
    rastreabilidade: [id, recursoRealizadoId, recursoBoletimId].filter((value): value is string => Boolean(value))
  };
}

function chaveRecursoSeguro(recurso: RecursoComparavel) {
  return recurso.identidadeOperacionalComparativa;
}

function consolidarRecursosPorChaveEstavel(recursos: RecursoComparavel[]) {
  const consolidados = new Map<string, RecursoComparavel>();
  const semChave: RecursoComparavel[] = [];

  for (const recurso of recursos) {
    const chave = chaveRecursoSeguro(recurso);
    if (!chave) {
      semChave.push(recurso);
      continue;
    }

    const atual = consolidados.get(chave);
    if (!atual) {
      consolidados.set(chave, { ...recurso });
      continue;
    }

    consolidados.set(chave, {
      ...atual,
      id: `${atual.id}+${recurso.id}`,
      quantidade: atual.quantidade + recurso.quantidade,
      custo: atual.custo + recurso.custo,
      unidade: atual.unidade ?? recurso.unidade,
      nome: atual.nome || recurso.nome,
      rastreabilidade: [...atual.rastreabilidade, ...recurso.rastreabilidade]
    });
  }

  return {
    comChave: [...consolidados.values()],
    semChave
  };
}

function compararRecursos(previstos: RecursoComparavel[], realizados: RecursoComparavel[]) {
  const previstosConsolidados = consolidarRecursosPorChaveEstavel(previstos);
  const realizadosConsolidados = consolidarRecursosPorChaveEstavel(realizados);
  const realizadosPorChave = new Map<string, RecursoComparavel>();
  const usados = new Set<string>();

  for (const realizado of realizadosConsolidados.comChave) {
    const chave = chaveRecursoSeguro(realizado);
    if (chave) realizadosPorChave.set(chave, realizado);
  }

  const comparados = previstosConsolidados.comChave.map<ComparativoRecursoExecucao>((previsto) => {
    const chave = chaveRecursoSeguro(previsto);
    const realizado = chave ? realizadosPorChave.get(chave) : null;

    if (!chave || !realizado) {
      return {
        status: "SOMENTE_PREVISTO",
        recurso: previsto.nome,
        referenciaTecnicaId: previsto.referenciaTecnicaId,
        identidadeOperacionalComparativa: previsto.identidadeOperacionalComparativa,
        unidade: previsto.unidade,
        quantidade: compararValor(previsto.quantidade, null),
        custo: compararValor(previsto.custo, null),
        origem: {
          previsto: previsto.id,
          realizado: null
        }
      };
    }

    usados.add(chave);
    return {
      status: "CORRESPONDENTE",
      recurso: previsto.nome,
      referenciaTecnicaId: previsto.referenciaTecnicaId,
      identidadeOperacionalComparativa: previsto.identidadeOperacionalComparativa,
      unidade: realizado.unidade ?? previsto.unidade,
      quantidade: compararValor(previsto.quantidade, realizado.quantidade),
      custo: compararValor(previsto.custo, realizado.custo),
      origem: {
        previsto: previsto.id,
        realizado: realizado.rastreabilidade.join(",")
      }
    };
  });

  const somenteRealizados = [
    ...realizadosConsolidados.comChave.filter((realizado) => {
      const chave = chaveRecursoSeguro(realizado);
      return chave ? !usados.has(chave) && realizadosPorChave.has(chave) : false;
    }),
    ...realizadosConsolidados.semChave
  ].map<ComparativoRecursoExecucao>((realizado) => ({
    status: "SOMENTE_REALIZADO",
    recurso: realizado.nome,
    referenciaTecnicaId: realizado.referenciaTecnicaId,
    identidadeOperacionalComparativa: realizado.identidadeOperacionalComparativa,
    unidade: realizado.unidade,
    quantidade: compararValor(null, realizado.quantidade),
    custo: compararValor(null, realizado.custo),
    origem: {
      previsto: null,
      realizado: realizado.id
    }
  }));

  const somentePrevistosSemChave = previstosConsolidados.semChave.map<ComparativoRecursoExecucao>((previsto) => ({
    status: "SOMENTE_PREVISTO",
    recurso: previsto.nome,
    referenciaTecnicaId: previsto.referenciaTecnicaId,
    identidadeOperacionalComparativa: previsto.identidadeOperacionalComparativa,
    unidade: previsto.unidade,
    quantidade: compararValor(previsto.quantidade, null),
    custo: compararValor(previsto.custo, null),
    origem: {
      previsto: previsto.id,
      realizado: null
    }
  }));

  return [...comparados, ...somentePrevistosSemChave, ...somenteRealizados];
}

export function gerarComparativoAPartirDeSnapshots(params: {
  execucaoId: string;
  referenciaPrevista: {
    origem: ComparativoExecucao["origemPrevista"];
    snapshot: ResultadoSnapshotPersistido;
  } | null;
  realizado: ResultadoSnapshotPersistido | null;
}): ComparativoExecucao {
  if (!params.referenciaPrevista) {
    return {
      execucaoId: params.execucaoId,
      referenciaDisponivel: false,
      motivo: "EXECUCAO_SEM_REFERENCIA_PREVISTA",
      frentes: []
    };
  }

  const previstas = extrairUnidadesComparaveis(params.referenciaPrevista.snapshot);
  const realizadas = extrairUnidadesComparaveis(params.realizado ?? { resultadoOperacionalJson: {} });
  const realizadasPorId = new Map(realizadas.map((unidade) => [unidade.id, unidade]));

  return {
    execucaoId: params.execucaoId,
    referenciaDisponivel: true,
    origemPrevista: params.referenciaPrevista.origem,
    frentes: previstas.map((prevista) => {
      const realizada = realizadasPorId.get(prevista.id);

      return {
        frenteId: prevista.id,
        nome: prevista.nome,
        unidade: realizada?.unidade ?? prevista.unidade,
        quantidade: compararValor(prevista.quantidade, realizada?.quantidade ?? null),
        receita: compararValor(prevista.receita, realizada?.receita ?? null),
        custo: compararValor(prevista.custo, realizada?.custo ?? null),
        resultado: compararValor(prevista.resultado, realizada?.resultado ?? null),
        margem: compararValor(prevista.margemPercentual, realizada?.margemPercentual ?? null),
        recursos: compararRecursos(prevista.recursos, realizada?.recursos ?? []),
        origem: {
          previsto: prevista.id,
          realizado: realizada?.id ?? ""
        }
      };
    })
  };
}

export function prepararReferenciaPrevistaExecucao(input: ReferenciaPrevistaExecucaoInput) {
  return {
    origem: input.origem,
    orcamentoOrigemId: input.orcamentoOrigemId ?? null,
    propostaOrigemId: input.propostaOrigemId ?? null,
    cenarioOrigemId: input.cenarioOrigemId ?? null,
    referenciaPrevistaJson: {
      origem: {
        tipo: input.origem,
        orcamentoOrigemId: input.orcamentoOrigemId ?? null,
        propostaOrigemId: input.propostaOrigemId ?? null,
        cenarioOrigemId: input.cenarioOrigemId ?? null,
        frentes: input.frentesOrigem ?? []
      },
      snapshot: transformarResultadoNucleoEmSnapshot(input.resultadoPrevisto)
    }
  };
}

export async function registrarReferenciaPrevistaExecucao(db: DbClientComparativo, input: ReferenciaPrevistaExecucaoInput) {
  const empresaId = requireActiveTenantEmpresaId();
  const data = prepararReferenciaPrevistaExecucao(input);

  return db.execucaoReferenciaPrevista.upsert({
    where: {
      execucaoId: input.execucaoId
    },
    create: {
      empresaId,
      execucaoId: input.execucaoId,
      ...data,
      referenciaPrevistaJson: data.referenciaPrevistaJson as Prisma.InputJsonValue
    },
    update: {
      ...data,
      referenciaPrevistaJson: data.referenciaPrevistaJson as Prisma.InputJsonValue
    }
  });
}

export async function buscarComparativoExecucao(db: DbClientComparativo, execucaoId: string) {
  const empresaId = requireActiveTenantEmpresaId();
  const execucao = await db.execucao.findFirst({
    where: {
      id: execucaoId,
      empresaId
    },
    include: {
      referenciaPrevista: true,
      resultados: {
        orderBy: [{ createdAt: "desc" }],
        take: 1
      }
    }
  }) as {
    id: string;
    referenciaPrevista?: {
      origem: OrigemReferenciaPrevistaExecucao;
      orcamentoOrigemId?: string | null;
      propostaOrigemId?: string | null;
      cenarioOrigemId?: string | null;
      referenciaPrevistaJson: unknown;
    } | null;
    resultados?: ResultadoSnapshotPersistido[];
  } | null;

  if (!execucao) {
    return {
      execucaoId,
      referenciaDisponivel: false,
      motivo: "EXECUCAO_NAO_ENCONTRADA",
      frentes: []
    } satisfies ComparativoExecucao;
  }

  if (!execucao.referenciaPrevista || !isRecord(execucao.referenciaPrevista.referenciaPrevistaJson)) {
    return gerarComparativoAPartirDeSnapshots({
      execucaoId,
      referenciaPrevista: null,
      realizado: execucao.resultados?.[0] ?? null
    });
  }

  const snapshot = execucao.referenciaPrevista.referenciaPrevistaJson.snapshot;

  return gerarComparativoAPartirDeSnapshots({
    execucaoId,
    referenciaPrevista: {
      origem: {
        tipo: execucao.referenciaPrevista.origem,
        orcamentoOrigemId: execucao.referenciaPrevista.orcamentoOrigemId ?? null,
        propostaOrigemId: execucao.referenciaPrevista.propostaOrigemId ?? null,
        cenarioOrigemId: execucao.referenciaPrevista.cenarioOrigemId ?? null
      },
      snapshot: isRecord(snapshot) ? (snapshot as ResultadoSnapshotPersistido) : { resultadoOperacionalJson: {} }
    },
    realizado: execucao.resultados?.[0] ?? null
  });
}
