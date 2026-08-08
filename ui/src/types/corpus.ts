export interface CorpusManifestEntry {
  id: string;
  title: string;
  charCount: number;
  sourceUrl: string | null;
  chunkCount: number;
}

export interface CorpusManifest {
  generatedAt: string;
  articleCount: number;
  articles: CorpusManifestEntry[];
}

export interface CorpusArticle {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
