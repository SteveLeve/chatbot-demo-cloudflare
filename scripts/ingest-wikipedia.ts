/**
 * Wikipedia Data Ingestion Script
 * Processes Wikipedia dataset and uploads to Cloudflare Workers
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface WikipediaArticle {
	title: string;
	content: string;
	id?: string;
	metadata?: {
		categories?: string[];
		url?: string;
		[key: string]: unknown;
	};
}

interface IngestionConfig {
	workerUrl: string;
	dataDirectory: string;
	maxRetries: number;
	rateLimit: number;
	windowSeconds: number;
}

interface IngestApiResponse {
	data?: {
		workflowId?: string;
	};
}

const DEFAULT_OPTIONS: Pick<
	IngestionConfig,
	'maxRetries' | 'rateLimit' | 'windowSeconds'
> = {
	maxRetries: 5,
	rateLimit: 10,
	windowSeconds: 60,
};

const CLI_FLAGS: Record<string, keyof typeof DEFAULT_OPTIONS> = {
	'--max-retries': 'maxRetries',
	'--rate-limit': 'rateLimit',
	'--window-seconds': 'windowSeconds',
};

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIngestableArticleFile(filename: string): boolean {
	return (
		filename.endsWith('.json') &&
		!filename.startsWith('_') &&
		filename !== 'curated-list.json'
	);
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || (status >= 500 && status < 600);
}

function createRateLimiter({
	limit,
	windowMs,
	bufferMs = 500,
}: {
	limit: number;
	windowMs: number;
	bufferMs?: number;
}) {
	const timestamps: number[] = [];

	return {
		async throttle(): Promise<void> {
			while (true) {
				const now = Date.now();
				while (timestamps[0] && now - timestamps[0] >= windowMs) {
					timestamps.shift();
				}
				if (timestamps.length < limit) {
					return;
				}
				const waitMs = windowMs - (now - timestamps[0]) + bufferMs;
				console.log(
					`  Pacing: waiting ${Math.ceil(waitMs / 1000)}s (rate limit ${limit}/${windowMs / 1000}s)...`,
				);
				await sleep(waitMs);
			}
		},
		recordSuccess(): void {
			timestamps.push(Date.now());
		},
	};
}

async function parseRetryAfter(response: Response): Promise<number | null> {
	const header = response.headers.get('Retry-After');
	if (header) {
		const seconds = parseInt(header, 10);
		if (!Number.isNaN(seconds)) {
			return seconds * 1000;
		}
	}

	try {
		const body = (await response.clone().json()) as {
			error?: { details?: { retryAfter?: number } };
		};
		const retryAfter = body?.error?.details?.retryAfter;
		if (typeof retryAfter === 'number' && retryAfter > 0) {
			return retryAfter * 1000;
		}
	} catch {
		// ignore parse errors
	}

	return null;
}

async function fetchWithRetry(
	url: string,
	options: RequestInit,
	{ maxRetries = 5, baseDelayMs = 2000 } = {},
): Promise<Response> {
	let attempt = 0;

	while (true) {
		const response = await fetch(url, options);

		if (
			response.ok ||
			!isRetryableStatus(response.status) ||
			attempt >= maxRetries
		) {
			return response;
		}

		attempt++;

		let delayMs: number;
		if (response.status === 429) {
			delayMs = (await parseRetryAfter(response)) ?? 60_000;
			console.warn(
				`  Rate limited, waiting ${Math.ceil(delayMs / 1000)}s before retry (attempt ${attempt}/${maxRetries})...`,
			);
		} else {
			delayMs = Math.min(
				baseDelayMs * 2 ** (attempt - 1) + Math.random() * 500,
				60_000,
			);
			console.warn(
				`  Server error ${response.status}, retrying in ${Math.ceil(delayMs / 1000)}s (attempt ${attempt}/${maxRetries})...`,
			);
		}

		await sleep(delayMs);
	}
}

function parseArgs(argv: string[]): {
	positional: string[];
	options: typeof DEFAULT_OPTIONS;
} {
	const positional: string[] = [];
	const options = { ...DEFAULT_OPTIONS };

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const optionKey = CLI_FLAGS[arg];
		if (optionKey && argv[i + 1]) {
			options[optionKey] = parseInt(argv[++i], 10);
		} else if (!arg.startsWith('--')) {
			positional.push(arg);
		}
	}

	return { positional, options };
}

async function ingestWikipediaDataset(config: IngestionConfig): Promise<void> {
	const { workerUrl, dataDirectory, maxRetries, rateLimit, windowSeconds } =
		config;

	const limiter = createRateLimiter({
		limit: rateLimit,
		windowMs: windowSeconds * 1000,
	});

	console.log('Starting Wikipedia data ingestion...');
	console.log(`Worker URL: ${workerUrl}`);
	console.log(`Data directory: ${dataDirectory}`);

	const files = await fs.readdir(dataDirectory);
	const jsonFiles = files.filter(isIngestableArticleFile);

	console.log(`Found ${jsonFiles.length} articles to ingest`);

	if (jsonFiles.length === 0) {
		console.warn(
			'No JSON files found. For curated corpus: npm run corpus:build -- --copy',
		);
		process.exit(1);
	}

	console.log(
		`Pacing at ${rateLimit} requests/${windowSeconds}s — ~${Math.ceil(jsonFiles.length / rateLimit)} min for ${jsonFiles.length} articles`,
	);

	let successCount = 0;
	const failedFiles: string[] = [];

	for (let i = 0; i < jsonFiles.length; i++) {
		const file = jsonFiles[i];
		console.log(`\n[${i + 1}/${jsonFiles.length}] ${file}`);

		try {
			const article: WikipediaArticle = JSON.parse(
				await fs.readFile(path.join(dataDirectory, file), 'utf-8'),
			);

			await limiter.throttle();

			const response = await fetchWithRetry(
				`${workerUrl}/api/v1/ingest`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						title: article.title,
						content: article.content,
						metadata: article.metadata,
						...(article.id ? { id: article.id } : {}),
					}),
				},
				{ maxRetries },
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${await response.text()}`);
			}

			const result = (await response.json()) as IngestApiResponse;
			limiter.recordSuccess();
			console.log(
				`  ✓ ${article.title} (workflow: ${result.data?.workflowId ?? 'n/a'})`,
			);
			successCount++;
		} catch (error) {
			console.error(
				`  ✗ ${file}:`,
				error instanceof Error ? error.message : error,
			);
			failedFiles.push(file);
		}
	}

	console.log('\n=== Ingestion Complete ===');
	console.log(`Success: ${successCount}`);
	console.log(`Failed: ${failedFiles.length}`);
	console.log(`Total: ${jsonFiles.length}`);

	if (failedFiles.length === 0) {
		console.log('\n✅ All articles ingested successfully!');
		process.exit(0);
	}

	console.warn(`\n⚠️  ${failedFiles.length} articles failed to ingest:`);
	for (const f of failedFiles) {
		console.warn(`  - ${f}`);
	}
	process.exit(1);
}

async function main() {
	const { positional, options } = parseArgs(process.argv.slice(2));

	if (positional.length < 1) {
		console.error(
			'Usage: npm run ingest <data-directory> [worker-url] [options]',
		);
		console.error('Example: npm run ingest ./data/corpus');
		console.error('Legacy bulk: npm run ingest ./data/wikipedia');
		console.error('Options:');
		console.error('  --max-retries N      Max retries on 429/5xx (default: 5)');
		console.error(
			'  --rate-limit N       Max requests per window (default: 10)',
		);
		console.error(
			'  --window-seconds N   Rate limit window in seconds (default: 60)',
		);
		process.exit(1);
	}

	const dataDirectory = path.resolve(positional[0]);
	const workerUrl = positional[1] || 'http://localhost:8787';

	try {
		await fs.access(dataDirectory);
	} catch {
		console.error(`Error: Data directory not found: ${dataDirectory}`);
		process.exit(1);
	}

	await ingestWikipediaDataset({
		workerUrl,
		dataDirectory,
		...options,
	});
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
