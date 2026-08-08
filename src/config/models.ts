/**
 * Workers AI model IDs for this demo.
 *
 * Generation: Llama 4 Scout — non-deprecated, function calling, 131k context
 * (Phase 0 / #32). Required before Agents SDK tool loop (Phase 3 / #34).
 *
 * Embeddings: BGE base remains current; changing it requires recreating the
 * Vectorize index (see #20 / #32 embedding notes).
 */
export const GENERATION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct' as const;
export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5' as const;
