/**
 * UI trace events — correlated with Workers logs via traceId/spanId
 * (see src/utils/trace.ts and src/utils/logger.ts).
 */

export type TraceEventType = 'retrieve' | 'tool' | 'generate' | 'guard';

export interface RetrieveTraceDetail {
	titles?: string[];
	scores?: number[];
	chunkIds?: string[];
	query?: string;
	matchCount?: number;
}

export interface ToolTraceDetail {
	toolName: string;
}

export interface GenerateTraceDetail {
	finishReason?: string;
	steps?: number;
}

export type TraceEventDetail =
	RetrieveTraceDetail | ToolTraceDetail | GenerateTraceDetail;

export interface TraceEvent {
	type: TraceEventType;
	summary: string;
	detail?: TraceEventDetail;
	timestamp: number;
	traceId?: string;
	spanId?: string;
}
