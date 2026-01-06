/**
 * Type definitions for Cloudflare RAG Portfolio
 */

// ============================================================================
// Environment Bindings
// ============================================================================

export interface Env {
  // AI binding
  AI: Ai;

  // D1 Database
  DATABASE: D1Database;

  // Vectorize
  VECTOR_INDEX: VectorizeIndex;

  // R2 Buckets
  ARTICLES_BUCKET: R2Bucket;

  // KV Caches
  EMBEDDINGS_CACHE: KVNamespace;
  RAG_CACHE: KVNamespace;

  // Workflows
  INGESTION_WORKFLOW: Workflow;

  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  ENABLE_TEXT_SPLITTING: boolean;
  DEFAULT_CHUNK_SIZE: number;
  DEFAULT_CHUNK_OVERLAP: number;
  DEFAULT_TOP_K: number;
  MAX_QUERY_LENGTH: number;

  // Chat logging
  vars?: {
    CHAT_LOGGING_ENABLED?: boolean;
    CHAT_LOG_IP_SALT?: string;
  };
}

// ============================================================================
// Document & Article Types
// ============================================================================

/**
 * Wikipedia article stored in R2
 */
export interface WikipediaArticle {
  id: string;
  title: string;
  content: string;
  metadata: {
    categories: string[];
    url?: string;
    lastModified?: string;
    wordCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Document metadata stored in D1
 */
export interface DocumentMetadata {
  id: string;
  articleId: string;
  title: string;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Text chunk stored in D1
 */
export interface TextChunk {
  id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  metadata: Record<string, any>;
  createdAt: number;
}

/**
 * Chunk with full metadata (joined from documents table)
 */
export interface ChunkWithMetadata extends TextChunk {
  title: string;
  articleId: string;
  documentMetadata: Record<string, any>;
}

// ============================================================================
// Vector & Retrieval Types
// ============================================================================

/**
 * Vector metadata stored in Vectorize
 */
export interface VectorMetadata {
  documentId: string;
  chunkId: string;
  chunkIndex: number;
  title: string;
}

/**
 * Vector match from Vectorize query
 */
export interface VectorMatch {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

/**
 * Document source for citations
 */
export interface DocumentSource {
  documentId: string;
  chunkId: string;
  title: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
}

// ============================================================================
// RAG Request/Response Types
// ============================================================================

/**
 * RAG query request
 */
export interface RAGQueryRequest {
  question: string;
  topK?: number;
  minSimilarity?: number;
}

/**
 * RAG query response
 */
export interface RAGQueryResponse {
  question: string;
  answer: string;
  sources: DocumentSource[];
  metadata: {
    pattern: 'basic' | 'reranking' | 'refinement' | 'agentic';
    latencyMs: number;
    retrievedChunks: number;
    tokensUsed?: number;
  };
}

// ============================================================================
// Ingestion Types
// ============================================================================

/**
 * Ingestion workflow parameters
 */
export interface IngestionWorkflowParams {
  articleId: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Ingestion workflow result
 */
export interface IngestionWorkflowResult {
  success: boolean;
  documentId: string;
  chunksCreated: number;
  vectorsInserted: number;
  error?: string;
}

/**
 * Workflow step result
 */
export interface WorkflowStepResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// AI Model Types
// ============================================================================

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  text: string | string[];
}

/**
 * Embedding response from Workers AI
 */
export interface EmbeddingResponse {
  data: number[][];
}

/**
 * LLM generation request
 */
export interface GenerationRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * LLM generation response
 */
export interface GenerationResponse {
  response?: string;
  [key: string]: any;
}

// ============================================================================
// Logging Types
// ============================================================================

/**
 * Log levels
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

// ============================================================================
// Chat Logging Types
// ============================================================================

/**
 * Parameters for logging a chat message
 */
export interface LogChatMessageParams {
  role: 'user' | 'assistant';
  content: string;
  messageIndex: number;

  // Assistant-specific metadata
  modelName?: string;
  temperature?: number;
  latencyMs?: number;
  tokenCount?: number;
  promptTokens?: number;
  completionTokens?: number;

  // RAG sources (for assistant messages)
  sources?: DocumentSource[];

  // Error tracking
  hasError?: boolean;
  errorMessage?: string;
}

/**
 * Cloudflare metadata extracted from request context
 */
export interface CloudflareMetadata {
  userAgent: string;
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  colo: string | null;
  asn: number | null;
}
