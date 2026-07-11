import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarOrcamento } from "@/server/services/orcamentos/service";
import { buildEmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";
import { OrcamentoPdfDocument } from "@/server/pdf/orcamento-pdf";
import { resolveReportLogoSource } from "@/server/pdf/report-logo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeFileSegment(value: string, maxLength = 42) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return normalized.slice(0, maxLength) || "ORCAMENTO";
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
  const itens = Array.isArray(snapshot.itens) ? snapshot.itens : [];
  const opcionais = Array.isArray(snapshot.opcionais) ? snapshot.opcionais : [];
  const itensBase = itens.filter(isRecord).map((item, index) => {
    const quantidade = asNumber(item.quantidade);
    const valorUnitario = asNumber(item.valorUnitario);

    return {
      ordem: asNumber(item.ordem, index + 1),
      frenteNome: frenteNomeByTempId.get(asString(item.frenteTempId)) ?? null,
      tipoItem: asString(item.tipoItem, "OUTRO"),
      codigo: asNullableString(item.codigo),
      descricao: asString(item.descricao, "Item sem descricao"),
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

function getSnapshotFormacaoPreco(snapshot: Record<string, unknown>) {
  const formacaoPreco = isRecord(snapshot.formacaoPreco) ? snapshot.formacaoPreco : null;

  if (!formacaoPreco) {
    return null;
  }

  return {
    custoDireto: asNumber(formacaoPreco.custoDireto),
    custoIndireto: asNumber(formacaoPreco.custoIndireto),
    margemPercentual: asNumber(formacaoPreco.margemPercentual),
    margemValor: asNumber(formacaoPreco.margemValor),
    impostosPercentual: asNumber(formacaoPreco.impostosPercentual),
    impostosValor: asNumber(formacaoPreco.impostosValor),
    precoSugerido: asNumber(formacaoPreco.precoSugerido),
    precoFinal: asNumber(formacaoPreco.precoFinal),
    observacao: asNullableString(formacaoPreco.observacao)
  };
}

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const [orcamento, empresa] = await Promise.all([
    buscarOrcamento(prisma, id),
    prisma.empresa.findUnique({ where: { id: session.user.empresaId } })
  ]);

  if (!orcamento) {
    return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
  }

  const url = new URL(request.url);
  const propostaId = url.searchParams.get("propostaId");
  const propostaOperacional =
    orcamento.tipo === "OPERACIONAL"
      ? propostaId
        ? orcamento.propostas.find((proposta) => proposta.id === propostaId)
        : orcamento.propostas.find((proposta) => proposta.status === "EMITIDA") ?? orcamento.propostas[0]
      : null;

  if (orcamento.tipo === "OPERACIONAL" && !propostaOperacional) {
    return NextResponse.json(
      { message: "Prepare uma proposta comercial antes de gerar o PDF." },
      { status: 400 }
    );
  }

  const snapshotOperacional =
    propostaOperacional?.status === "EMITIDA" && isRecord(propostaOperacional.snapshotJson)
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
        nome: frente.nome,
        descricao: frente.descricao,
        metodoExecutivo: frente.metodoExecutivo,
        unidadeProducao: frente.unidadeProducao,
        quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
        produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
        prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
        observacao: frente.observacao
      }));
  const itensPdf = snapshotOperacional
    ? mapSnapshotItens(snapshotOperacional)
    : [
        ...itensDaProposta.map((item) => ({
          ordem: item.ordem,
          frenteNome: item.frente?.nome ?? null,
          tipoItem: item.tipoItem,
          codigo: item.codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: Number(item.quantidade),
          valorUnitario: Number(item.valorUnitario),
          valorTotal: Number(item.valorTotal)
        })),
        ...opcionaisDaProposta.map((opcional) => ({
          ordem: opcional.ordem,
          frenteNome: "Opcional",
          tipoItem: "OUTRO",
          codigo: opcional.codigo,
          descricao: opcional.descricao,
          unidade: opcional.unidade,
          quantidade: Number(opcional.quantidade),
          valorUnitario: Number(opcional.valorUnitario),
          valorTotal: Number(opcional.valorTotal)
        }))
      ];
  const premissasPdf = snapshotOperacional
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
  const snapshotTotals = snapshotOperacional ? getSnapshotTotals(snapshotOperacional) : null;
  const formacaoPrecoPdf = snapshotOperacional
    ? getSnapshotFormacaoPreco(snapshotOperacional)
    : orcamento.formacaoPreco
      ? {
          custoDireto: Number(orcamento.formacaoPreco.custoDireto),
          custoIndireto: Number(orcamento.formacaoPreco.custoIndireto),
          margemPercentual: Number(orcamento.formacaoPreco.margemPercentual),
          margemValor: Number(orcamento.formacaoPreco.margemValor),
          impostosPercentual: Number(orcamento.formacaoPreco.impostosPercentual),
          impostosValor: Number(orcamento.formacaoPreco.impostosValor),
          precoSugerido: Number(orcamento.formacaoPreco.precoSugerido),
          precoFinal: Number(orcamento.formacaoPreco.precoFinal),
          observacao: orcamento.formacaoPreco.observacao
        }
      : null;

  if (itensPdf.length === 0) {
    return NextResponse.json(
      { message: "Inclua pelo menos um item antes de gerar a proposta em PDF." },
      { status: 400 }
    );
  }

  const fileName = `${propostaOperacional?.codigo ?? orcamento.codigo}_${normalizeFileSegment(
    orcamento.cliente?.nome ?? orcamento.titulo ?? "PROPOSTA"
  )}.pdf`;

  const buffer = await renderToBuffer(
    OrcamentoPdfDocument({
      codigo: orcamento.codigo,
      tipo: orcamento.tipo,
      status: orcamento.status,
      dataOrcamento: orcamento.dataOrcamento,
      validadeAte: orcamento.validadeAte,
      titulo: propostaOperacional?.titulo ?? orcamento.titulo,
      objeto: orcamento.objeto,
      observacaoCliente: orcamento.observacaoCliente,
      valorSubtotal: snapshotTotals?.valorSubtotal ?? Number(propostaOperacional?.valorSubtotal ?? orcamento.valorSubtotal),
      valorDesconto: snapshotTotals?.valorDesconto ?? Number(propostaOperacional?.valorDesconto ?? orcamento.valorDesconto),
      valorAcrescimo: snapshotTotals?.valorAcrescimo ?? Number(propostaOperacional?.valorAcrescimo ?? orcamento.valorAcrescimo),
      valorTotal: snapshotTotals?.valorTotal ?? Number(propostaOperacional?.valorTotal ?? orcamento.valorTotal),
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
      formacaoPreco: formacaoPrecoPdf,
      frentes: frentesPdf,
      itens: itensPdf,
      premissas: premissasPdf,
      logoPath: resolveReportLogoSource(empresa?.logoUrl),
      empresaRelatorio: buildEmpresaRelatorioPdf(empresa)
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store"
    }
  });
}
