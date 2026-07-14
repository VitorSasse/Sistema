import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma, TENANT_MODELS, withUnscopedPrisma } from "@/lib/prisma";
import {
  getActiveTenantEmpresaId,
  getTenantContext,
  runWithTenantContext,
  runWithoutTenantScope,
  type TenantContext
} from "@/lib/tenant-store";

function context(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    usuarioId: "usuario-teste",
    empresaId: "empresa-a",
    roleEmpresa: "OPERADOR",
    isMaster: false,
    empresaSelecionadaId: null,
    initialized: true,
    bypassTenantScope: false,
    ...overrides
  };
}

describe("isolamento do tenant", () => {
  it("protege automaticamente todo model que possui empresaId", () => {
    const expected = Prisma.dmmf.datamodel.models
      .filter((model) => model.fields.some((field) => field.name === "empresaId"))
      .map((model) => model.name);

    expect([...TENANT_MODELS].sort()).toEqual(expected.sort());
  });

  it("mantem contextos concorrentes isolados", async () => {
    const [empresaA, empresaB] = await Promise.all([
      runWithTenantContext(context({ empresaId: "empresa-a" }), async () => {
        await Promise.resolve();
        return getActiveTenantEmpresaId();
      }),
      runWithTenantContext(context({ empresaId: "empresa-b" }), async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return getActiveTenantEmpresaId();
      })
    ]);

    expect(empresaA).toBe("empresa-a");
    expect(empresaB).toBe("empresa-b");
  });

  it("usa a empresa selecionada para MASTER", async () => {
    const empresaId = await runWithTenantContext(
      context({ isMaster: true, roleEmpresa: "MASTER", empresaId: "empresa-master", empresaSelecionadaId: "empresa-b" }),
      async () => getActiveTenantEmpresaId()
    );

    expect(empresaId).toBe("empresa-b");
  });

  it("falha fechado quando o contexto nao foi inicializado", async () => {
    await expect(prisma.cliente.count()).rejects.toThrow("Contexto de empresa ausente");
  });

  it("permite carregar a identidade antes da definicao do tenant", async () => {
    await expect(withUnscopedPrisma((db) => db.usuario.count())).resolves.toBeGreaterThan(0);
  });

  it("exige selecao explicita de empresa para MASTER operacional", async () => {
    await expect(
      runWithTenantContext(
        context({ isMaster: true, roleEmpresa: "MASTER", empresaId: "empresa-master", empresaSelecionadaId: null }),
        async () => await prisma.cliente.count()
      )
    ).rejects.toThrow("Selecione uma empresa");
  });

  it("rejeita empresaId divergente enviado em uma gravacao", async () => {
    await expect(
      runWithTenantContext(context(), async () =>
        prisma.cliente.create({
          data: {
            empresaId: "empresa-b",
            codigo: "NAO-PERSISTIR",
            nome: "Nao persistir"
          }
        })
      )
    ).rejects.toThrow("Registro pertence a outra empresa");
  });

  it("limita o bypass a um bloco explicito", async () => {
    await runWithTenantContext(context(), async () => {
      expect(getTenantContext()?.bypassTenantScope).toBe(false);

      await runWithoutTenantScope(async () => {
        expect(getTenantContext()?.bypassTenantScope).toBe(true);
      });

      expect(getTenantContext()?.bypassTenantScope).toBe(false);
    });
  });
});
