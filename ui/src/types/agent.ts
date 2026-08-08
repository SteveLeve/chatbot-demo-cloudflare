export type TraceEventType = 'retrieve' | 'tool' | 'generate' | 'guard' | 'eval';

export interface TraceEvent {
  type: TraceEventType;
  summary: string;
  detail?: Record<string, unknown>;
  timestamp: number;
  traceId?: string;
  spanId?: string;
}

export interface RAGAgentState {
  traceEvents: TraceEvent[];
  traceId?: string;
  spanId?: string;
  lastSources?: Array<{
    documentId: string;
    chunkId: string;
    title: string;
    chunkText: string;
    chunkIndex: number;
    similarity: number;
  }>;
}
