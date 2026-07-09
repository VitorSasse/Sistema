import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buscarOrcamento } from "@/server/services/orcamentos/service";
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

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await context.params;
  const orcamento = await buscarOrcamento(prisma, id);

  if (!orcamento) {
    return NextResponse.json({ message: "Orcamento nao encontrado." }, { status: 404 });
  }

  if (orcamento.itens.length === 0) {
    return NextResponse.json(
      { message: "Inclua pelo menos um item antes de gerar a proposta em PDF." },
      { status: 400 }
    );
  }

  const fileName = `${orcamento.codigo}_${normalizeFileSegment(
    orcamento.cliente?.nome ?? orcamento.titulo ?? "PROPOSTA"
  )}.pdf`;

  const buffer = await renderToBuffer(
    OrcamentoPdfDocument({
      codigo: orcamento.codigo,
      tipo: orcamento.tipo,
      status: orcamento.status,
      dataOrcamento: orcamento.dataOrcamento,
      validadeAte: orcamento.validadeAte,
      titulo: orcamento.titulo,
      objeto: orcamento.objeto,
      observacaoCliente: orcamento.observacaoCliente,
      valorSubtotal: Number(orcamento.valorSubtotal),
      valorDesconto: Number(orcamento.valorDesconto),
      valorAcrescimo: Number(orcamento.valorAcrescimo),
      valorTotal: Number(orcamento.valorTotal),
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
      formacaoPreco: orcamento.formacaoPreco
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
        : null,
      frentes: orcamento.frentes.map((frente) => ({
        ordem: frente.ordem,
        nome: frente.nome,
        descricao: frente.descricao,
        metodoExecutivo: frente.metodoExecutivo,
        unidadeProducao: frente.unidadeProducao,
        quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
        produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
        prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
        observacao: frente.observacao
      })),
      itens: orcamento.itens.map((item) => ({
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
      premissas: orcamento.premissas.map((premissa) => ({
        tipo: premissa.tipo,
        ordem: premissa.ordem,
        titulo: premissa.titulo,
        descricao: premissa.descricao
      })),
      logoPath: resolveReportLogoSource()
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    }
  });
}
