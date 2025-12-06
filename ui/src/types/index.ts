export interface RAGQueryResponse {
  question: string;
  answer: string;
  sources: DocumentSource[];
  metadata: {
    pattern: string;
    latencyMs: number;
    retrievedChunks: number;
  };
}

export interface DocumentSource {
  documentId: string;
  chunkId: string;
  title: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
  };
}
