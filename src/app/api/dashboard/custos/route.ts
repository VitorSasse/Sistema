import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyEnd, parseOptionalDateOnlyStart } from "@/lib/utils/date";

type PeriodPreset = "current_month" | "previous_month" | "last_3_months" | "current_year" | "custom";
type CategoriaCusto = "MANUTENCAO" | "COMBUSTIVEL" | "OPERACIONAL" | "ADMINISTRATIVO" | "NAO_INFORMADO";

const periodPresets = new Set<PeriodPreset>([
  "current_month",
  "previous_month",
  "last_3_months",
  "current_year",
  "custom"
]);

const categoryLabels: Record<CategoriaCusto, string> = {
  MANUTENCAO: "Manutencao",
  COMBUSTIVEL: "Combustivel",
  OPERACIONAL: "Operacional",
  ADMINISTRATIVO: "Administrativo",
  NAO_INFORMADO: "Categoria nao informada"
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateInput(value: string | null, endOfDay = false) {
  return endOfDay ? (value ? parseDateOnlyEnd(value) : null) : parseOptionalDateOnlyStart(value);
}

function parseIdList(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolvePeriod(searchParams: URLSearchParams) {
  const rawPreset = searchParams.get("period") as PeriodPreset | null;
  const preset = rawPreset && periodPresets.has(rawPreset) ? rawPreset : "current_month";
  const now = new Date();

  if (preset === "previous_month") {
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      preset,
      start: startOfMonth(previousMonth),
      end: endOfMonth(previousMonth),
      label: previousMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    };
  }

  if (preset === "last_3_months") {
    return {
      preset,
      start: startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
      end: endOfMonth(now),
      label: "Ultimos 3 meses"
    };
  }

  if (preset === "current_year") {
    return {
      preset,
      start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      label: String(now.getFullYear())
    };
  }

  if (preset === "custom") {
    const start = parseDateInput(searchParams.get("start"));
    const end = parseDateInput(searchParams.get("end"), true);
    if (!start || !end) return null;
    return {
      preset,
      start,
      end,
      label: `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`
    };
  }

  return {
    preset: "current_month" as const,
    start: startOfMonth(now),
    end: endOfMonth(now),
    label: now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  };
}

function resolvePreviousPeriod(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return {
    start: previousStart,
    end: previousEnd
  };
}

function resolveCategoria(params: {
  planoCategoria?: string | null;
  planoNome?: string | null;
  itemDescricao?: string | null;
  catalogoDescricao?: string | null;
}) {
  const source = normalizeText(
    [params.planoCategoria, params.planoNome, params.itemDescricao, params.catalogoDescricao]
      .filter(Boolean)
      .join(" ")
  );

  if (!source.trim()) return "NAO_INFORMADO" as CategoriaCusto;

  if (/(combust|diesel|s10|s500|arla|abastec|gasolina|etanol)/.test(source)) {
    return "COMBUSTIVEL" as CategoriaCusto;
  }

  if (/(manut|mecan|oficina|peca|pneu|lubrif|filtro|revis|oleo|corretiv|preventiv|borrach)/.test(source)) {
    return "MANUTENCAO" as CategoriaCusto;
  }

  if (/(admin|document|taxa|licenc|despesa geral|escritorio|contador|sistema)/.test(source)) {
    return "ADMINISTRATIVO" as CategoriaCusto;
  }

  return "OPERACIONAL" as CategoriaCusto;
}

function resolveSubcategoria(descricao: string, categoria: CategoriaCusto) {
  const source = normalizeText(descricao);

  if (/(diesel|s10|s500)/.test(source)) return "Diesel";
  if (/arla/.test(source)) return "Arla";
  if (/pneu|borrach/.test(source)) return "Pneus";
  if (/filtro/.test(source)) return "Filtros";
  if (/oleo|lubrif/.test(source)) return "Lubrificantes";
  if (/oficina|mecan|servic/.test(source)) return "Servico mecanico";
  if (/peca|rolamento|correia|mangueira|parafuso/.test(source)) return "Pecas";
  if (/taxa|document|licenc/.test(source)) return "Documentacao e taxas";

  return categoryLabels[categoria];
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function buildMonthKeys(start: Date, end: Date) {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const limit = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= limit) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}

function addToMap<T extends { total: number; count: number }>(
  map: Map<string, T>,
  key: string,
  seed: T,
  value: number
) {
  const current = map.get(key) ?? seed;
  current.total = Number((current.total + value).toFixed(2));
  current.count += 1;
  map.set(key, current);
  return current;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const period = resolvePeriod(request.nextUrl.searchParams);

  if (!period) {
    return NextResponse.json({ message: "Periodo personalizado invalido." }, { status: 400 });
  }

  if (period.end < period.start) {
    return NextResponse.json({ message: "O periodo final nao pode ser menor que o inicial." }, { status: 400 });
  }

  const fornecedorIds = parseIdList(request.nextUrl.searchParams.get("fornecedorIds"));
  const centroCustoIds = parseIdList(request.nextUrl.searchParams.get("centroCustoIds"));
  const equipamentoIds = parseIdList(request.nextUrl.searchParams.get("equipamentoIds"));
  const planoContaIds = parseIdList(request.nextUrl.searchParams.get("planoContaIds"));
  const clienteIds = parseIdList(request.nextUrl.searchParams.get("clienteIds"));
  const obraIds = parseIdList(request.nextUrl.searchParams.get("obraIds"));
  const categoriaFiltro = request.nextUrl.searchParams.get("categoria") as CategoriaCusto | "TODOS" | null;
  const tipoCompraFiltro = request.nextUrl.searchParams.get("tipoCompra") ?? "TODOS";

  const [
    fornecedores,
    centrosCusto,
    equipamentos,
    planosConta,
    clientes,
    obras,
    ordensPeriodo,
    ordensPeriodoAnterior
  ] = await Promise.all([
    prisma.fornecedor.findMany({
      select: { id: true, razaoSocial: true, nomeFantasia: true, status: true },
      orderBy: [{ razaoSocial: "asc" }]
    }),
    prisma.centroCustoCompra.findMany({
      select: { id: true, nome: true, status: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.equipamento.findMany({
      select: { id: true, placaOuTag: true, descricao: true, tipoRecurso: true, tipoControle: true, status: true },
      orderBy: [{ placaOuTag: "asc" }]
    }),
    prisma.planoConta.findMany({
      select: { id: true, classificacao: true, nome: true, categoria: true, status: true },
      orderBy: [{ classificacao: "asc" }]
    }),
    prisma.cliente.findMany({
      select: { id: true, codigo: true, nome: true, status: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.obra.findMany({
      select: { id: true, codigo: true, nome: true, clienteId: true, status: true },
      orderBy: [{ nome: "asc" }]
    }),
    prisma.ordemCompra.findMany({
      where: {
        dataEmissao: { gte: period.start, lte: period.end },
        excluidaEm: null,
        status: { not: "CANCELADA" }
      },
      include: {
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true, status: true } },
        centroCusto: { select: { id: true, nome: true } },
        planoConta: { select: { id: true, classificacao: true, nome: true, categoria: true } },
        centroCustoEquipamento: {
          select: { id: true, placaOuTag: true, descricao: true, tipoRecurso: true, tipoControle: true }
        },
        itens: {
          include: {
            catalogoCompra: { select: { id: true, descricao: true, tipo: true, unidadePadrao: true } }
          },
          orderBy: [{ createdAt: "asc" }]
        }
      },
      orderBy: [{ dataEmissao: "asc" }, { numeroOrdem: "asc" }]
    }),
    prisma.ordemCompra.findMany({
      where: {
        dataEmissao: { gte: resolvePreviousPeriod(period.start, period.end).start, lte: resolvePreviousPeriod(period.start, period.end).end },
        excluidaEm: null,
        status: { not: "CANCELADA" }
      },
      include: {
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true, status: true } },
        centroCusto: { select: { id: true, nome: true } },
        planoConta: { select: { id: true, classificacao: true, nome: true, categoria: true } },
        centroCustoEquipamento: {
          select: { id: true, placaOuTag: true, descricao: true, tipoRecurso: true, tipoControle: true }
        },
        itens: {
          include: {
            catalogoCompra: { select: { id: true, descricao: true, tipo: true, unidadePadrao: true } }
          }
        }
      }
    })
  ]);

  const selectedClientes = clientes.filter((item) => clienteIds.includes(item.id));
  const selectedObras = obras.filter((item) => obraIds.includes(item.id));

  function matchesOrderFilters(ordem: (typeof ordensPeriodo)[number] | (typeof ordensPeriodoAnterior)[number]) {
    if (fornecedorIds.length > 0 && !fornecedorIds.includes(ordem.fornecedorId)) return false;
    if (centroCustoIds.length > 0 && (!ordem.centroCustoId || !centroCustoIds.includes(ordem.centroCustoId))) return false;
    if (equipamentoIds.length > 0 && (!ordem.centroCustoEquipamentoId || !equipamentoIds.includes(ordem.centroCustoEquipamentoId))) return false;
    if (planoContaIds.length > 0 && (!ordem.planoContaId || !planoContaIds.includes(ordem.planoContaId))) return false;
    if (tipoCompraFiltro !== "TODOS" && ordem.tipoCompra !== tipoCompraFiltro) return false;

    const searchable = normalizeText(
      [
        ordem.centroCustoNome,
        ordem.observacao,
        ordem.observacaoFinanceira,
        ordem.itens.map((item) => item.descricao).join(" ")
      ].join(" ")
    );

    if (selectedClientes.length > 0) {
      const matchesCliente = selectedClientes.some((cliente) =>
        [cliente.codigo, cliente.nome].some((value) => searchable.includes(normalizeText(value)))
      );
      if (!matchesCliente) return false;
    }

    if (selectedObras.length > 0) {
      const matchesObra = selectedObras.some((obra) =>
        [obra.codigo, obra.nome].some((value) => searchable.includes(normalizeText(value)))
      );
      if (!matchesObra) return false;
    }

    return true;
  }

  function mapItems(ordens: typeof ordensPeriodo) {
    return ordens.filter(matchesOrderFilters).flatMap((ordem) => {
      const ordemItens = ordem.itens.length > 0 ? ordem.itens : [];

      return ordemItens.map((item) => {
        const categoria = resolveCategoria({
          planoCategoria: ordem.planoConta?.categoria,
          planoNome: ordem.planoConta?.nome,
          itemDescricao: item.descricao,
          catalogoDescricao: item.catalogoCompra?.descricao
        });
        const descricaoBase = [item.descricao, item.catalogoCompra?.descricao].filter(Boolean).join(" ");
        const subtotal = Number(item.subtotal ?? 0);

        return {
          ordemId: ordem.id,
          numeroOrdem: ordem.numeroOrdem,
          dataEmissao: ordem.dataEmissao,
          status: ordem.status,
          tipoCompra: ordem.tipoCompra,
          fornecedorId: ordem.fornecedor.id,
          fornecedorNome: ordem.fornecedor.nomeFantasia || ordem.fornecedor.razaoSocial,
          fornecedorStatus: ordem.fornecedor.status,
          centroCustoId: ordem.centroCustoId,
          centroCustoNome: ordem.centroCusto?.nome || ordem.centroCustoNome || "Centro de custo nao definido",
          equipamentoId: ordem.centroCustoEquipamento?.id ?? null,
          equipamentoNome: ordem.centroCustoEquipamento
            ? `${ordem.centroCustoEquipamento.placaOuTag} - ${ordem.centroCustoEquipamento.descricao}`
            : "Equipamento nao vinculado",
          equipamentoTipoControle: ordem.centroCustoEquipamento?.tipoControle ?? null,
          planoContaId: ordem.planoConta?.id ?? null,
          planoContaNome: ordem.planoConta
            ? `${ordem.planoConta.classificacao} - ${ordem.planoConta.nome}`
            : "Plano de conta nao informado",
          categoria,
          categoriaLabel: categoryLabels[categoria],
          subcategoria: resolveSubcategoria(descricaoBase, categoria),
          descricao: item.descricao || item.catalogoCompra?.descricao || "Item sem descricao",
          quantidade: Number(item.quantidade ?? 0),
          valorUnitario: Number(item.valorUnitario ?? 0),
          subtotal
        };
      });
    }).filter((item) => {
      if (categoriaFiltro && categoriaFiltro !== "TODOS" && item.categoria !== categoriaFiltro) return false;
      return true;
    });
  }

  const items = mapItems(ordensPeriodo);
  const previousItems = mapItems(ordensPeriodoAnterior as typeof ordensPeriodo);
  const totalCusto = Number(items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  const totalAnterior = Number(previousItems.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2));
  const variacaoPercentual = totalAnterior > 0 ? ((totalCusto - totalAnterior) / totalAnterior) * 100 : totalCusto > 0 ? 100 : 0;
  const monthKeys = buildMonthKeys(period.start, period.end);

  const byCategoria = new Map<CategoriaCusto, { categoria: CategoriaCusto; label: string; total: number; count: number }>();
  const byEquipamento = new Map<string, { id: string | null; nome: string; tipoControle: string | null; total: number; count: number; manutencao: number; combustivel: number; litrosDiesel: number; fornecedores: Set<string> }>();
  const byCentro = new Map<string, { id: string | null; nome: string; total: number; count: number; manutencao: number; combustivel: number; litrosDiesel: number }>();
  const byFornecedor = new Map<string, { id: string; nome: string; status: string; total: number; count: number }>();
  const byPlano = new Map<string, { id: string | null; nome: string; total: number; count: number }>();
  const byPareto = new Map<string, { motivo: string; categoria: CategoriaCusto; categoriaLabel: string; total: number; count: number }>();
  const byMonth = new Map(monthKeys.map((key) => [key, { key, label: monthLabelFromKey(key), total: 0, manutencao: 0, combustivel: 0, operacional: 0, administrativo: 0, count: 0 }]));

  for (const item of items) {
    addToMap(byCategoria, item.categoria, { categoria: item.categoria, label: item.categoriaLabel, total: 0, count: 0 }, item.subtotal);

    const equipamento = addToMap(
      byEquipamento,
      item.equipamentoId ?? "SEM_EQUIPAMENTO",
      {
        id: item.equipamentoId,
        nome: item.equipamentoNome,
        tipoControle: item.equipamentoTipoControle,
        total: 0,
        count: 0,
        manutencao: 0,
        combustivel: 0,
        litrosDiesel: 0,
        fornecedores: new Set<string>()
      },
      item.subtotal
    );
    equipamento.fornecedores.add(item.fornecedorNome);
    if (item.categoria === "MANUTENCAO") equipamento.manutencao += item.subtotal;
    if (item.categoria === "COMBUSTIVEL") {
      equipamento.combustivel += item.subtotal;
      if (item.subcategoria === "Diesel") equipamento.litrosDiesel += item.quantidade;
    }

    const centro = addToMap(
      byCentro,
      item.centroCustoId ?? item.centroCustoNome,
      { id: item.centroCustoId, nome: item.centroCustoNome, total: 0, count: 0, manutencao: 0, combustivel: 0, litrosDiesel: 0 },
      item.subtotal
    );
    if (item.categoria === "MANUTENCAO") centro.manutencao += item.subtotal;
    if (item.categoria === "COMBUSTIVEL") {
      centro.combustivel += item.subtotal;
      if (item.subcategoria === "Diesel") centro.litrosDiesel += item.quantidade;
    }
    addToMap(byFornecedor, item.fornecedorId, { id: item.fornecedorId, nome: item.fornecedorNome, status: item.fornecedorStatus, total: 0, count: 0 }, item.subtotal);
    addToMap(byPlano, item.planoContaId ?? item.planoContaNome, { id: item.planoContaId, nome: item.planoContaNome, total: 0, count: 0 }, item.subtotal);
    addToMap(byPareto, item.subcategoria, { motivo: item.subcategoria, categoria: item.categoria, categoriaLabel: item.categoriaLabel, total: 0, count: 0 }, item.subtotal);

    const currentMonth = byMonth.get(monthKey(item.dataEmissao));
    if (currentMonth) {
      currentMonth.total = Number((currentMonth.total + item.subtotal).toFixed(2));
      currentMonth.count += 1;
      if (item.categoria === "MANUTENCAO") currentMonth.manutencao += item.subtotal;
      if (item.categoria === "COMBUSTIVEL") currentMonth.combustivel += item.subtotal;
      if (item.categoria === "OPERACIONAL") currentMonth.operacional += item.subtotal;
      if (item.categoria === "ADMINISTRATIVO") currentMonth.administrativo += item.subtotal;
    }
  }

  const equipamentoIdsComCusto = Array.from(byEquipamento.values()).map((item) => item.id).filter(Boolean) as string[];
  const lancamentosOperacionais = equipamentoIdsComCusto.length
    ? await prisma.lancamentoDiario.findMany({
        where: {
          deletedAt: null,
          equipamentoId: { in: equipamentoIdsComCusto },
          data: { gte: period.start, lte: period.end },
          statusValidacao: { not: "CANCELADO" }
        },
        select: {
          equipamentoId: true,
          unidadeApontada: true,
          quantidadeApontada: true
        }
      })
    : [];

  const operacaoByEquipamento = new Map<string, { horas: number; cargas: number; registros: number }>();
  for (const lancamento of lancamentosOperacionais) {
    const current = operacaoByEquipamento.get(lancamento.equipamentoId) ?? { horas: 0, cargas: 0, registros: 0 };
    const quantidade = Number(lancamento.quantidadeApontada ?? 0);
    if (lancamento.unidadeApontada === "HORA") current.horas += quantidade;
    if (lancamento.unidadeApontada === "CARGA") current.cargas += quantidade;
    current.registros += 1;
    operacaoByEquipamento.set(lancamento.equipamentoId, current);
  }

  const rankingEquipamentos = Array.from(byEquipamento.values())
    .map((item) => {
      const operacao = item.id ? operacaoByEquipamento.get(item.id) : null;
      const horasReferencia = operacao?.horas ?? 0;
      return {
        equipamentoId: item.id,
        nome: item.nome,
        tipoControle: item.tipoControle,
        total: Number(item.total.toFixed(2)),
        manutencao: Number(item.manutencao.toFixed(2)),
        combustivel: Number(item.combustivel.toFixed(2)),
        litrosDiesel: Number(item.litrosDiesel.toFixed(2)),
        ordens: item.count,
        fornecedores: Array.from(item.fornecedores).slice(0, 5),
        horasReferencia: Number(horasReferencia.toFixed(2)),
        cargasReferencia: Number((operacao?.cargas ?? 0).toFixed(2)),
        custoPorHora: horasReferencia > 0 ? Number((item.total / horasReferencia).toFixed(2)) : null
      };
    })
    .sort((a, b) => b.total - a.total);
  const rankingEquipamentosComVinculo = rankingEquipamentos.filter((item) => item.equipamentoId);
  const custosSemEquipamento = rankingEquipamentos.find((item) => !item.equipamentoId)?.total ?? 0;
  const totalCustoEquipamentosVinculados = Number(
    rankingEquipamentosComVinculo.reduce((acc, item) => acc + item.total, 0).toFixed(2)
  );

  const categoriaRows = Array.from(byCategoria.values())
    .map((item) => ({ ...item, total: Number(item.total.toFixed(2)), sharePercent: totalCusto > 0 ? (item.total / totalCusto) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
  const equipamentoMaisCaro = rankingEquipamentosComVinculo[0] ?? null;
  const rankingFornecedores = Array.from(byFornecedor.values()).map((item) => ({ ...item, total: Number(item.total.toFixed(2)), sharePercent: totalCusto > 0 ? (item.total / totalCusto) * 100 : 0 })).sort((a, b) => b.total - a.total);
  const rankingCentros = Array.from(byCentro.values()).map((item) => ({
    ...item,
    total: Number(item.total.toFixed(2)),
    manutencao: Number(item.manutencao.toFixed(2)),
    combustivel: Number(item.combustivel.toFixed(2)),
    litrosDiesel: Number(item.litrosDiesel.toFixed(2)),
    sharePercent: totalCusto > 0 ? (item.total / totalCusto) * 100 : 0
  })).sort((a, b) => b.total - a.total);
  const rankingPlanos = Array.from(byPlano.values()).map((item) => ({ ...item, total: Number(item.total.toFixed(2)), sharePercent: totalCusto > 0 ? (item.total / totalCusto) * 100 : 0 })).sort((a, b) => b.total - a.total);
  let paretoAcumulado = 0;
  const pareto = Array.from(byPareto.values())
    .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .map((item) => {
      paretoAcumulado += item.total;
      return {
        ...item,
        sharePercent: totalCusto > 0 ? (item.total / totalCusto) * 100 : 0,
        cumulativePercent: totalCusto > 0 ? (paretoAcumulado / totalCusto) * 100 : 0
      };
    });

  return NextResponse.json({
    period: {
      preset: period.preset,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      label: period.label
    },
    filters: {
      fornecedorIds,
      centroCustoIds,
      equipamentoIds,
      planoContaIds,
      clienteIds,
      obraIds,
      categoria: categoriaFiltro ?? "TODOS",
      tipoCompra: tipoCompraFiltro,
      fornecedores: fornecedores.map((item) => ({ id: item.id, label: item.nomeFantasia || item.razaoSocial, status: item.status })),
      centrosCusto: centrosCusto.map((item) => ({ id: item.id, label: item.nome, status: item.status })),
      equipamentos: equipamentos.map((item) => ({ id: item.id, label: `${item.placaOuTag} - ${item.descricao}`, tipoRecurso: item.tipoRecurso, status: item.status })),
      planosConta: planosConta.map((item) => ({ id: item.id, label: `${item.classificacao} - ${item.nome}`, categoria: item.categoria, status: item.status })),
      clientes: clientes.map((item) => ({ id: item.id, label: `${item.codigo} - ${item.nome}`, status: item.status })),
      obras: obras.map((item) => ({ id: item.id, clienteId: item.clienteId, label: `${item.codigo} - ${item.nome}`, status: item.status }))
    },
    summary: {
      totalCusto,
      totalAnterior,
      variacaoPercentual,
      totalManutencao: categoriaRows.find((item) => item.categoria === "MANUTENCAO")?.total ?? 0,
      totalCombustivel: categoriaRows.find((item) => item.categoria === "COMBUSTIVEL")?.total ?? 0,
      custoMedioPorEquipamento:
        rankingEquipamentosComVinculo.length > 0
          ? Number((totalCustoEquipamentosVinculados / rankingEquipamentosComVinculo.length).toFixed(2))
          : 0,
      custoSemEquipamento: Number(custosSemEquipamento.toFixed(2)),
      totalEquipamentosVinculados: rankingEquipamentosComVinculo.length,
      totalOrdens: new Set(items.map((item) => item.ordemId)).size,
      totalItens: items.length,
      equipamentoMaisCaro: equipamentoMaisCaro ? { nome: equipamentoMaisCaro.nome, total: equipamentoMaisCaro.total } : null,
      fornecedorPrincipal: rankingFornecedores[0] ? { nome: rankingFornecedores[0].nome, total: rankingFornecedores[0].total } : null,
      centroCustoPrincipal: rankingCentros[0] ? { nome: rankingCentros[0].nome, total: rankingCentros[0].total } : null
    },
    charts: {
      categorias: categoriaRows,
      equipamentos: rankingEquipamentosComVinculo,
      centrosCusto: rankingCentros,
      fornecedores: rankingFornecedores,
      planosConta: rankingPlanos,
      mensal: Array.from(byMonth.values()).map((item) => ({
        ...item,
        total: Number(item.total.toFixed(2)),
        manutencao: Number(item.manutencao.toFixed(2)),
        combustivel: Number(item.combustivel.toFixed(2)),
        operacional: Number(item.operacional.toFixed(2)),
        administrativo: Number(item.administrativo.toFixed(2))
      })),
      pareto
    },
    details: items
  });
}
