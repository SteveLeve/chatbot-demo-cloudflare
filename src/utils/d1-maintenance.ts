/**
 * D1 housekeeping helpers used by the daily cron (#17).
 */

/**
 * Run SQLite ANALYZE via PRAGMA optimize so the query planner has
 * up-to-date index stats. Callers should catch errors — this must not
 * fail session cleanup.
 *
 * @see https://developers.cloudflare.com/d1/best-practices/use-indexes/
 */
export async function runPragmaOptimize(db: D1Database): Promise<void> {
	await db.prepare('PRAGMA optimize').run();
}
