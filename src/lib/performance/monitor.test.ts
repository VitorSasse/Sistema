import { describe, expect, it } from "vitest";
import {
  createPerformanceRequestId,
  getPerformanceContext,
  measurePerformanceStep,
  recordPerformanceQuery,
  runWithPerformanceContext,
  type PerformanceRequestContext
} from "@/lib/performance/request-context";

function createContext(requestId: string, empresaId: string | null): PerformanceRequestContext {
  return {
    requestId,
    route: "/api/teste",
    method: "GET",
    empresaId,
    tenantContextStatus: empresaId ? "available" : "missing",
    startedAt: performance.now(),
    sampled: true,
    queries: [],
    steps: [],
    instrumentationMs: 0
  };
}

describe("performance request context", () => {
  it("gera requestIds distintos", () => {
    expect(createPerformanceRequestId()).not.toBe(createPerformanceRequestId());
  });

  it("isola contextos concorrentes", async () => {
    const first = createContext("req_a", "empresa_a");
    const second = createContext("req_b", "empresa_b");

    await Promise.all([
      runWithPerformanceContext(first, async () => {
        await measurePerformanceStep("first", async () => {
          recordPerformanceQuery({ model: "Cliente", operation: "findMany", durationMs: 10, transaction: null });
        });

        expect(getPerformanceContext()?.requestId).toBe("req_a");
        expect(getPerformanceContext()?.empresaId).toBe("empresa_a");
      }),
      runWithPerformanceContext(second, async () => {
        await measurePerformanceStep("second", async () => {
          recordPerformanceQuery({ model: "Obra", operation: "findMany", durationMs: 20, transaction: null });
        });

        expect(getPerformanceContext()?.requestId).toBe("req_b");
        expect(getPerformanceContext()?.empresaId).toBe("empresa_b");
      })
    ]);

    expect(first.queries).toHaveLength(1);
    expect(first.queries[0]?.model).toBe("Cliente");
    expect(second.queries).toHaveLength(1);
    expect(second.queries[0]?.model).toBe("Obra");
  });

  it("nao registra queries quando a requisicao nao foi amostrada", () => {
    const context = { ...createContext("req_c", null), sampled: false };

    runWithPerformanceContext(context, () => {
      recordPerformanceQuery({ model: "Cliente", operation: "findMany", durationMs: 10, transaction: null });
    });

    expect(context.queries).toHaveLength(0);
  });
});
