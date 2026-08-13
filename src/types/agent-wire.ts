/**
 * Wire contract between RAGAgent (Durable Object) and the SPA.
 * Import from UI via relative path — keep shapes identical on both sides.
 */

import type { DocumentSource } from './index';
import type { TraceEvent } from './trace';

export interface RAGAgentState {
	traceEvents: TraceEvent[];
	traceId?: string;
	spanId?: string;
	lastSources: DocumentSource[];
}
