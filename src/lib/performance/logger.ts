type LogPayload = Record<string, unknown>;

export function logPerformance(payload: LogPayload) {
  console.info(JSON.stringify({ schemaVersion: 1, ...payload }));
}

export function logPerformanceError(payload: LogPayload) {
  console.error(JSON.stringify({ schemaVersion: 1, ...payload }));
}
