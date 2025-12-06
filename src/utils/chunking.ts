/**
 * Text chunking utilities
 * Wikipedia-specific chunking strategies
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import type { Logger } from './logger';

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface TextChunkResult {
  text: string;
  index: number;
  metadata: Record<string, any>;
}

/**
 * Create a text splitter for Wikipedia content
 */
export function createWikipediaSplitter(options: ChunkingOptions = {}): RecursiveCharacterTextSplitter {
  const {
    chunkSize = 500,
    chunkOverlap = 100,
    separators = [
      '\n\n\n',  // Section breaks
      '\n\n',    // Paragraph breaks
      '\n',      // Line breaks
      '. ',      // Sentence boundaries
      ' ',       // Word boundaries
    ],
  } = options;

  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators,
  });
}

/**
 * Split Wikipedia article into chunks
 */
export async function chunkWikipediaArticle(
  content: string,
  title: string,
  options: ChunkingOptions = {},
  logger?: Logger
): Promise<TextChunkResult[]> {
  logger?.info('Chunking Wikipedia article', { title, contentLength: content.length });
  logger?.startTimer('chunkArticle');

  const splitter = createWikipediaSplitter(options);

  try {
    // Split the text
    const documents = await splitter.createDocuments([content]);

    // Convert to our chunk format
    const chunks: TextChunkResult[] = documents.map((doc, index) => ({
      text: doc.pageContent,
      index,
      metadata: {
        title,
        chunkSize: doc.pageContent.length,
        hasTable: doc.pageContent.includes('|'),  // Wiki table syntax
        hasList: /^[*#]/m.test(doc.pageContent),   // Wiki list syntax
      },
    }));

    logger?.endTimer('chunkArticle', {
      chunksCreated: chunks.length,
      avgChunkSize: Math.round(
        chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length
      ),
    });

    return chunks;
  } catch (error) {
    logger?.error('Failed to chunk article', error, { title });
    throw error;
  }
}

/**
 * Estimate the number of chunks that will be created
 */
export function estimateChunkCount(
  contentLength: number,
  chunkSize: number = 500,
  chunkOverlap: number = 100
): number {
  if (contentLength <= chunkSize) {
    return 1;
  }

  const effectiveChunkSize = chunkSize - chunkOverlap;
  return Math.ceil((contentLength - chunkSize) / effectiveChunkSize) + 1;
}
