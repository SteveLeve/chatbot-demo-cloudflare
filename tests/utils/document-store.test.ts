import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentStore } from '../../src/utils/document-store';
import { Logger } from '../../src/utils/logger';
import type { Env } from '../../src/types';

type DocumentRow = {
	id: string;
	article_id: string;
	title: string;
	metadata: string;
	created_at: number;
	updated_at: number;
};

type ChunkRow = {
	id: string;
	document_id: string;
	text: string;
	chunk_index: number;
	metadata: string;
	created_at: number;
};

function createMockDatabase() {
	const documents = new Map<string, DocumentRow>();
	const chunks: ChunkRow[] = [];

	const db = {
		prepare: vi.fn((sql: string) => ({
			bind: vi.fn((...args: unknown[]) => ({
				first: vi.fn(async () => {
					if (
						sql.includes('FROM documents') &&
						sql.includes('article_id = ?')
					) {
						const articleId = args[0] as string;
						const row = [...documents.values()].find(
							(d) => d.article_id === articleId,
						);
						return row ?? null;
					}
					if (sql.includes('FROM documents') && sql.includes('id = ?')) {
						return documents.get(args[0] as string) ?? null;
					}
					return null;
				}),
				all: vi.fn(async () => {
					if (sql.includes('FROM chunks') && sql.includes('document_id = ?')) {
						const documentId = args[0] as string;
						return {
							results: chunks.filter((c) => c.document_id === documentId),
						};
					}
					return { results: [] };
				}),
				run: vi.fn(async () => {
					if (sql.includes('INSERT INTO documents')) {
						const [id, articleId, title, metadata, createdAt, updatedAt] =
							args as [string, string, string, string, number, number];

						const existing = [...documents.values()].find(
							(d) => d.article_id === articleId,
						);

						if (existing && sql.includes('ON CONFLICT(article_id)')) {
							if (existing.id !== id) {
								documents.delete(existing.id);
							}
							const updated: DocumentRow = {
								id,
								article_id: articleId,
								title,
								metadata,
								created_at: existing.created_at,
								updated_at: updatedAt,
							};
							documents.set(id, updated);
							return { meta: { changes: 1 } };
						}

						documents.set(id, {
							id,
							article_id: articleId,
							title,
							metadata,
							created_at: createdAt,
							updated_at: updatedAt,
						});
						return { meta: { changes: 1 } };
					}

					if (sql.includes('DELETE FROM chunks WHERE document_id = ?')) {
						const documentId = args[0] as string;
						const before = chunks.length;
						const remaining = chunks.filter(
							(c) => c.document_id !== documentId,
						);
						chunks.length = 0;
						chunks.push(...remaining);
						return { meta: { changes: before - chunks.length } };
					}

					return { meta: { changes: 0 } };
				}),
			})),
			batch: vi.fn(
				async (statements: Array<{ run: () => Promise<unknown> }>) => {
					for (const statement of statements) {
						await statement.run();
					}
				},
			),
		})),
		batch: vi.fn(async (statements: Array<{ run: () => Promise<unknown> }>) => {
			for (const statement of statements) {
				await statement.run();
			}
		}),
		_chunks: chunks,
		_documents: documents,
	};

	return db;
}

function createStore(db: ReturnType<typeof createMockDatabase>) {
	const env = {
		DATABASE: db,
		VECTOR_INDEX: {
			upsert: vi.fn(),
			query: vi.fn(),
			deleteByIds: vi.fn(),
		},
		ARTICLES_BUCKET: {
			put: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
		},
	} as unknown as Env;

	return new DocumentStore(env, new Logger({ test: true }, 'ERROR'));
}

describe('DocumentStore', () => {
	let db: ReturnType<typeof createMockDatabase>;

	beforeEach(() => {
		db = createMockDatabase();
	});

	describe('createDocument', () => {
		it('returns the persisted row after upserting a new document', async () => {
			const store = createStore(db);

			const result = await store.createDocument({
				id: 'doc-article-1',
				articleId: 'article-1',
				title: 'First title',
				metadata: { source: 'test' },
			});

			expect(result).toEqual({
				id: 'doc-article-1',
				articleId: 'article-1',
				title: 'First title',
				metadata: { source: 'test' },
				createdAt: expect.any(Number),
				updatedAt: expect.any(Number),
			});
		});

		it('updates id on conflict and returns the converged document id', async () => {
			const store = createStore(db);
			const legacyCreatedAt = Date.now() - 60_000;

			db._documents.set('legacy-uuid', {
				id: 'legacy-uuid',
				article_id: 'article-1',
				title: 'Legacy title',
				metadata: JSON.stringify({ source: 'legacy' }),
				created_at: legacyCreatedAt,
				updated_at: legacyCreatedAt,
			});

			const result = await store.createDocument({
				id: 'doc-article-1',
				articleId: 'article-1',
				title: 'Updated title',
				metadata: { source: 'deterministic' },
			});

			expect(result.id).toBe('doc-article-1');
			expect(result.articleId).toBe('article-1');
			expect(result.title).toBe('Updated title');
			expect(result.metadata).toEqual({ source: 'deterministic' });
			expect(result.createdAt).toBe(legacyCreatedAt);
			expect(db._documents.has('legacy-uuid')).toBe(false);
			expect(db._documents.has('doc-article-1')).toBe(true);
		});

		it('getDocumentByArticleId returns the post-upsert id', async () => {
			const store = createStore(db);

			db._documents.set('legacy-uuid', {
				id: 'legacy-uuid',
				article_id: 'article-2',
				title: 'Legacy',
				metadata: '{}',
				created_at: Date.now(),
				updated_at: Date.now(),
			});

			await store.createDocument({
				id: 'doc-article-2',
				articleId: 'article-2',
				title: 'Updated',
				metadata: {},
			});

			const fetched = await store.getDocumentByArticleId('article-2');
			expect(fetched?.id).toBe('doc-article-2');
		});
	});

	describe('deleteChunksByDocument', () => {
		it('removes all chunks for the given document id', async () => {
			const store = createStore(db);
			const now = Date.now();

			db._chunks.push(
				{
					id: 'chunk-0',
					document_id: 'doc-1',
					text: 'first',
					chunk_index: 0,
					metadata: '{}',
					created_at: now,
				},
				{
					id: 'chunk-1',
					document_id: 'doc-1',
					text: 'second',
					chunk_index: 1,
					metadata: '{}',
					created_at: now,
				},
				{
					id: 'chunk-other',
					document_id: 'doc-2',
					text: 'other',
					chunk_index: 0,
					metadata: '{}',
					created_at: now,
				},
			);

			const deleted = await store.deleteChunksByDocument('doc-1');

			expect(deleted).toBe(2);
			expect(db._chunks).toHaveLength(1);
			expect(db._chunks[0]?.document_id).toBe('doc-2');
		});
	});
});
