export type FrontendPerformanceMetric = {
  action: string;
  requestId?: string | null;
  frontendRequestMs?: number;
  frontendRefreshMs?: number;
  frontendProcessingMs?: number;
  frontendTotalMs?: number;
  status?: number;
};

export function isFrontendPerformanceEnabled() {
  return process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED === "true";
}

export function logFrontendPerformance(metric: FrontendPerformanceMetric) {
  if (!isFrontendPerformanceEnabled()) return;

  console.info(
    JSON.stringify({
      schemaVersion: 1,
      type: "performance.frontend",
      ...metric
    })
  );
}

export async function performanceFetch(action: string, input: RequestInfo | URL, init?: RequestInit) {
  if (!isFrontendPerformanceEnabled()) {
    return fetch(input, init);
  }

  const startedAt = performance.now();
  const response = await fetch(input, init);
  const frontendRequestMs = performance.now() - startedAt;

  logFrontendPerformance({
    action,
    requestId: response.headers.get("x-request-id"),
    frontendRequestMs: Number(frontendRequestMs.toFixed(2)),
    frontendTotalMs: Number(frontendRequestMs.toFixed(2)),
    status: response.status
  });

  return response;
}
