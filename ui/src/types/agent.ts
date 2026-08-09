import type { DocumentSource } from './index';

/** Trace types shared with the worker — keep in sync with src/types/trace.ts */
export type {
  TraceEvent,
  TraceEventType,
  TraceEventDetail,
  RetrieveTraceDetail,
  ToolTraceDetail,
  GenerateTraceDetail,
} from '../../../src/types/trace';

import type { TraceEvent } from '../../../src/types/trace';

/** Wire contract for RAGAgent state — keep in sync with src/types/agent-wire.ts */
export interface RAGAgentState {
  traceEvents: TraceEvent[];
  traceId?: string;
  spanId?: string;
  lastSources: DocumentSource[];
}
