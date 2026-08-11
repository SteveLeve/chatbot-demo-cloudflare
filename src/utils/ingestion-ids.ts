/**
 * Deterministic IDs for idempotent ingestion workflow steps (#15).
 */

export function deterministicDocumentId(articleId: string): string {
	return `doc-${articleId}`;
}

export function deterministicChunkId(
	articleId: string,
	chunkIndex: number,
): string {
	return `chunk-${articleId}-${chunkIndex}`;
}

const EMBEDDING_BATCH_TIMEOUT_MS = 30_000;

/**
 * Reject when promise does not settle within ms (#14).
 */
export async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	label: string,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(
			() => reject(new Error(`${label} timed out after ${ms}ms`)),
			ms,
		);
	});

	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
	}
}

export { EMBEDDING_BATCH_TIMEOUT_MS };
