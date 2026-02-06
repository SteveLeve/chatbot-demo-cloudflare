/**
 * Document store abstraction
 * Manages interactions with R2, D1, and Vectorize
 */

import type {
  Env,
  WikipediaArticle,
  DocumentMetadata,
  TextChunk,
  ChunkWithMetadata,
  VectorMetadata,
  VectorMatch,
} from '../types';
import { Logger } from './logger';

const MAX_IDS = 1000; // Maximum IDs for batch operations

export class DocumentStore {
  constructor(
    private env: Env,
    private logger: Logger
  ) {}

  // ==========================================================================
  // Article Operations (R2)
  // ==========================================================================

  /**
   * Store a Wikipedia article in R2
   */
  async storeArticle(article: WikipediaArticle): Promise<void> {
    this.logger.startTimer('storeArticle');
    this.logger.info('Storing article in R2', { articleId: article.id, title: article.title });

    try {
      await this.env.ARTICLES_BUCKET.put(
        `articles/${article.id}.json`,
        JSON.stringify(article),
        {
          httpMetadata: {
            contentType: 'application/json',
          },
          customMetadata: {
            title: article.title,
            createdAt: article.createdAt,
          },
        }
      );

      this.logger.endTimer('storeArticle', { success: true });
    } catch (error) {
      this.logger.endTimer('storeArticle', { success: false });
      this.logger.error('Failed to store article in R2', error, { articleId: article.id });
      throw error;
    }
  }

  /**
   * Retrieve a Wikipedia article from R2
   */
  async getArticle(articleId: string): Promise<WikipediaArticle | null> {
    this.logger.startTimer('getArticle');
    this.logger.debug('Retrieving article from R2', { articleId });

    try {
      const object = await this.env.ARTICLES_BUCKET.get(`articles/${articleId}.json`);

      if (!object) {
        this.logger.endTimer('getArticle', { found: false });
        return null;
      }

      const article = await object.json() as WikipediaArticle;
      this.logger.endTimer('getArticle', { found: true });
      return article;
    } catch (error) {
      this.logger.endTimer('getArticle', { success: false });
      this.logger.error('Failed to retrieve article from R2', error, { articleId });
      throw error;
    }
  }

  /**
   * Delete an article from R2
   */
  async deleteArticle(articleId: string): Promise<void> {
    this.logger.info('Deleting article from R2', { articleId });

    try {
      await this.env.ARTICLES_BUCKET.delete(`articles/${articleId}.json`);
      this.logger.info('Article deleted from R2', { articleId });
    } catch (error) {
      this.logger.error('Failed to delete article from R2', error, { articleId });
      throw error;
    }
  }

  // ==========================================================================
  // Document Metadata Operations (D1)
  // ==========================================================================

  /**
   * Create document metadata in D1
   */
  async createDocument(doc: Omit<DocumentMetadata, 'createdAt' | 'updatedAt'>): Promise<DocumentMetadata> {
    this.logger.startTimer('createDocument');
    this.logger.info('Creating document metadata', { documentId: doc.id, title: doc.title });

    try {
      const now = Date.now();
      const metadata = JSON.stringify(doc.metadata);

      await this.env.DATABASE
        .prepare(`
          INSERT INTO documents (id, article_id, title, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(doc.id, doc.articleId, doc.title, metadata, now, now)
        .run();

      const result: DocumentMetadata = {
        ...doc,
        createdAt: now,
        updatedAt: now,
      };

      this.logger.endTimer('createDocument', { success: true });
      return result;
    } catch (error) {
      this.logger.endTimer('createDocument', { success: false });
      this.logger.error('Failed to create document metadata', error, { documentId: doc.id });
      throw error;
    }
  }

  /**
   * Get document metadata by ID
   */
  async getDocument(documentId: string): Promise<DocumentMetadata | null> {
    this.logger.debug('Getting document metadata', { documentId });

    try {
      const result = await this.env.DATABASE
        .prepare('SELECT * FROM documents WHERE id = ?')
        .bind(documentId)
        .first<any>();

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        articleId: result.article_id,
        title: result.title,
        metadata: JSON.parse(result.metadata),
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
    } catch (error) {
      this.logger.error('Failed to get document metadata', error, { documentId });
      throw error;
    }
  }

  /**
   * Delete document metadata
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.logger.info('Deleting document metadata', { documentId });

    try {
      await this.env.DATABASE
        .prepare('DELETE FROM documents WHERE id = ?')
        .bind(documentId)
        .run();

      this.logger.info('Document metadata deleted', { documentId });
    } catch (error) {
      this.logger.error('Failed to delete document metadata', error, { documentId });
      throw error;
    }
  }

  // ==========================================================================
  // Chunk Operations (D1)
  // ==========================================================================

  /**
   * Create text chunks in D1
   */
  async createChunks(chunks: Omit<TextChunk, 'createdAt'>[]): Promise<TextChunk[]> {
    this.logger.startTimer('createChunks');
    this.logger.info('Creating text chunks', { count: chunks.length });

    try {
      const now = Date.now();

      const statements = chunks.map((chunk) => ({
        query: `
          INSERT INTO chunks (id, document_id, text, chunk_index, metadata, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        params: [
          chunk.id,
          chunk.documentId,
          chunk.text,
          chunk.chunkIndex,
          JSON.stringify(chunk.metadata),
          now,
        ],
      }));

      try {
        await this.env.DATABASE.batch(statements);
      } catch (err) {
        // Retry once in case of transient failures
        this.logger.warn('Batch insert failed, retrying once', { error: err });
        await this.env.DATABASE.batch(statements);
      }

      const results: TextChunk[] = chunks.map((chunk) => ({ ...chunk, createdAt: now }));

      this.logger.endTimer('createChunks', { success: true, count: results.length });
      return results;
    } catch (error) {
      this.logger.endTimer('createChunks', { success: false });
      this.logger.error('Failed to create chunks', error, { count: chunks.length });
      throw error;
    }
  }

  /**
   * Get chunks by IDs with full metadata
   */
  async getChunksWithMetadata(chunkIds: string[]): Promise<ChunkWithMetadata[]> {
    if (chunkIds.length === 0) {
      return [];
    }

    if (chunkIds.length > MAX_IDS) {
      this.logger.warn('Chunk IDs exceed maximum', {
        requested: chunkIds.length,
        max: MAX_IDS,
      });
      chunkIds = chunkIds.slice(0, MAX_IDS);
    }

    this.logger.startTimer('getChunksWithMetadata');
    this.logger.debug('Getting chunks with metadata', { count: chunkIds.length });

    try {
      const placeholders = chunkIds.map(() => '?').join(',');
      const query = `
        SELECT
          c.id,
          c.document_id,
          c.text,
          c.chunk_index,
          c.metadata as chunk_metadata,
          c.created_at,
          d.title,
          d.article_id,
          d.metadata as document_metadata
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.id IN (${placeholders})
        ORDER BY c.chunk_index ASC
      `;

      const { results } = await this.env.DATABASE
        .prepare(query)
        .bind(...chunkIds)
        .all<any>();

      const chunks: ChunkWithMetadata[] = (results || []).map((row) => ({
        id: row.id,
        documentId: row.document_id,
        text: row.text,
        chunkIndex: row.chunk_index,
        metadata: JSON.parse(row.chunk_metadata),
        createdAt: row.created_at,
        title: row.title,
        articleId: row.article_id,
        documentMetadata: JSON.parse(row.document_metadata),
      }));

      this.logger.endTimer('getChunksWithMetadata', { found: chunks.length });
      return chunks;
    } catch (error) {
      this.logger.endTimer('getChunksWithMetadata', { success: false });
      this.logger.error('Failed to get chunks with metadata', error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a document
   */
  async deleteChunksByDocument(documentId: string): Promise<number> {
    this.logger.info('Deleting chunks for document', { documentId });

    try {
      const result = await this.env.DATABASE
        .prepare('DELETE FROM chunks WHERE document_id = ?')
        .bind(documentId)
        .run();

      const deleted = result.meta.changes || 0;
      this.logger.info('Chunks deleted', { documentId, count: deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete chunks', error, { documentId });
      throw error;
    }
  }

  // ==========================================================================
  // Vector Operations (Vectorize)
  // ==========================================================================

  /**
   * Insert vectors into Vectorize
   */
  async insertVectors(
    vectors: Array<{
      id: string;
      values: number[];
      metadata: VectorMetadata;
    }>
  ): Promise<void> {
    if (vectors.length === 0) {
      return;
    }

    this.logger.startTimer('insertVectors');
    this.logger.info('Inserting vectors', { count: vectors.length });

    try {
      await this.env.VECTOR_INDEX.upsert(vectors);
      this.logger.endTimer('insertVectors', { success: true, count: vectors.length });
    } catch (error) {
      this.logger.endTimer('insertVectors', { success: false });
      this.logger.error('Failed to insert vectors', error, { count: vectors.length });
      throw error;
    }
  }

  /**
   * Query vectors by similarity
   */
  async queryVectors(
    embedding: number[],
    topK: number = 3,
    minSimilarity?: number
  ): Promise<VectorMatch[]> {
    this.logger.startTimer('queryVectors');
    this.logger.debug('Querying vectors', { topK, minSimilarity });

    try {
      const results = await this.env.VECTOR_INDEX.query(embedding, {
        topK,
        returnMetadata: true,
      });

      let matches: VectorMatch[] = results.matches.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata as VectorMetadata | undefined,
      }));

      // Filter by minimum similarity if specified
      if (minSimilarity !== undefined) {
        matches = matches.filter((m) => m.score >= minSimilarity);
        this.logger.debug('Filtered by similarity', {
          before: results.matches.length,
          after: matches.length,
          threshold: minSimilarity,
        });
      }

      this.logger.endTimer('queryVectors', { found: matches.length });
      return matches;
    } catch (error) {
      this.logger.endTimer('queryVectors', { success: false });
      this.logger.error('Failed to query vectors', error);
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(vectorIds: string[]): Promise<void> {
    if (vectorIds.length === 0) {
      return;
    }

    this.logger.info('Deleting vectors', { count: vectorIds.length });

    try {
      // Vectorize has a limit on batch deletes, so chunk the deletions
      const batchSize = 1000;
      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        await this.env.VECTOR_INDEX.deleteByIds(batch);
      }

      this.logger.info('Vectors deleted', { count: vectorIds.length });
    } catch (error) {
      this.logger.error('Failed to delete vectors', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a document
   */
  async deleteVectorsByDocument(documentId: string): Promise<void> {
    this.logger.info('Deleting vectors for document', { documentId });

    try {
      // Get all chunk IDs for this document
      const { results } = await this.env.DATABASE
        .prepare('SELECT id FROM chunks WHERE document_id = ?')
        .bind(documentId)
        .all<{ id: string }>();

      const chunkIds = (results || []).map((r) => r.id);

      if (chunkIds.length > 0) {
        await this.deleteVectors(chunkIds);
      }

      this.logger.info('Vectors deleted for document', {
        documentId,
        count: chunkIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to delete vectors for document', error, { documentId });
      throw error;
    }
  }
}

/**
 * Create a document store instance
 */
export function createDocumentStore(env: Env, logger: Logger): DocumentStore {
  return new DocumentStore(env, logger);
}
