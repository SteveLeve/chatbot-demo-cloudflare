/**
 * UI trace events — correlated with Workers logs via traceId/spanId
 * (see src/utils/trace.ts and src/utils/logger.ts).
 */

export type TraceEventType = 'retrieve' | 'tool' | 'generate' | 'guard' | 'eval';

export interface TraceEvent {
  type: TraceEventType;
  summary: string;
  detail?: Record<string, unknown>;
  timestamp: number;
  traceId?: string;
  spanId?: string;
}
