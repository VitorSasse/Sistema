import { renderToBuffer } from "@react-pdf/renderer";
import type { Prisma, PrismaClient } from "@prisma/client";
import { buildEmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";
import { OrcamentoPdfDocument } from "@/server/pdf/orcamento-pdf";
import {
  montarFrentesComerciais,
  resolverValorGlobalProposta,
  selecionarItensComerciais
} from "@/server/pdf/orcamento-proposta";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";
import { buscarOrcamento } from "@/server/services/orcamentos/service";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ModoDocumentoProposta = "PREVIEW" | "OFICIAL";

type RenderOrcamentoPropostaPdfParams = {
  db: DbClient;
  orcamentoId: string;
  empresaId: string;
  propostaId?: string | null;
  modo: ModoDocumentoProposta;
  dataDocumento?: Date;
};

function normalizeFileSegment(value: string, maxLength = 42) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized.slice(0, maxLength) || "ORCAMENTO";
}

export function buildOrcamentoPropostaFileName({
  codigoOrcamento,
  codigoProposta,
  revisao,
  clienteNome
}: {
  codigoOrcamento: string;
  codigoProposta: string;
  revisao: number;
  clienteNome?: string | null;
}) {
  const orcamentoSegment = normalizeFileSegment(codigoOrcamento, 24);
  const propostaSegment = normalizeFileSegment(codigoProposta, 24);
  const revisaoSegment = String(Math.max(0, Math.trunc(revisao))).padStart(2, "0");
  const clienteSegment = normalizeFileSegment(clienteNome ?? "CLIENTE", 36);

  return `${orcamentoSegment}_${propostaSegment}_REV-${revisaoSegment}_${clienteSegment}.pdf`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function mapSnapshotFrentes(snapshot: Record<string, unknown>) {
  const frentes = Array.isArray(snapshot.frentes) ? snapshot.frentes : [];

  return frentes.filter(isRecord).map((frente, index) => ({
    ordem: asNumber(frente.ordem, index + 1),
    tempId: asNullableString(frente.tempId),
    natureza: asString(frente.natureza, "OPERACIONAL"),
    nome: asString(frente.nome, `Frente ${index + 1}`),
    descricao: asNullableString(frente.descricao),
    metodoExecutivo: asNullableString(frente.metodoExecutivo),
    unidadeProducao: asNullableString(frente.unidadeProducao),
    quantidadePrevista: asNumber(frente.quantidadePrevista, 0) || null,
    produtividadeDia: asNumber(frente.produtividadeDia, 0) || null,
    prazoEstimadoDias: asNumber(frente.prazoEstimadoDias, 0) || null,
    observacao: asNullableString(frente.observacao)
  }));
}

function mapSnapshotItens(snapshot: Record<string, unknown>) {
  const frentes = Array.isArray(snapshot.frentes) ? snapshot.frentes.filter(isRecord) : [];
  const frenteNomeByTempId = new Map(
    frentes
      .map((frente) => [asString(frente.tempId), asString(frente.nome)] as const)
      .filter(([tempId]) => Boolean(tempId))
  );
  const frenteNomeByOrdem = new Map(
    frentes.map((frente, index) => [
      asNumber(frente.ordem, index + 1),
      asString(frente.nome)
    ] as const)
  );
  const itens = Array.isArray(snapshot.itens) ? snapshot.itens : [];
  const opcionais = Array.isArray(snapshot.opcionais) ? snapshot.opcionais : [];
  const itensBase = itens.filter(isRecord).map((item, index) => {
    const quantidade = asNumber(item.quantidade);
    const valorUnitario = asNumber(item.valorUnitario);
    const origemItemComercial = asString(item.origemItemComercial);
    const descricaoManual = asString(item.descricaoManualComercial);
    const descricaoBase =
      origemItemComercial === "MANUAL" && descricaoManual
        ? descricaoManual
        : asString(item.descricao, "Item sem descricao");

    return {
      ordem: asNumber(item.ordem, index + 1),
      frenteNome:
        frenteNomeByTempId.get(asString(item.frenteTempId)) ??
        frenteNomeByOrdem.get(asNumber(item.frenteOrdem, 0)) ??
        null,
      frenteTempId: asNullableString(item.frenteTempId),
      tipoItem: asString(item.tipoItem, "OUTRO"),
      codigo: asNullableString(item.codigo),
      descricao: getItemPdfDescription({
        codigo: asNullableString(item.codigo),
        descricao: descricaoBase
      }),
      unidade: asString(item.unidade, "-"),
      quantidade,
      valorUnitario,
      valorTotal: asNumber(item.valorTotal, quantidade * valorUnitario)
    };
  });
  const itensOpcionais = opcionais.filter(isRecord).map((opcional, index) => {
    const quantidade = asNumber(opcional.quantidade);
    const valorUnitario = asNumber(opcional.valorUnitario);

    return {
      ordem: asNumber(opcional.ordem, index + 1),
      frenteNome: "Opcional",
      frenteTempId: null,
      tipoItem: "OUTRO",
      codigo: asNullableString(opcional.codigo),
      descricao: asString(opcional.descricao, "Opcional sem descricao"),
      unidade: asString(opcional.unidade, "-"),
      quantidade,
      valorUnitario,
      valorTotal: asNumber(opcional.valorTotal, quantidade * valorUnitario)
    };
  });

  return [...itensBase, ...itensOpcionais];
}

function getItemPdfDescription(item: { codigo?: string | null; descricao: string }) {
  const codigo = item.codigo?.trim();
  return codigo ? `Codigo: ${codigo}\n${item.descricao}` : item.descricao;
}

function mapSnapshotPremissas(snapshot: Record<string, unknown>) {
  const premissas = Array.isArray(snapshot.premissasGerais) ? snapshot.premissasGerais : [];
  const opcionais = Array.isArray(snapshot.opcionais) ? snapshot.opcionais : [];
  const premissasGerais = premissas.filter(isRecord).map((premissa, index) => ({
    tipo: asString(premissa.tipo, "PREMISSA"),
    ordem: asNumber(premissa.ordem, index + 1),
    titulo: asNullableString(premissa.titulo),
    descricao: asString(premissa.descricao)
  }));
  const condicoesOpcionais = opcionais
    .filter(isRecord)
    .filter((opcional) => asString(opcional.condicoes).trim())
    .map((opcional, index) => ({
      tipo: "CONDICAO",
      ordem: 900 + asNumber(opcional.ordem, index + 1),
      titulo: `Opcional - ${asString(opcional.descricao, "Item")}`,
      descricao: asString(opcional.condicoes)
    }));

  return [...premissasGerais, ...condicoesOpcionais];
}

function getSnapshotTotals(snapshot: Record<string, unknown>) {
  const totals = isRecord(snapshot.totals) ? snapshot.totals : null;

  if (!totals) {
    return null;
  }

  return {
    valorSubtotal: asNumber(totals.valorSubtotal),
    valorDesconto: asNumber(totals.valorDesconto),
    valorAcrescimo: asNumber(totals.valorAcrescimo),
    valorTotal: asNumber(totals.valorTotal)
  };
}

function asModoExibicaoValoresPdf(value: unknown) {
  return value === "SUBTOTAL_POR_FRENTE" || value === "DETALHADO_POR_ITEM_E_FRENTE"
    ? value
    : "SOMENTE_TOTAL_GLOBAL";
}

export async function renderOrcamentoPropostaPdf({
  db,
  orcamentoId,
  empresaId,
  propostaId,
  modo,
  dataDocumento
}: RenderOrcamentoPropostaPdfParams) {
  const [orcamento, empresa] = await Promise.all([
    buscarOrcamento(db, orcamentoId),
    db.empresa.findUnique({ where: { id: empresaId } })
  ]);

  if (!orcamento) {
    throw new Error("ORCAMENTO_NAO_ENCONTRADO");
  }

  const propostaOperacional =
    orcamento.tipo === "OPERACIONAL"
      ? propostaId
        ? orcamento.propostas.find((proposta) => proposta.id === propostaId)
        : orcamento.propostas.find((proposta) => proposta.status === "EMITIDA") ?? orcamento.propostas[0]
      : null;

  if (orcamento.tipo === "OPERACIONAL" && !propostaOperacional) {
    throw new Error("PROPOSTA_NAO_PREPARADA");
  }

  const snapshotOperacional =
    propostaOperacional &&
    (modo === "OFICIAL" || propostaOperacional.status === "EMITIDA") &&
    isRecord(propostaOperacional.snapshotJson)
      ? propostaOperacional.snapshotJson
      : null;
  const frentesDaProposta =
    propostaOperacional?.cenarioId
      ? orcamento.frentes.filter((frente) => frente.cenarioId === propostaOperacional.cenarioId)
      : orcamento.frentes;
  const frenteIdsDaProposta = new Set(frentesDaProposta.map((frente) => frente.id));
  const itensDaProposta =
    orcamento.tipo === "OPERACIONAL"
      ? orcamento.itens.filter((item) => item.frenteId && frenteIdsDaProposta.has(item.frenteId))
      : orcamento.itens;
  const opcionaisDaProposta = propostaOperacional?.opcionais ?? [];
  const frentesPdf = snapshotOperacional
    ? mapSnapshotFrentes(snapshotOperacional)
    : frentesDaProposta.map((frente) => ({
        ordem: frente.ordem,
        natureza: frente.natureza,
        nome: frente.nome,
        descricao: frente.descricao,
        metodoExecutivo: frente.metodoExecutivo,
        unidadeProducao: frente.unidadeProducao,
        quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
        produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
        prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
        observacao: frente.observacao
      }));
  const itensFontePdf = snapshotOperacional
    ? mapSnapshotItens(snapshotOperacional)
    : [
        ...itensDaProposta.map((item) => ({
          ordem: item.ordem,
          frenteNome: item.frente?.nome ?? null,
          frenteTempId: null,
          tipoItem: item.tipoItem,
          codigo: item.codigo,
          descricao: getItemPdfDescription({
            codigo: item.codigo,
            descricao:
              item.origemItemComercial === "MANUAL"
                ? item.descricaoManualComercial || item.descricao
                : item.descricao
          }),
          unidade: item.unidade,
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
          valorTotal: Number(item.valorTotal)
        })),
        ...opcionaisDaProposta.map((opcional) => ({
          ordem: opcional.ordem,
          frenteNome: "Opcional",
          frenteTempId: null,
          tipoItem: "OUTRO",
          codigo: opcional.codigo,
          descricao: opcional.descricao,
          unidade: opcional.unidade,
          quantidade: Number(opcional.quantidade),
          valorUnitario: Number(opcional.valorUnitario),
          valorTotal: Number(opcional.valorTotal)
        }))
      ];
  const itensPdf = selecionarItensComerciais(itensFontePdf);
  const frentesComerciaisPdf =
    orcamento.tipo === "OPERACIONAL" ? montarFrentesComerciais(frentesPdf, itensFontePdf) : [];
  const premissasBasePdf = snapshotOperacional
    ? mapSnapshotPremissas(snapshotOperacional)
    : [
        ...orcamento.premissas.map((premissa) => ({
          tipo: premissa.tipo,
          ordem: premissa.ordem,
          titulo: premissa.titulo,
          descricao: premissa.descricao
        })),
        ...opcionaisDaProposta
          .filter((opcional) => opcional.condicoes)
          .map((opcional) => ({
            tipo: "CONDICAO",
            ordem: 900 + opcional.ordem,
            titulo: `Opcional - ${opcional.descricao}`,
            descricao: opcional.condicoes ?? ""
          }))
      ];
  const premissasPdf = propostaOperacional?.condicoesComerciais?.trim()
    ? [
        ...premissasBasePdf,
        {
          tipo: "CONDICAO",
          ordem: 800,
          titulo: "Condicoes comerciais",
          descricao: propostaOperacional.condicoesComerciais
        }
      ]
    : premissasBasePdf;
  const snapshotTotals = snapshotOperacional ? getSnapshotTotals(snapshotOperacional) : null;
  const valorGlobalProposta = resolverValorGlobalProposta({
    snapshotValorTotal: snapshotTotals?.valorTotal,
    propostaValorTotal: propostaOperacional ? Number(propostaOperacional.valorTotal) : null,
    orcamentoValorTotal: Number(orcamento.valorTotal)
  });
  const modoExibicaoValoresPdf = snapshotOperacional
    ? asModoExibicaoValoresPdf(snapshotOperacional.modoExibicaoValoresPdf)
    : asModoExibicaoValoresPdf(propostaOperacional?.modoExibicaoValoresPdf);
  const possuiEscopoComercial =
    orcamento.tipo === "OPERACIONAL" ? frentesComerciaisPdf.length > 0 : itensPdf.length > 0;

  if (!possuiEscopoComercial) {
    throw new Error("PROPOSTA_SEM_ESCOPO_COMERCIAL");
  }

  const codigoDocumento = propostaOperacional?.codigo ?? orcamento.codigo;
  const revisaoDocumento = snapshotOperacional
    ? asNumber(snapshotOperacional.revisao, propostaOperacional?.revisao ?? 0)
    : propostaOperacional?.revisao ?? 0;
  const fileName = buildOrcamentoPropostaFileName({
    codigoOrcamento: orcamento.codigo,
    codigoProposta: codigoDocumento,
    revisao: revisaoDocumento,
    clienteNome: orcamento.cliente?.nome ?? orcamento.titulo
  });
  const documento = OrcamentoPdfDocument({
    codigo: codigoDocumento,
    revisao: revisaoDocumento,
    dataEmissao: dataDocumento ?? propostaOperacional?.emitidaEm ?? new Date(),
    modoDocumento: modo,
    modoExibicaoValoresPdf,
    tipo: orcamento.tipo,
    status: orcamento.status,
    dataOrcamento: orcamento.dataOrcamento,
    validadeAte: orcamento.validadeAte,
    titulo:
      propostaOperacional?.titulo ??
      (snapshotOperacional ? asNullableString(snapshotOperacional.titulo) : orcamento.titulo),
    objeto: snapshotOperacional ? asNullableString(snapshotOperacional.objeto) : orcamento.objeto,
    observacaoCliente: orcamento.observacaoCliente,
    valorTotal: valorGlobalProposta,
    cliente: {
      codigo: orcamento.cliente?.codigo,
      nome: orcamento.cliente?.nome ?? "Cliente nao informado",
      nomeFantasia: orcamento.cliente?.nomeFantasia,
      cnpj: orcamento.cliente?.cnpj,
      cpf: orcamento.cliente?.cpf,
      telefone: orcamento.cliente?.telefone,
      email: orcamento.cliente?.email
    },
    obra: orcamento.obra
      ? {
          codigo: orcamento.obra.codigo,
          nome: orcamento.obra.nome,
          localidade: orcamento.obra.localidade,
          cidade: orcamento.obra.cidade,
          uf: orcamento.obra.uf
        }
      : null,
    responsavel: orcamento.responsavel
      ? {
          nome: orcamento.responsavel.nome,
          email: orcamento.responsavel.email
        }
      : null,
    frentes: frentesComerciaisPdf,
    itens: itensPdf,
    premissas: premissasPdf,
    logoPath: resolveReportLogoSource(empresa?.logoUrl),
    empresaRelatorio: buildEmpresaRelatorioPdf(empresa)
  });

  const buffer = await renderToBuffer(documento);

  return {
    buffer,
    fileName,
    proposta: propostaOperacional
  };
}
