import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export type PerformanceQueryMetric = {
  model: string | null;
  operation: string;
  durationMs: number;
  sequence: number;
  transaction: boolean | null;
  fingerprint: string;
};

export type PerformanceStepMetric = {
  name: string;
  durationMs: number;
};

export type PerformancePdfMetric = {
  loadDataMs?: number;
  loadAssetsMs?: number;
  renderPdfMs?: number;
  persistPdfMs?: number;
  updateProposalMs?: number;
  lookupOfficialPdfMs?: number;
  readOfficialPdfMs?: number;
  fallbackRenderMs?: number;
  fallbackReason?:
    | "missing_url"
    | "unsupported_url"
    | "read_error"
    | "persist_error"
    | "storage_unavailable"
    | "not_emitted"
    | "not_needed";
  pdfSizeBytes?: number;
};

export type PerformanceRequestContext = {
  requestId: string;
  route: string;
  method: string;
  empresaId: string | null;
  tenantContextStatus: "available" | "missing";
  startedAt: number;
  sampled: boolean;
  queries: PerformanceQueryMetric[];
  steps: PerformanceStepMetric[];
  pdf?: PerformancePdfMetric;
  instrumentationMs: number;
};

declare global {
  // eslint-disable-next-line no-var
  var performanceRequestStorageGlobal: AsyncLocalStorage<PerformanceRequestContext> | undefined;
}

const storage = globalThis.performanceRequestStorageGlobal ?? new AsyncLocalStorage<PerformanceRequestContext>();
globalThis.performanceRequestStorageGlobal = storage;

export function createPerformanceRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getPerformanceContext() {
  return storage.getStore() ?? null;
}

export function runWithPerformanceContext<T>(context: PerformanceRequestContext, callback: () => T | Promise<T>) {
  return storage.run(context, callback);
}

export function addInstrumentationOverhead(durationMs: number) {
  const context = getPerformanceContext();
  if (!context) return;
  context.instrumentationMs += durationMs;
}

export function recordPerformanceQuery(metric: Omit<PerformanceQueryMetric, "sequence" | "fingerprint">) {
  const overheadStart = performance.now();
  const context = getPerformanceContext();
  if (!context?.sampled) return;

  const sequence = context.queries.length + 1;
  context.queries.push({
    ...metric,
    sequence,
    fingerprint: `${metric.model ?? "unknown"}.${metric.operation}`
  });
  addInstrumentationOverhead(performance.now() - overheadStart);
}

export async function measurePerformanceStep<T>(name: string, callback: () => T | Promise<T>) {
  const start = performance.now();
  try {
    return await callback();
  } finally {
    const durationMs = performance.now() - start;
    const overheadStart = performance.now();
    const context = getPerformanceContext();
    if (context?.sampled) {
      context.steps.push({ name, durationMs });
    }
    addInstrumentationOverhead(performance.now() - overheadStart);
  }
}

export function recordPdfPerformanceMetric(metric: PerformancePdfMetric) {
  const overheadStart = performance.now();
  const context = getPerformanceContext();
  if (context?.sampled) {
    context.pdf = {
      ...context.pdf,
      ...metric
    };
  }
  addInstrumentationOverhead(performance.now() - overheadStart);
}

export function clearPerformanceContext() {
  // AsyncLocalStorage encerra o contexto ao final do callback de run().
  return storage.getStore() === undefined;
}
