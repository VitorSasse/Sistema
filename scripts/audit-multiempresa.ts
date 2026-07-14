import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JMIX_EMPRESA_ID = "00000000-0000-0000-0000-000000000001";

type CountRow = { empresaId: string; _count: { _all: number } };
type IssueRow = { total: bigint };

const relationshipChecks = [
  ["Obra x Cliente", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Obra" a JOIN "Cliente" b ON b.id = a."clienteId" WHERE a."empresaId" <> b."empresaId"`],
  ["Ficha x Cliente", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Ficha" a JOIN "Cliente" b ON b.id = a."clienteId" WHERE a."empresaId" <> b."empresaId"`],
  ["Lancamento x Ficha", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "LancamentoDiario" a JOIN "Ficha" b ON b.id = a."fichaId" WHERE a."empresaId" <> b."empresaId"`],
  ["Lancamento x Cliente", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "LancamentoDiario" a JOIN "Cliente" b ON b.id = a."clienteId" WHERE a."empresaId" <> b."empresaId"`],
  ["Lancamento x Equipamento", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "LancamentoDiario" a JOIN "Equipamento" b ON b.id = a."equipamentoId" WHERE a."empresaId" <> b."empresaId"`],
  ["Medicao x Cliente", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Medicao" a JOIN "Cliente" b ON b.id = a."clienteId" WHERE a."empresaId" <> b."empresaId"`],
  ["Item medicao x Medicao", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "MedicaoItem" a JOIN "Medicao" b ON b.id = a."medicaoId" WHERE a."empresaId" <> b."empresaId"`],
  ["Item medicao x Lancamento", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "MedicaoItem" a JOIN "LancamentoDiario" b ON b.id = a."lancamentoId" WHERE a."empresaId" <> b."empresaId"`],
  ["Ordem x Fornecedor", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "OrdemCompra" a JOIN "Fornecedor" b ON b.id = a."fornecedorId" WHERE a."empresaId" <> b."empresaId"`],
  ["Item ordem x Ordem", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "OrdemCompraItem" a JOIN "OrdemCompra" b ON b.id = a."ordemCompraId" WHERE a."empresaId" <> b."empresaId"`],
  ["Orcamento x Cliente", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Orcamento" a JOIN "Cliente" b ON b.id = a."clienteId" WHERE a."empresaId" <> b."empresaId"`],
  ["Frente x Orcamento", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "OrcamentoFrente" a JOIN "Orcamento" b ON b.id = a."orcamentoId" WHERE a."empresaId" <> b."empresaId"`],
  ["Item orcamento x Orcamento", Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "OrcamentoItem" a JOIN "Orcamento" b ON b.id = a."orcamentoId" WHERE a."empresaId" <> b."empresaId"`]
] as const;

function delegateName(modelName: string) {
  return `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
}

function trustedTableIdentifier(tableName: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error(`Nome de tabela invalido na auditoria: ${tableName}`);
  }

  return Prisma.raw(`"${tableName}"`);
}

async function main() {
  const empresas = await prisma.empresa.findMany({
    where: { deletedAt: null },
    select: { id: true, nome: true, nomeFantasia: true },
    orderBy: { nome: "asc" }
  });
  const empresaNome = new Map(empresas.map((empresa) => [empresa.id, empresa.nomeFantasia || empresa.nome]));
  const tenantModels = Prisma.dmmf.datamodel.models.filter((model) =>
    model.fields.some((field) => field.name === "empresaId")
  );
  const models = [];

  for (const model of tenantModels) {
    const delegate = (prisma as unknown as Record<string, { groupBy: (args: unknown) => Promise<CountRow[]> }>)[delegateName(model.name)];
    const rows = await delegate.groupBy({ by: ["empresaId"], _count: { _all: true } });
    const table = trustedTableIdentifier(model.dbName ?? model.name);
    const nullRows = await prisma.$queryRaw<IssueRow[]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS total FROM ${table} WHERE "empresaId" IS NULL`
    );

    models.push({
      model: model.name,
      semEmpresa: Number(nullRows[0]?.total ?? 0),
      empresaInexistente: rows
        .filter((row) => !empresaNome.has(row.empresaId))
        .reduce((total, row) => total + Number(row._count._all), 0),
      naJmix: Number(rows.find((row) => row.empresaId === JMIX_EMPRESA_ID)?._count?._all ?? 0),
      porEmpresa: rows.map((row) => ({
        empresaId: row.empresaId,
        empresa: empresaNome.get(row.empresaId) ?? "EMPRESA INEXISTENTE",
        total: Number(row._count._all)
      }))
    });
  }

  const relationships = [];
  for (const [nome, query] of relationshipChecks) {
    const rows = await prisma.$queryRaw<IssueRow[]>(query);
    relationships.push({ nome, total: Number(rows[0]?.total ?? 0) });
  }

  const usuariosOrfaos = await prisma.$queryRaw<IssueRow[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM "Usuario" usuario
    LEFT JOIN "Empresa" empresa ON empresa.id = usuario."empresaId"
    WHERE empresa.id IS NULL
  `);

  const report = {
    geradoEm: new Date().toISOString(),
    modo: "somente leitura",
    empresas,
    models,
    relacionamentosCruzados: relationships,
    usuariosSemEmpresaValida: Number(usuariosOrfaos[0]?.total ?? 0)
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
