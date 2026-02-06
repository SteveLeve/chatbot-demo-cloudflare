/**
 * Ingestion Workflow
 * Durable workflow for ingesting Wikipedia articles
 *
 * Steps:
 * 1. Store article in R2
 * 2. Create document metadata in D1
 * 3. Split text into chunks (optional)
 * 4. Store chunks in D1
 * 5. Generate embeddings for chunks
 * 6. Insert vectors into Vectorize
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type {
  Env,
  IngestionWorkflowParams,
  IngestionWorkflowResult,
  WikipediaArticle,
  TextChunk,
  EmbeddingResponse,
  VectorMetadata,
} from './types';
import { createLogger } from './utils/logger';
import { createDocumentStore } from './utils/document-store';
import { chunkWikipediaArticle } from './utils/chunking';

export class IngestionWorkflow extends WorkflowEntrypoint<Env, IngestionWorkflowParams> {
  async run(event: WorkflowEvent<IngestionWorkflowParams>, step: WorkflowStep) {
    const { articleId, title, content, metadata, chunkSize, chunkOverlap } = event.payload;

    const logger = createLogger(
      { workflow: 'ingestion', articleId, title },
      this.env.LOG_LEVEL
    );
    logger.info('Starting ingestion workflow');

    try {
      // Step 1: Store article in R2
      await step.do('store-article', async () => {
        logger.info('Step 1: Storing article in R2');

        const article: WikipediaArticle = {
          id: articleId,
          title,
          content,
          metadata: {
            ...metadata,
            wordCount: content.split(/\s+/).length,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const store = createDocumentStore(this.env, logger);
        await store.storeArticle(article);

        return { success: true };
      });

      // Step 2: Create document metadata in D1
      const documentId = await step.do('create-document', async () => {
        logger.info('Step 2: Creating document metadata');

        const docId = crypto.randomUUID();
        const store = createDocumentStore(this.env, logger);

        await store.createDocument({
          id: docId,
          articleId,
          title,
          metadata,
        });

        return docId;
      });

      // Step 3: Split text into chunks
      const chunks = await step.do('split-text', async () => {
        logger.info('Step 3: Splitting text into chunks');

        if (!this.env.ENABLE_TEXT_SPLITTING) {
          logger.info('Text splitting disabled, using full content as single chunk');
          return [{
            text: content,
            index: 0,
            metadata: { title },
          }];
        }

        const chunkResults = await chunkWikipediaArticle(
          content,
          title,
          {
            chunkSize: chunkSize || this.env.DEFAULT_CHUNK_SIZE,
            chunkOverlap: chunkOverlap || this.env.DEFAULT_CHUNK_OVERLAP,
          },
          logger
        );

        return chunkResults;
      });

      // Step 4: Store chunks in D1
      const chunkRecords = await step.do('store-chunks', async () => {
        logger.info('Step 4: Storing chunks in D1', { count: chunks.length });

        const store = createDocumentStore(this.env, logger);
        const chunkData: Omit<TextChunk, 'createdAt'>[] = chunks.map((chunk) => ({
          id: crypto.randomUUID(),
          documentId,
          text: chunk.text,
          chunkIndex: chunk.index,
          metadata: chunk.metadata,
        }));

        const created = await store.createChunks(chunkData);
        return created;
      });

      // Step 5: Generate embeddings for chunks
      const embeddings = await step.do('generate-embeddings', async () => {
        logger.info('Step 5: Generating embeddings', { count: chunkRecords.length });

        const texts = chunkRecords.map((c) => c.text);

        // Generate embeddings in batches to avoid hitting limits
        const batchSize = 10;
        const allEmbeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);
        const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: batch,
        }, this.env.USE_AI_GATEWAY && this.env.AI_GATEWAY_ID ? {
          gateway: { id: this.env.AI_GATEWAY_ID },
        } : undefined) as EmbeddingResponse;

          allEmbeddings.push(...result.data);
        }

        return allEmbeddings;
      });

      // Step 6: Insert vectors into Vectorize
      await step.do('insert-vectors', async () => {
        logger.info('Step 6: Inserting vectors into Vectorize', { count: embeddings.length });

        const store = createDocumentStore(this.env, logger);
        const vectors = chunkRecords.map((chunk, idx) => {
          const metadata: VectorMetadata = {
            documentId,
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            title,
          };

          return {
            id: chunk.id,
            values: embeddings[idx] || [],
            metadata,
          };
        });

        await store.insertVectors(vectors);
        return { success: true, count: vectors.length };
      });

      const result: IngestionWorkflowResult = {
        success: true,
        documentId,
        chunksCreated: chunkRecords.length,
        vectorsInserted: embeddings.length,
      };

      logger.info('Ingestion workflow completed', result);
      return result;
    } catch (error) {
      logger.error('Ingestion workflow failed', error);

      const result: IngestionWorkflowResult = {
        success: false,
        documentId: '',
        chunksCreated: 0,
        vectorsInserted: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return result;
    }
  }
}
