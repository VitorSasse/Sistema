import { performance } from "node:perf_hooks";
import { NextRequest, NextResponse } from "next/server";
import { classifyDuration, classifyPayload, performanceConfig, shouldSamplePerformance } from "@/lib/performance/config";
import { logPerformance, logPerformanceError } from "@/lib/performance/logger";
import {
  createPerformanceRequestId,
  PerformanceRequestContext,
  runWithPerformanceContext
} from "@/lib/performance/request-context";
import { getActiveTenantEmpresaId, getTenantContext } from "@/lib/tenant-store";

type MonitoredRouteOptions = {
  route: string;
  method?: string;
  forceLogErrors?: boolean;
};

function estimatePayloadBytes(response: Response) {
  if (!performanceConfig.payloadSizeEnabled) return null;
  const contentLength = response.headers.get("content-length");
  if (!contentLength) return null;
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) ? parsed : null;
}

function summarizeQueries(context: PerformanceRequestContext) {
  const queries = context.queries;
  const databaseAccumulatedMs = Number(queries.reduce((acc, query) => acc + query.durationMs, 0).toFixed(2));
  const slowQueries = queries
    .filter((query) => query.durationMs >= performanceConfig.slowQueryMs)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, performanceConfig.maxSlowQueriesPerRequest);

  const byFingerprint = new Map<string, number>();
  for (const query of queries) {
    byFingerprint.set(query.fingerprint, (byFingerprint.get(query.fingerprint) ?? 0) + 1);
  }

  return {
    queryCount: queries.length,
    databaseAccumulatedMs,
    databaseWallClockMs: null,
    slowQueryCount: slowQueries.length,
    maxQueryMs: queries.length ? Number(Math.max(...queries.map((query) => query.durationMs)).toFixed(2)) : 0,
    avgQueryMs: queries.length ? Number((databaseAccumulatedMs / queries.length).toFixed(2)) : 0,
    topSlowQueries: slowQueries.map((query) => ({
      model: query.model,
      operation: query.operation,
      durationMs: Number(query.durationMs.toFixed(2)),
      sequence: query.sequence,
      transaction: query.transaction,
      occurrences: byFingerprint.get(query.fingerprint) ?? 1,
      fingerprint: query.fingerprint
    }))
  };
}

export async function withPerformanceMonitoring(
  request: NextRequest | Request,
  options: MonitoredRouteOptions,
  handler: () => Promise<Response>
) {
  if (!performanceConfig.enabled) {
    return handler();
  }

  const requestId = createPerformanceRequestId();
  const tenant = getTenantContext();
  const context: PerformanceRequestContext = {
    requestId,
    route: options.route,
    method: options.method ?? request.method,
    empresaId: getActiveTenantEmpresaId(),
    tenantContextStatus: tenant?.initialized ? "available" : "missing",
    startedAt: performance.now(),
    sampled: shouldSamplePerformance(),
    queries: [],
    steps: [],
    instrumentationMs: 0
  };

  return runWithPerformanceContext(context, async () => {
    let response: Response | null = null;
    let error: unknown = null;

    try {
      response = await handler();
      return response;
    } catch (currentError) {
      error = currentError;
      throw currentError;
    } finally {
      const totalBeforeLog = performance.now();
      const durationMs = Number((totalBeforeLog - context.startedAt).toFixed(2));
      const status = response?.status ?? 500;
      const payloadBytes = response ? estimatePayloadBytes(response) : null;
      const classification = classifyDuration(durationMs);
      const shouldLog =
        context.sampled ||
        status >= 500 ||
        classification === "critical" ||
        (options.forceLogErrors !== false && error !== null);

      if (response) {
        response.headers.set("x-request-id", requestId);
      }

      if (shouldLog) {
        const payload = {
          type: error ? "performance.error" : "performance.request",
          requestId,
          route: context.route,
          method: context.method,
          empresaId: context.empresaId,
          tenantContextStatus: context.tenantContextStatus,
          durationMs,
          instrumentationMs: Number(context.instrumentationMs.toFixed(2)),
          estimatedOperationMs: Number(Math.max(0, durationMs - context.instrumentationMs).toFixed(2)),
          status,
          payloadBytes,
          payloadClassification: classifyPayload(payloadBytes),
          classification,
          steps: context.steps.map((step) => ({ name: step.name, durationMs: Number(step.durationMs.toFixed(2)) })),
          pdf: context.pdf ?? null,
          ...summarizeQueries(context),
          error: error instanceof Error ? { name: error.name, message: error.message } : null
        };

        if (error || status >= 500) {
          logPerformanceError(payload);
        } else {
          logPerformance(payload);
        }
      }
    }
  });
}

export function jsonWithPerformanceRequestId(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  return response;
}
