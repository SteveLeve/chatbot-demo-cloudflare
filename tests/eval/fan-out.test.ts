import { describe, it, expect } from 'vitest';
import { parseEvalChildResponse } from '../../src/eval/fan-out';
import type { EvalReport } from '../../src/eval/types';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('parseEvalChildResponse', () => {
	it('returns a clear message for Cloudflare 522 bodies', async () => {
		const response = new Response('error code: 522\n', { status: 522 });
		const result = await parseEvalChildResponse(response);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('522');
			expect(result.error).not.toContain('Unexpected token');
		}
	});

	it('returns non-JSON error text without throwing', async () => {
		const response = new Response('upstream failure', { status: 502 });
		const result = await parseEvalChildResponse(response);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain('502');
			expect(result.error).toContain('upstream failure');
		}
	});

	it('parses a successful child batch payload', async () => {
		const report = { caseCount: 1 } as unknown as EvalReport;
		const response = jsonResponse({ success: true, data: report });
		const result = await parseEvalChildResponse(response);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.report).toEqual(report);
		}
	});

	it('surfaces API error messages from JSON payloads', async () => {
		const response = jsonResponse({
			success: false,
			error: { message: 'rate limited' },
		});
		const result = await parseEvalChildResponse(response);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBe('rate limited');
		}
	});
});
