export interface GlossaryTerm {
  term: string;
  definition: string;
  learnMore?: Array<{ text: string; url: string }>;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Chunking',
    definition: 'The process of splitting large documents into smaller, semantically meaningful pieces before indexing them in a vector database. Proper chunking preserves context within each chunk while keeping chunks small enough to fit in language model context windows. Chunk size (typically 100-1000 tokens) significantly impacts retrieval quality and must be tuned for your specific domain.',
    learnMore: [
      { text: 'LangChain Text Splitters', url: 'https://python.langchain.com/docs/modules/data_connection/document_transformers/' },
      { text: 'Pinecone Chunking Strategies', url: 'https://www.pinecone.io/learn/chunking-strategies/' }
    ]
  },
  {
    term: 'Cosine Similarity',
    definition: 'A mathematical measure of similarity between two vectors, calculated as the cosine of the angle between them in multi-dimensional space. Cosine similarity ranges from -1 to 1 (or 0 to 1 for embeddings), with values closer to 1 indicating very similar vectors. It\'s the standard similarity metric for semantic search because it focuses on direction (meaning) rather than magnitude (length).',
    learnMore: [
      { text: 'Cosine Similarity Explained', url: 'https://en.wikipedia.org/wiki/Cosine_similarity' },
      { text: 'Semantic Search with Embeddings', url: 'https://www.pinecone.io/learn/semantic-search/' }
    ]
  },
  {
    term: 'Embeddings',
    definition: 'Numerical vector representations of text that capture semantic meaning in a high-dimensional space (typically 384 to 3072 dimensions). Embeddings enable semantic search by placing conceptually similar text nearby in the vector space. Unlike keyword matching, embeddings recognize that "vehicle" and "car" are semantically related even though they use different words. Embedding quality directly impacts RAG system performance.',
    learnMore: [
      { text: 'OpenAI Embeddings Guide', url: 'https://platform.openai.com/docs/guides/embeddings' },
      { text: 'Hugging Face Sentence Transformers', url: 'https://www.sbert.net/' }
    ]
  },
  {
    term: 'Hallucination',
    definition: 'When a language model generates plausible-sounding but false, unsupported, or outdated information with confidence. Hallucinations can involve fabricating facts, misrepresenting sources, or combining information incorrectly. RAG systems reduce but don\'t eliminate hallucinations by grounding responses in retrieved documents. Users should always verify critical claims against the cited sources.',
    learnMore: [
      { text: 'Understanding LLM Hallucinations', url: 'https://arxiv.org/abs/2309.01219' },
      { text: 'Measuring Faithfulness in RAG', url: 'https://www.anthropic.com/research/measuring-faithfulness' }
    ]
  },
  {
    term: 'Prompt Injection',
    definition: 'A security attack where malicious users craft prompts designed to manipulate language model behavior, bypass safety guidelines, or extract sensitive information. Examples include embedding hidden instructions in documents that the model retrieves and follows, or asking the model to ignore previous instructions. Defending against prompt injection requires input validation, instruction hierarchies, and careful system prompt design.',
    learnMore: [
      { text: 'OWASP LLM Top 10', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' },
      { text: 'Prompt Injection Attacks and Defenses', url: 'https://github.com/OWASP/LLM-based-Application-Security-Top-10' }
    ]
  },
  {
    term: 'RAG (Retrieval-Augmented Generation)',
    definition: 'An AI architecture that enhances language models by retrieving relevant information from a knowledge base and using it as context when generating responses. Instead of relying solely on training data, RAG systems fetch specific documents matching user queries and ground their answers in those sources. This dramatically improves accuracy, factuality, and currency while enabling the model to answer questions about information it was never trained on.',
    learnMore: [
      { text: 'RAG Paper: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', url: 'https://arxiv.org/abs/2005.11401' },
      { text: 'LangChain RAG Tutorials', url: 'https://python.langchain.com/docs/use_cases/question_answering/' }
    ]
  },
  {
    term: 'Semantic Search',
    definition: 'A search method that understands the meaning and intent of queries rather than just matching keywords. Semantic search uses embeddings to find conceptually similar content even when exact words differ. For example, searching for "vehicle" finds documents about "cars," "trucks," and "automobiles." Semantic search is more forgiving and contextually aware than traditional keyword search but computationally more expensive.',
    learnMore: [
      { text: 'Weaviate: Semantic Search Explained', url: 'https://weaviate.io/blog/semantic-search-explained' },
      { text: 'Pinecone: Semantic Search Guide', url: 'https://www.pinecone.io/learn/semantic-search/' }
    ]
  },
  {
    term: 'Vector Database',
    definition: 'A specialized database system optimized for storing and querying high-dimensional vectors (embeddings). Vector databases use algorithms like IVFFLAT, HNSW, or LSH to perform efficient similarity search on millions or billions of vectors. Examples include Pinecone, Weaviate, Chroma, and pgvector (PostgreSQL extension). Vector databases are essential infrastructure for RAG systems, enabling fast retrieval of relevant documents.',
    learnMore: [
      { text: 'pgvector: Open-Source Vector Extension for PostgreSQL', url: 'https://github.com/pgvector/pgvector' },
      { text: 'Pinecone: Vector Database Overview', url: 'https://www.pinecone.io/learn/what-is-a-vector-database/' }
    ]
  }
];
