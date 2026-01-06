import type { SidebarSectionData } from '../types/sidebar';

export const sidebarSections: SidebarSectionData[] = [
  {
    id: 'what-is-rag',
    title: 'What is RAG?',
    content: `Retrieval-Augmented Generation (RAG) is a technique that enhances large language models by grounding their responses in factual information retrieved from a knowledge base. Rather than relying solely on the model's training data, RAG systems fetch relevant documents or data sources and use them to inform the AI's answer, significantly improving accuracy and relevance.

RAG works by converting user queries into semantic embeddings, searching a vector database for similar content, and providing those retrieved documents as context to the language model. This approach solves a critical problem: LLMs can hallucinate or provide outdated information when forced to rely purely on their training data.`,
    defaultOpen: true,
    links: [
      {
        text: 'RAG Research Paper',
        to: 'https://arxiv.org/abs/2005.11401',
        external: true
      }
    ]
  },
  {
    id: 'vector-embeddings-search',
    title: 'Vector Embeddings & Search',
    content: `Embeddings are numerical representations of text that capture semantic meaning in a high-dimensional space. Instead of matching keywords, embeddings enable "semantic search" where similar concepts are found even if they use different words. For example, "vehicle" and "car" would have similar embeddings and could be matched together.

Cosine similarity is the metric used to measure how related two embeddings are, typically scored between 0 (completely unrelated) and 1 (identical meaning). Document chunking—breaking large texts into smaller, meaningful segments—is crucial because language models have limited context windows. Proper chunking ensures that retrieved context is coherent, focused, and fits within the model's processing capacity while maintaining semantic coherence.`,
    defaultOpen: false,
    links: [
      {
        text: 'Understanding Embeddings',
        to: 'https://platform.openai.com/docs/guides/embeddings',
        external: true
      }
    ]
  },
  {
    id: 'limitations-failure-modes',
    title: 'Limitations & Failure Modes',
    content: `Even with RAG, AI models can still hallucinate or generate plausible-sounding but incorrect information. Having sources doesn't guarantee accuracy—poor retrieval of irrelevant documents means the model works with bad context, leading to poor answers. Additionally, RAG systems are only as current as their knowledge base; outdated or incomplete data will produce outdated answers.

Context window limits pose another challenge: when you have extensive relevant documents, not all can fit into the model's context window, forcing a choice about what to include. Retrieval failures can stem from poorly chunked documents, inadequate embeddings, or misaligned search queries. High-quality RAG requires continuous monitoring, regular knowledge base updates, and careful tuning of chunking strategies and similarity thresholds.`,
    defaultOpen: false,
    links: []
  },
  {
    id: 'citations-transparency',
    title: 'Citations & Transparency',
    content: `Transparency is fundamental to trustworthy AI. Every answer in a RAG system should include citations showing which source documents informed the response, allowing users to verify claims independently. This builds trust and enables fact-checking—crucial for client-facing applications.

Similarity scores (typically shown as percentages from 0-100) indicate how closely a retrieved document matches the query, with higher scores suggesting better relevance. However, these scores should be interpreted as confidence indicators, not certainty guarantees. Users should always verify critical information against the original sources, especially for high-stakes decisions. This human-in-the-loop approach transforms RAG from a black box into a transparent research tool.`,
    defaultOpen: false,
    links: []
  },
  {
    id: 'security-production',
    title: 'Security & Production',
    content: `Deploying RAG systems in production introduces security considerations. Prompt injection attacks occur when malicious users craft queries designed to manipulate the model's behavior or bypass safety guidelines. Data leakage is a risk if the knowledge base contains sensitive information—careful access controls and data governance are essential.

Production RAG systems require rate limiting to prevent abuse, authentication to restrict access, and comprehensive logging for security audits. Regular security reviews, input validation, and output filtering help mitigate risks. The knowledge base itself must be managed with appropriate permissions, versioning, and audit trails. Following industry best practices and security frameworks ensures RAG systems remain both powerful and safe.`,
    defaultOpen: false,
    links: [
      {
        text: 'OWASP LLM Top 10',
        to: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
        external: true
      }
    ]
  },
  {
    id: 'learn-more',
    title: 'Learn More',
    content: `Explore additional resources to deepen your understanding of RAG technology, implementation details, and best practices.`,
    defaultOpen: false,
    links: [
      {
        text: '📖 Frequently Asked Questions',
        to: '/docs/faq'
      },
      {
        text: '📚 Technical Glossary',
        to: '/docs/glossary'
      }
    ]
  }
];
