#!/usr/bin/env node
/**
 * Wikipedia Data Ingestion Script (JavaScript)
 * Simpler version without TypeScript loader issues
 */

import fs from 'fs/promises';
import path from 'path';

const DEFAULT_OPTIONS = {
	maxRetries: 5,
	rateLimit: 10,
	windowSeconds: 60,
};

const CLI_FLAGS = {
	'--max-retries': 'maxRetries',
	'--rate-limit': 'rateLimit',
	'--window-seconds': 'windowSeconds',
};

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isIngestableArticleFile(filename) {
	return (
		filename.endsWith('.json') &&
		!filename.startsWith('_') &&
		filename !== 'curated-list.json'
	);
}

function isRetryableStatus(status) {
	return status === 429 || (status >= 500 && status < 600);
}

function createRateLimiter({ limit, windowMs, bufferMs = 500 }) {
	const timestamps = [];

	return {
		async throttle() {
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
		recordSuccess() {
			timestamps.push(Date.now());
		},
	};
}

async function parseRetryAfter(response) {
	const header = response.headers.get('Retry-After');
	if (header) {
		const seconds = parseInt(header, 10);
		if (!Number.isNaN(seconds)) {
			return seconds * 1000;
		}
	}

	try {
		const body = await response.clone().json();
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
	url,
	options,
	{ maxRetries = 5, baseDelayMs = 2000 } = {},
) {
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

		let delayMs;
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

function parseArgs(argv) {
	const positional = [];
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

async function ingestWikipediaDataset(config) {
	const { workerUrl, dataDirectory, maxRetries, rateLimit, windowSeconds } =
		config;

	const limiter = createRateLimiter({
		limit: rateLimit,
		windowMs: windowSeconds * 1000,
	});

	console.log('Starting Wikipedia data ingestion...');
	console.log(`Worker URL: ${workerUrl}`);
	console.log(`Data directory: ${dataDirectory}`);

	try {
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
		const failedFiles = [];

		for (let i = 0; i < jsonFiles.length; i++) {
			const file = jsonFiles[i];
			console.log(`\n[${i + 1}/${jsonFiles.length}] ${file}`);

			try {
				const article = JSON.parse(
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

				const result = await response.json();
				limiter.recordSuccess();
				console.log(
					`  ✓ ${article.title} (workflow: ${result.data?.workflowId ?? 'n/a'})`,
				);
				successCount++;
			} catch (error) {
				console.error(`  ✗ ${file}: ${error.message}`);
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
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
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
