import type { Env } from './index';
import type { TraceContext } from '../utils/trace';

export type AppVariables = {
	requestId: string;
	traceContext: TraceContext;
	/** When true, ChatLogger no-ops (red-team live tries must not land in D1). */
	skipChatLogging?: boolean;
	/** Public chat session id set by ChatLogger for privacy endpoints. */
	chatSessionId?: string;
};

export type AppEnv = {
	Bindings: Env;
	Variables: AppVariables;
};
