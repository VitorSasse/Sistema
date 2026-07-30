import { Prisma, PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { performanceConfig } from "@/lib/performance/config";
import { recordPerformanceQuery } from "@/lib/performance/request-context";
import { getTenantContext } from "@/lib/tenant-store";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaBaseGlobal: PrismaClient | undefined;
}

export const TENANT_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "empresaId"))
    .map((model) => model.name)
);

type PrismaQueryArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
};

function shouldScopeTenant(model: string | undefined) {
  const tenant = getTenantContext();

  if (!model || !TENANT_MODELS.has(model)) {
    return null;
  }

  if (!tenant?.initialized) {
    throw new Error(`Contexto de empresa ausente para acessar ${model}.`);
  }

  if (tenant.bypassTenantScope) {
    return null;
  }

  const empresaId = tenant.isMaster ? tenant.empresaSelecionadaId : tenant.empresaId;

  if (!empresaId) {
    throw new Error(
      tenant.isMaster
        ? "Selecione uma empresa antes de acessar dados operacionais."
        : "Usuario sem empresa vinculada. Entre em contato com o administrador."
    );
  }

  return {
    ...tenant,
    empresaId
  };
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

function createPrismaClient(client: PrismaClient): PrismaClient {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenant = shouldScopeTenant(model);

          if (!tenant) {
            if (!performanceConfig.enabled || !performanceConfig.queryLogEnabled) {
              return query(args);
            }

            const start = performance.now();
            try {
              return await query(args);
            } finally {
              recordPerformanceQuery({
                model: model ?? null,
                operation,
                durationMs: performance.now() - start,
                transaction: null
              });
            }
          }

          const scopedArgs = args as PrismaQueryArgs;

          if (["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"].includes(operation)) {
            mergeTenantWhere(scopedArgs, tenant.empresaId, "direct");
          } else if (
            ["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "updateMany", "updateManyAndReturn", "deleteMany"].includes(
              operation
            )
          ) {
            mergeTenantWhere(scopedArgs, tenant.empresaId);
          }

          if (["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"].includes(operation)) {
            applyTenantToWriteArgs(scopedArgs, tenant.empresaId);
          }

          if (!performanceConfig.enabled || !performanceConfig.queryLogEnabled) {
            return query(args);
          }

          const start = performance.now();
          try {
            return await query(args);
          } finally {
            recordPerformanceQuery({
              model: model ?? null,
              operation,
              durationMs: performance.now() - start,
              transaction: null
            });
          }
        }
      }
    }
  }) as unknown as PrismaClient;
}

const prismaBase =
  global.prismaBaseGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

export const prisma = global.prismaGlobal ?? createPrismaClient(prismaBase);

// Exclusivo para consultas de identidade e administracao que precisam ocorrer
// antes da definicao do tenant. Dados operacionais devem sempre usar `prisma`.
export function withUnscopedPrisma<T>(callback: (client: PrismaClient) => T | Promise<T>) {
  return callback(prismaBase);
}

if (process.env.NODE_ENV !== "production") {
  global.prismaBaseGlobal = prismaBase;
  global.prismaGlobal = prisma;
}
