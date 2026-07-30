export type PerformanceClassification = "fast" | "moderate" | "slow" | "critical";
export type PayloadClassification = "small" | "medium" | "large" | "critical" | "unknown";

function parseBoolean(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const performanceConfig = {
  enabled: parseBoolean(process.env.PERFORMANCE_MONITORING_ENABLED, process.env.NODE_ENV !== "production"),
  queryLogEnabled: parseBoolean(process.env.PERFORMANCE_QUERY_LOG_ENABLED, process.env.NODE_ENV !== "production"),
  frontendEnabled: parseBoolean(process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED, false),
  payloadSizeEnabled: parseBoolean(process.env.PERFORMANCE_LOG_PAYLOAD_SIZE, true),
  detailedQueryLogEnabled: parseBoolean(process.env.PERFORMANCE_DETAILED_QUERY_LOG_ENABLED, false),
  sampleRate: clamp(parseNumber(process.env.PERFORMANCE_SAMPLE_RATE, 1), 0, 1),
  slowRequestMs: parseNumber(process.env.PERFORMANCE_SLOW_REQUEST_MS, 800),
  criticalRequestMs: parseNumber(process.env.PERFORMANCE_CRITICAL_REQUEST_MS, 2000),
  slowQueryMs: parseNumber(process.env.PERFORMANCE_SLOW_QUERY_MS, 300),
  maxSlowQueriesPerRequest: Math.max(1, Math.floor(parseNumber(process.env.PERFORMANCE_MAX_SLOW_QUERIES_PER_REQUEST, 10))),
  payloadMediumBytes: parseNumber(process.env.PERFORMANCE_PAYLOAD_MEDIUM_BYTES, 100 * 1024),
  payloadLargeBytes: parseNumber(process.env.PERFORMANCE_PAYLOAD_LARGE_BYTES, 500 * 1024),
  payloadCriticalBytes: parseNumber(process.env.PERFORMANCE_PAYLOAD_CRITICAL_BYTES, 1024 * 1024)
};

export function classifyDuration(durationMs: number): PerformanceClassification {
  if (durationMs > performanceConfig.criticalRequestMs) return "critical";
  if (durationMs > performanceConfig.slowRequestMs) return "slow";
  if (durationMs > 300) return "moderate";
  return "fast";
}

export function classifyPayload(bytes: number | null): PayloadClassification {
  if (bytes === null) return "unknown";
  if (bytes > performanceConfig.payloadCriticalBytes) return "critical";
  if (bytes > performanceConfig.payloadLargeBytes) return "large";
  if (bytes > performanceConfig.payloadMediumBytes) return "medium";
  return "small";
}

export function shouldSamplePerformance() {
  if (!performanceConfig.enabled) return false;
  if (performanceConfig.sampleRate >= 1) return true;
  if (performanceConfig.sampleRate <= 0) return false;
  return Math.random() < performanceConfig.sampleRate;
}
