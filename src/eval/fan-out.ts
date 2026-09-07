/**
 * Eval coordinator fan-out — child batches via self service binding.
 * Public-origin self-fetch on a custom domain returns Cloudflare 522.
 */

import type { ApiResponse, Env } from '../types';
import type { EvalReport } from './types';

export type EvalChildResult =
	{ ok: true; report: EvalReport } | { ok: false; error: string };

const EVAL_CHILD_PATH = '/api/v1/eval/run';

/** Invoke a child eval batch in a separate Worker invocation (subrequest budget). */
export function fetchEvalChildBatch(
	env: Env,
	caseIds: string[],
): Promise<Response> {
	return env.SELF.fetch(
		new Request(`https://eval-internal${EVAL_CHILD_PATH}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-eval-child': '1',
			},
			body: JSON.stringify({ caseIds }),
		}),
	);
}

/** Parse a child batch HTTP response; never throws on non-JSON bodies. */
export async function parseEvalChildResponse(
	response: Response,
): Promise<EvalChildResult> {
	const text = await response.text();

	if (response.status === 522 || text.includes('error code: 522')) {
		return {
			ok: false,
			error:
				'Eval child batch timed out (522). The worker could not complete the batch in time.',
		};
	}

	if (!response.ok) {
		return {
			ok: false,
			error: `Eval child batch failed (${response.status}): ${text.slice(0, 120)}`,
		};
	}

	let payload: ApiResponse<EvalReport>;
	try {
		payload = JSON.parse(text) as ApiResponse<EvalReport>;
	} catch {
		return {
			ok: false,
			error: `Eval child batch returned non-JSON (${response.status}): ${text.slice(0, 120)}`,
		};
	}

	if (!payload.success || !payload.data) {
		return {
			ok: false,
			error:
				payload.error?.message ||
				`Eval child batch failed (${response.status})`,
		};
	}

	return { ok: true, report: payload.data };
}
