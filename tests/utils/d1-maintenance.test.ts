import { describe, it, expect, vi } from 'vitest';
import { runPragmaOptimize } from '../../src/utils/d1-maintenance';

describe('runPragmaOptimize', () => {
	it('runs PRAGMA optimize on the bound D1 database', async () => {
		const run = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
		const db = {
			prepare: vi.fn(() => ({ run })),
		} as unknown as D1Database;

		await runPragmaOptimize(db);

		expect(db.prepare).toHaveBeenCalledWith('PRAGMA optimize');
		expect(run).toHaveBeenCalledOnce();
	});
});
