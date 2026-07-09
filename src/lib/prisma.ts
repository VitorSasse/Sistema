import { PrismaClient } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant-store";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const TENANT_MODELS = new Set([
  "Usuario",
  "Cliente",
  "Obra",
  "Fornecedor",
  "CentroCustoCompra",
  "CatalogoCompra",
  "PlanoConta",
  "Equipamento",
  "OrdemCompra",
  "OrdemCompraItem",
  "OrdemCompraParcela",
  "Orcamento",
  "OrcamentoFormacaoPreco",
  "OrcamentoFrente",
  "OrcamentoItem",
  "OrcamentoPremissa",
  "Material",
  "Servico",
  "Colaborador",
  "PrecoClienteObra",
  "Ficha",
  "FichaRomaneio",
  "LancamentoDiario",
  "LancamentoRomaneio",
  "LeituraEquipamento",
  "PlanoManutencao",
  "AgendaManutencao",
  "AgendaProgramacao",
  "ManutencaoExecutada",
  "AlertaManutencao",
  "AnexoManutencao",
  "Medicao",
  "MedicaoItem",
  "HistoricoAlteracao",
  "Anexo",
  "LogAuditoria"
]);

type PrismaQueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function shouldScopeTenant(model: string | undefined) {
  const tenant = getTenantContext();

  if (!model || !TENANT_MODELS.has(model) || !tenant) {
    return null;
  }

  if (tenant.isMaster) {
    return null;
  }

  return tenant;
}

function mergeTenantWhere(args: PrismaQueryArgs, empresaId: string, mode: "and" | "direct" = "and") {
  const where = args.where ?? {};

  if (mode === "direct") {
    args.where = {
      ...where,
      empresaId
    };
    return;
  }

  args.where = {
    AND: [where, { empresaId }]
  };
}

function applyTenantData(data: unknown, empresaId: string) {
  if (!data || typeof data !== "object") {
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item) => applyTenantData(item, empresaId));
    return;
  }

  const record = data as Record<string, unknown>;

  if (record.empresaId && record.empresaId !== empresaId) {
    throw new Error("Registro pertence a outra empresa.");
  }

  record.empresaId = empresaId;

  Object.values(record).forEach((value) => applyTenantNestedWrites(value, empresaId));
}

function applyTenantNestedWrites(value: unknown, empresaId: string) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => applyTenantNestedWrites(item, empresaId));
    return;
  }

  const record = value as Record<string, unknown>;

  if ("create" in record) {
    applyTenantData(record.create, empresaId);
  }

  if ("createMany" in record && record.createMany && typeof record.createMany === "object") {
    applyTenantData((record.createMany as Record<string, unknown>).data, empresaId);
  }

  if ("update" in record) {
    applyTenantData(record.update, empresaId);
  }

  if ("updateMany" in record && record.updateMany && typeof record.updateMany === "object") {
    const updateMany = record.updateMany as Record<string, unknown>;
    applyTenantData(updateMany.data, empresaId);
  }

  if ("upsert" in record) {
    applyTenantNestedWrites(record.upsert, empresaId);
  }
}

function applyTenantToWriteArgs(args: PrismaQueryArgs, empresaId: string) {
  applyTenantData(args.data, empresaId);
  applyTenantData(args.create, empresaId);
  applyTenantData(args.update, empresaId);
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenant = shouldScopeTenant(model);

          if (!tenant) {
            return query(args);
          }

          const scopedArgs = args as PrismaQueryArgs;

          if (["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"].includes(operation)) {
            mergeTenantWhere(scopedArgs, tenant.empresaId, "direct");
          } else if (
            ["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany"].includes(
              operation
            )
          ) {
            mergeTenantWhere(scopedArgs, tenant.empresaId);
          }

          if (["create", "createMany", "update", "updateMany", "upsert"].includes(operation)) {
            applyTenantToWriteArgs(scopedArgs, tenant.empresaId);
          }

          return query(args);
        }
      }
    }
  }) as unknown as PrismaClient;
}

export const prisma = global.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}
