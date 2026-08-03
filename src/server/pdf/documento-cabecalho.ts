import type { Prisma, PrismaClient, TipoDocumentoCabecalho } from "@prisma/client";
import { buildEmpresaRelatorioPdf, type EmpresaRelatorioInput, type EmpresaRelatorioPdf } from "@/server/pdf/empresa-relatorio";

type DbClient = PrismaClient | Prisma.TransactionClient;

export const DOCUMENTO_CABECALHO_TIPOS: Array<{
  tipo: TipoDocumentoCabecalho;
  label: string;
}> = [
  { tipo: "ORCAMENTO", label: "Orcamentos" },
  { tipo: "ORDEM_COMPRA", label: "Ordens de compra" },
  { tipo: "MEDICAO", label: "Medicoes" },
  { tipo: "RELATORIO", label: "Relatorios" }
];

export type DocumentoCabecalhoPdf = {
  empresaRelatorio: EmpresaRelatorioPdf;
  logoUrl: string | null;
};

type DocumentoCabecalhoConfigInput = {
  tipo?: TipoDocumentoCabecalho;
  nomeEmpresa?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

function trimOrNull(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function mergeEmpresaComCabecalho(
  empresa: EmpresaRelatorioInput | null | undefined,
  config?: DocumentoCabecalhoConfigInput | null
): EmpresaRelatorioInput | null {
  if (!empresa && !config) {
    return null;
  }

  return {
    nome: trimOrNull(config?.nomeEmpresa) ?? empresa?.nome ?? null,
    nomeFantasia: trimOrNull(config?.nomeEmpresa) ?? empresa?.nomeFantasia ?? null,
    razaoSocial: empresa?.razaoSocial ?? null,
    cnpj: trimOrNull(config?.cnpj) ?? empresa?.cnpj ?? null,
    endereco: trimOrNull(config?.endereco) ?? empresa?.endereco ?? null,
    cidade: trimOrNull(config?.cidade) ?? empresa?.cidade ?? null,
    estado: trimOrNull(config?.estado) ?? empresa?.estado ?? null,
    cep: trimOrNull(config?.cep) ?? empresa?.cep ?? null,
    telefone: trimOrNull(config?.telefone) ?? empresa?.telefone ?? null,
    email: trimOrNull(config?.email) ?? empresa?.email ?? null
  };
}

export async function resolveDocumentoCabecalhoPdf(
  db: DbClient,
  empresaId: string,
  tipo: TipoDocumentoCabecalho
): Promise<DocumentoCabecalhoPdf> {
  const [empresa, configs] = await Promise.all([
    db.empresa.findUnique({
      where: { id: empresaId },
      select: {
        nome: true,
        nomeFantasia: true,
        razaoSocial: true,
        cnpj: true,
        endereco: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        email: true,
        logoUrl: true
      }
    }),
    db.documentoCabecalhoConfig.findMany({
      where: {
        empresaId,
        OR: [{ tipo }, { usarLogoGlobal: true }]
      },
      select: {
        tipo: true,
        nomeEmpresa: true,
        cnpj: true,
        endereco: true,
        cidade: true,
        estado: true,
        cep: true,
        telefone: true,
        email: true,
        logoUrl: true,
        usarLogoGlobal: true
      }
    })
  ]);

  const config = configs.find((item) => item.tipo === tipo) ?? null;
  const globalLogo = configs.find((item) => item.usarLogoGlobal && trimOrNull(item.logoUrl))?.logoUrl ?? null;
  const logoUrl = trimOrNull(globalLogo) ?? trimOrNull(config?.logoUrl) ?? trimOrNull(empresa?.logoUrl) ?? null;
  const empresaRelatorio = buildEmpresaRelatorioPdf(mergeEmpresaComCabecalho(empresa, config));

  return {
    empresaRelatorio,
    logoUrl
  };
}
