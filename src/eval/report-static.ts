/**
 * Serve the committed demo-scale eval report snapshot.
 * Live regeneration is POST /api/v1/eval/run (does not persist to disk).
 */

import reportJson from '../../data/eval/report.json';
import type { EvalReport } from './types';

export function getStaticEvalReport(): EvalReport {
	const report = reportJson as EvalReport;
	return {
		...report,
		demoScale: true,
		source: 'static',
	};
}
