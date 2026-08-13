#!/usr/bin/env node
/**
 * Build curated corpus from local Wikipedia fetch + generate SPA manifest.
 *
 * Usage:
 *   node scripts/build-corpus.js              # manifest only (corpus JSON already committed)
 *   node scripts/build-corpus.js --copy       # copy from data/wikipedia using curated-list.json
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CORPUS_DIR = path.join(ROOT, 'data/corpus');
const WIKI_DIR = path.join(ROOT, 'data/wikipedia');
const MANIFEST_PATH = path.join(ROOT, 'ui/src/content/corpus-manifest.json');
const CURATED_LIST_PATH = path.join(CORPUS_DIR, 'curated-list.json');
const DEFAULT_CHUNK_SIZE = 500;

function slugify(title) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function estimateChunkCount(content, chunkSize = DEFAULT_CHUNK_SIZE) {
	if (!content) return 0;
	return Math.max(1, Math.ceil(content.length / chunkSize));
}

async function copyFromWikipedia() {
	const listRaw = await fs.readFile(CURATED_LIST_PATH, 'utf-8');
	const { articles } = JSON.parse(listRaw);

	await fs.mkdir(CORPUS_DIR, { recursive: true });

	let copied = 0;
	let missing = 0;

	for (const filename of articles) {
		const sourcePath = path.join(WIKI_DIR, filename);
		const destPath = path.join(CORPUS_DIR, filename);

		try {
			const raw = await fs.readFile(sourcePath, 'utf-8');
			const article = JSON.parse(raw);
			const id = slugify(article.title);

			const corpusArticle = {
				id,
				title: article.title,
				content: article.content,
				metadata: article.metadata || {},
			};

			await fs.writeFile(destPath, JSON.stringify(corpusArticle, null, 2));
			copied++;
		} catch {
			console.warn(`  ⚠ Missing source: ${filename}`);
			missing++;
		}
	}

	console.log(
		`Copied ${copied} articles to data/corpus/ (${missing} missing from data/wikipedia/)`,
	);
}

async function buildManifest() {
	const files = await fs.readdir(CORPUS_DIR);
	const jsonFiles = files.filter(
		(f) => f.endsWith('.json') && f !== 'curated-list.json',
	);

	const entries = [];

	for (const file of jsonFiles) {
		const raw = await fs.readFile(path.join(CORPUS_DIR, file), 'utf-8');
		const article = JSON.parse(raw);
		const id = article.id || slugify(article.title);
		const content = article.content || '';

		entries.push({
			id,
			title: article.title,
			charCount: content.length,
			sourceUrl: article.metadata?.url || null,
			chunkCount: estimateChunkCount(content),
		});
	}

	entries.sort((a, b) => a.title.localeCompare(b.title));

	const manifest = {
		generatedAt: new Date().toISOString(),
		articleCount: entries.length,
		articles: entries,
	};

	await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
	console.log(
		`Manifest written: ${MANIFEST_PATH} (${entries.length} articles)`,
	);
}

async function main() {
	const copy = process.argv.includes('--copy');

	if (copy) {
		console.log('Copying curated articles from data/wikipedia/...');
		await copyFromWikipedia();
	}

	await buildManifest();
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
