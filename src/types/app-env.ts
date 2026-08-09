import type { Env } from './index';
import type { TraceContext } from '../utils/trace';

export type AppVariables = {
	requestId: string;
	traceContext: TraceContext;
};

export type AppEnv = {
	Bindings: Env;
	Variables: AppVariables;
};
