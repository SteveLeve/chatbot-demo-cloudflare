export interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  relatedLinks?: Array<{ text: string; to: string; external?: boolean }>;
}

export interface FaqCategory {
  id: string;
  title: string;
  questions: FaqQuestion[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: 'rag-basics',
    title: 'RAG Basics',
    questions: [
      {
        id: 'what-is-rag',
        question: 'What is Retrieval-Augmented Generation?',
        answer: `Retrieval-Augmented Generation (RAG) is an AI architecture that combines the strengths of retrieval systems with generative language models. Instead of relying purely on a model's training data, RAG systems actively retrieve relevant information from a knowledge base and use it as context when generating responses.

The process works in three steps: First, the user's query is converted into a vector embedding that captures its semantic meaning. Second, this embedding is used to search a vector database for similar documents or passages. Third, the retrieved documents are provided as context to the language model, which generates an answer grounded in those sources rather than relying on hallucinated information.

This approach dramatically improves accuracy, factuality, and currency of responses, making RAG ideal for domains where correct information is critical—legal documents, medical information, customer support, and proprietary knowledge bases.`,
        relatedLinks: [
          { text: 'Retrieval-Augmented Generation Paper', to: 'https://arxiv.org/abs/2005.11401', external: true },
          { text: 'OpenAI RAG Overview', to: 'https://openai.com/index/retrieval-augmented-generation-for-knowledge-intensive-nlp-tasks/', external: true }
        ]
      },
      {
        id: 'rag-vs-finetuning',
        question: 'Why use RAG instead of fine-tuning?',
        answer: `Fine-tuning retrains a model on your specific data, which is effective but comes with significant drawbacks. Fine-tuned models require large amounts of training data, substantial computational resources, and significant time to train. Most critically, once a model is fine-tuned, updating it with new information requires retraining from scratch.

RAG, by contrast, works with existing pre-trained models and lets you update your knowledge base instantly. Adding new documents to your RAG system takes seconds; updating a fine-tuned model takes hours or days. RAG is also more cost-effective for most use cases—you avoid expensive training infrastructure and can use commercial models like GPT-4 or Claude through APIs.

For rapidly changing information (news, market data, customer documents), regularly updated content (support articles, product documentation), or budget-conscious projects, RAG is typically the superior choice.`,
        relatedLinks: [
          { text: 'Fine-tuning vs RAG Comparison', to: 'https://www.pinecone.io/learn/fine-tuning-vs-rag/', external: true },
          { text: 'LangChain RAG Guide', to: 'https://python.langchain.com/docs/use_cases/question_answering/', external: true }
        ]
      },
      {
        id: 'problems-rag-solves',
        question: 'What problems does RAG solve?',
        answer: `RAG solves several critical problems in AI deployment:

**Knowledge Currency**: Language models have training cutoff dates. RAG lets you use current information by retrieving from live knowledge bases, ensuring answers reflect the latest data.

**Hallucination Reduction**: By providing actual source documents as context, RAG dramatically reduces "hallucinations"—the AI generating plausible but false information. The model must ground responses in real data.

**Specialized Knowledge**: Large models trained on general internet data lack domain expertise. RAG lets you inject specialized knowledge (internal documentation, proprietary research, legal frameworks) that models never saw during training.

**Transparency and Trust**: Every RAG answer includes citations showing which sources informed the response. This transparency is essential for business applications where decisions must be verifiable and auditable.

**Cost Efficiency**: Instead of fine-tuning or training custom models, RAG uses existing models with retrieval, dramatically reducing computational costs while maintaining quality.`,
        relatedLinks: [
          { text: 'RAG Benefits and Use Cases', to: 'https://www.anthropic.com/research/large-language-models-as-tools', external: true }
        ]
      },
      {
        id: 'when-not-rag',
        question: 'When should I NOT use RAG?',
        answer: `While RAG is powerful, it's not the right tool for every situation:

**Complex Reasoning**: RAG excels at retrieval and summarization but struggles with multi-step logical reasoning or complex mathematical problem-solving that doesn't depend on external knowledge. For these tasks, fine-tuning or specialized model architectures may work better.

**Real-time Streaming Data**: If you need to process constantly-streaming data or answer questions about events happening right now, traditional databases or specialized streaming architectures might be more appropriate than RAG.

**Extremely Small Datasets**: If you only have a handful of documents or very narrow domain knowledge, the overhead of setting up embeddings and vector databases may not be justified. Simple keyword search or rule-based systems might suffice.

**Privacy-Critical Scenarios**: Storing all company knowledge in an accessible knowledge base introduces data governance and privacy risks. Highly sensitive data might be better protected through traditional database access controls and fine-tuning with sensitive-filtered datasets.

**Performance-Critical Applications**: RAG adds latency due to the retrieval step. For applications requiring <100ms responses, the retrieval overhead might be problematic.

Consider your specific constraints—data sensitivity, performance requirements, and reasoning complexity—when deciding whether RAG is the right fit.`,
        relatedLinks: []
      }
    ]
  },
  {
    id: 'implementation-details',
    title: 'Implementation Details',
    questions: [
      {
        id: 'how-embeddings-generated',
        question: 'How are embeddings generated?',
        answer: `Embeddings are created by specialized neural networks trained to convert text into fixed-dimensional vectors (commonly 1536 or 3072 dimensions). These networks learn to place semantically similar text close together in the vector space and dissimilar text far apart.

Common embedding models include OpenAI's text-embedding-3-small and text-embedding-3-large, Hugging Face's sentence-transformers, and Anthropic's embedding APIs. These models are trained on massive datasets to capture semantic relationships across languages and domains.

When you send text to an embedding model, it produces a vector—essentially a list of numbers representing the text's semantic meaning. The beauty of embeddings is that they're language-agnostic: "car" and "automobile" produce very similar embeddings even though they use different words. This enables semantic search rather than simple keyword matching.

The quality of your embeddings directly impacts RAG performance. Using embeddings trained on domain-specific data (biomedical, legal, financial) typically produces better results than general-purpose embeddings for specialized knowledge bases.`,
        relatedLinks: [
          { text: 'OpenAI Embeddings Guide', to: 'https://platform.openai.com/docs/guides/embeddings', external: true },
          { text: 'Sentence Transformers Documentation', to: 'https://www.sbert.net/', external: true }
        ]
      },
      {
        id: 'what-is-chunking',
        question: 'What is chunking and why does it matter?',
        answer: `Chunking is the process of splitting large documents into smaller, semantically meaningful pieces before converting them to embeddings and storing them in your vector database. A research paper might be chunked into paragraphs or sections; a support manual might be chunked by topic; a contract might be chunked by clause.

Chunking matters for several reasons: Language models have context windows—maximum amounts of text they can process in a single request. If you try to retrieve an entire 100-page document as context, it won't fit in the model's window. Instead, you retrieve the few most relevant chunks.

Poor chunking destroys context. If you chunk a paragraph mid-sentence, splitting related ideas across different chunks, semantic search becomes less effective. Well-chunked documents are coherent units where each chunk is independently understandable yet focused enough to fit in context windows.

Optimal chunk size depends on your use case: technical documentation might use larger chunks (1000+ tokens) to preserve context, while FAQ databases might use smaller chunks (100-300 tokens). Overlapping chunks—where consecutive chunks share some content—preserve context continuity across chunk boundaries.`,
        relatedLinks: [
          { text: 'LangChain Chunking Documentation', to: 'https://python.langchain.com/docs/modules/data_connection/document_loaders/', external: true },
          { text: 'Pinecone Chunking Guide', to: 'https://www.pinecone.io/learn/chunking-strategies/', external: true }
        ]
      },
      {
        id: 'choose-chunk-size',
        question: 'How do you choose chunk size?',
        answer: `Chunk size is a critical hyperparameter with competing tradeoffs:

**Larger chunks (500-2000 tokens)** preserve more context and semantic coherence. They're ideal when you want the model to see "the full picture" of a concept. However, larger chunks retrieve more context, which can exceed context windows and may include irrelevant information alongside relevant content.

**Smaller chunks (100-300 tokens)** allow more precise targeting of specific information and fit easily within context windows. However, they may lack sufficient context for the model to understand meaning. Chunks become overly granular, and important concepts get split across multiple chunks.

**Best practices for choosing chunk size**:
- Consider your domain: Legal documents and research papers often need larger chunks; FAQs and support articles work well with smaller chunks.
- Test multiple sizes and measure retrieval quality. Use metrics like NDCG (Normalized Discounted Cumulative Gain) to evaluate which chunk size produces better results.
- Account for your model's context window. Claude has larger context windows (200K tokens) than some competitors, enabling larger chunks.
- Consider overlap: Overlapping chunks (10-20% overlap) often outperform non-overlapping chunks despite redundancy.
- Start with 512-1024 tokens and iterate based on performance monitoring.`,
        relatedLinks: [
          { text: 'Text Splitters in LangChain', to: 'https://python.langchain.com/docs/modules/data_connection/document_transformers/', external: true }
        ]
      },
      {
        id: 'semantic-vs-keyword-search',
        question: "What's the difference between semantic and keyword search?",
        answer: `Keyword search (also called lexical search or BM25) matches exact words or phrases. If you search for "vehicle," it finds documents containing the word "vehicle" but misses documents about "cars" or "automobiles." Keyword search is fast, interpretable, and works well for precise queries, but it's brittle—it misses conceptually similar content that uses different terminology.

Semantic search uses embeddings to understand meaning. "Vehicle," "car," "automobile," and "transportation" would all be found when searching for "vehicle" because they share semantic similarity. Semantic search excels at capturing intent and concept, making it more forgiving of different phrasings.

**In practice, the best RAG systems use hybrid search**: combining both semantic and keyword approaches. A typical hybrid search might weight semantic results at 70% and keyword results at 30%, or use hybrid fusion algorithms like Reciprocal Rank Fusion to combine results from both methods.

Semantic search is slower than keyword search (calculating vector similarity is computationally expensive) but dramatically more effective for understanding user intent. Most modern RAG systems default to hybrid approaches to capture the strengths of both methods without their individual weaknesses.`,
        relatedLinks: [
          { text: 'Weaviate Hybrid Search', to: 'https://weaviate.io/blog/hybrid-search-explained', external: true },
          { text: 'Pinecone Hybrid Search', to: 'https://www.pinecone.io/learn/hybrid-search/', external: true }
        ]
      }
    ]
  },
  {
    id: 'accuracy-quality',
    title: 'Accuracy & Quality',
    questions: [
      {
        id: 'how-accurate-rag',
        question: 'How accurate are RAG responses?',
        answer: `RAG accuracy depends entirely on the quality and relevance of your retrieved documents. If retrieval works perfectly and you have accurate source material, RAG systems can be extremely accurate—often as good as or better than human experts, since they synthesize information without being limited by cognitive load.

However, RAG accuracy typically ranges from 70-95% depending on domain complexity, knowledge base quality, and retrieval performance. In simpler, well-structured domains (FAQs, technical documentation), accuracy often exceeds 90%. In complex, ambiguous domains (legal interpretation, medical diagnosis), accuracy is lower because the questions themselves are complex.

It's crucial to understand that accuracy is asymmetric: RAG is more likely to be overconfident about wrong answers than to admit uncertainty. A RAG system might confidently provide a plausible-sounding but incorrect answer if retrieval fails silently (returns irrelevant documents). This is why human review, citation verification, and confidence thresholds are essential.

Best practices for maintaining accuracy: Use domain-relevant embeddings, keep knowledge bases current and curated, monitor retrieval quality with human feedback, implement confidence scores for answers, and always require source citations for verification.`,
        relatedLinks: [
          { text: 'RAGAS: RAG Evaluation Framework', to: 'https://github.com/explodinggradients/ragas', external: true },
          { text: 'Evaluating RAG Systems', to: 'https://www.anthropic.com/research/measuring-faithfulness', external: true }
        ]
      },
      {
        id: 'when-fails',
        question: 'What are common failure modes?',
        answer: `RAG systems fail in predictable ways:

**Retrieval Failure**: The most common failure. The semantic search returns irrelevant documents because the query is poorly phrased, the knowledge base lacks information, or chunking broke related concepts apart. The model then generates plausible-sounding answers from irrelevant context.

**Knowledge Base Gaps**: Questions about topics not covered in the knowledge base result in hallucinations based on the model's training data, defeating RAG's purpose.

**Mismatch Between Query and Document Language**: If users ask technical questions but the knowledge base is written for non-technical audiences (or vice versa), retrieval fails even though relevant information exists.

**Context Window Limits**: With many relevant documents, you can't fit them all in the context window. The retriever must choose which documents to include, potentially omitting important context.

**Temporal Reasoning**: Questions requiring understanding of time sequences (historical events, cause-and-effect over time) often fail if documents aren't ordered temporally or lack proper temporal anchors.

**Out-of-Domain Generalization**: Models trained to answer questions about one domain often fail when applied to different domains, even with the same retrieval mechanism.

Mitigation strategies: Implement comprehensive monitoring, gather user feedback on answer quality, regularly audit retrieval quality, use confidence scores and explicit uncertainty statements, and maintain a feedback loop to continuously improve the knowledge base.`,
        relatedLinks: [
          { text: 'LLM Hallucination Taxonomy', to: 'https://arxiv.org/abs/2309.01219', external: true }
        ]
      },
      {
        id: 'improve-retrieval',
        question: 'How do I improve retrieval quality?',
        answer: `Improving RAG retrieval quality requires systematic optimization across multiple dimensions:

**1. Knowledge Base Quality**: Remove duplicate, outdated, or low-quality documents. Ensure documents are accurate, well-written, and well-organized. Consider hiring domain experts to curate critical content.

**2. Chunking Strategy**: Experiment with chunk size, overlap, and chunking boundaries. Use domain-aware chunking (respecting semantic boundaries like section breaks) rather than arbitrary size-based splits.

**3. Embedding Model Selection**: Use embeddings trained on your domain if possible. Larger embedding models (e.g., text-embedding-3-large) typically outperform smaller ones. Consider fine-tuning embeddings on your domain-specific data for critical applications.

**4. Hybrid Search**: Combine semantic search with keyword/BM25 search. Hybrid approaches typically outperform pure semantic or pure keyword search.

**5. Query Expansion**: Rewrite or expand user queries before retrieval. If a user asks "What's the capital of France?" expand it to "capital city of France, major cities in France" to catch documents using different terminology.

**6. Re-ranking**: Retrieve more documents than you use (e.g., retrieve top 20, pass top 5 to the model). Re-rank retrieved documents using a cross-encoder model to improve relevance.

**7. Feedback Loop**: Monitor which queries have poor results. Use user feedback to identify gaps in the knowledge base or retrieval failures, then address them systematically.

Start with hybrid search and chunking optimization, then move to more complex strategies like re-ranking and query expansion as needed.`,
        relatedLinks: [
          { text: 'RAG Optimization Paper', to: 'https://arxiv.org/abs/2312.10997', external: true },
          { text: 'Query Expansion Techniques', to: 'https://www.anthropic.com/research/finding-structure-in-time', external: true }
        ]
      },
      {
        id: 'source-accuracy',
        question: 'Can the AI still hallucinate with sources?',
        answer: `Yes, RAG systems can still hallucinate despite having sources, though the nature of hallucinations changes. Instead of fabricating facts from thin air, RAG systems typically commit one of these "bounded hallucinations":

**Misrepresentation**: The model correctly retrieves relevant documents but subtly misrepresents their content. It might exaggerate a statement, change nuance, or combine information incorrectly.

**Confabulation**: The model invents details that seem plausible given the retrieved context but aren't actually stated in the sources. For example, if a document mentions "John Smith is the VP of Engineering" and another mentions "we expanded to Europe," the model might hallucinate "John Smith led the European expansion."

**Context Projection**: The model assumes context that's reasonable but not explicitly stated in sources. If a document says "our competitor uses X technology," the model might hallucinate that "X technology is expensive" (a reasonable assumption, but not stated).

**Poor Retrieval Disguised as Accuracy**: If retrieval fails and returns irrelevant documents, the model still answers confidently using that bad context. The presence of sources doesn't guarantee those sources are actually relevant.

Best practices: Always verify citations by checking the actual source documents, implement confidence scores that reflect uncertainty, use models that explicitly acknowledge when information isn't in sources, and implement human review for high-stakes decisions. The presence of sources is valuable but not sufficient—users must verify critical information independently.`,
        relatedLinks: [
          { text: 'Faithful Reasoning with Language Models', to: 'https://www.anthropic.com/research/measuring-faithfulness', external: true }
        ]
      }
    ]
  },
  {
    id: 'production-scaling',
    title: 'Production & Scaling',
    questions: [
      {
        id: 'production-practices',
        question: 'What are production best practices?',
        answer: `Deploying RAG to production requires careful attention to reliability, performance, and maintenance:

**Infrastructure and Scalability**: Use managed vector database services (Pinecone, Weaviate Cloud, Cloudflare Vectorize) rather than self-hosted solutions unless you have dedicated DevOps resources. Implement load balancing for API requests. Design with auto-scaling in mind—traffic spikes during business hours or news events require elasticity.

**Monitoring and Observability**: Track retrieval quality metrics (hit rate, mean reciprocal rank), latency percentiles (p95, p99), and user satisfaction. Implement logging for all queries and responses for compliance and debugging. Set up alerts for degradation in retrieval quality or system latency.

**Knowledge Base Management**: Implement version control for knowledge base updates. Test new documents/updates in staging before production. Maintain a rollback procedure for corrupted or outdated knowledge bases. Schedule regular knowledge base maintenance windows.

**Model and API Management**: Use model providers' rate limiting and cost controls. Implement circuit breakers to gracefully handle API outages. Cache frequently asked questions and their answers to reduce API calls and costs.

**Quality Assurance**: Establish baseline metrics for answer quality. Implement user feedback mechanisms (thumbs up/down, detailed feedback) to identify problems. Run regular evaluations against test sets to detect quality degradation. Conduct quarterly reviews of failure modes.

**Compliance and Governance**: Document data lineage and knowledge base sources. Implement access controls ensuring only authorized data enters the knowledge base. Maintain audit logs for compliance. Handle data deletion/retention in accordance with regulations (GDPR, CCPA).`,
        relatedLinks: [
          { text: 'LangSmith Monitoring', to: 'https://docs.smith.langchain.com/', external: true },
          { text: 'Evaluating RAG Systems', to: 'https://www.anthropic.com/research/measuring-faithfulness', external: true }
        ]
      },
      {
        id: 'secure-rag',
        question: 'How do I secure a RAG system?',
        answer: `RAG security spans multiple dimensions:

**Input Validation and Prompt Injection Prevention**: Validate and sanitize user inputs. Implement prompt injection detection. Use techniques like instruction hierarchies and role separation to prevent malicious queries from manipulating the model. Monitor queries for suspicious patterns.

**Output Filtering**: Implement guardrails to prevent the model from generating harmful, discriminatory, or sensitive content. Use content filtering APIs or train custom classifiers to detect problematic outputs.

**Knowledge Base Security**: Control who can add/modify knowledge base documents. Implement document-level access controls so users only retrieve information they're authorized to see. Encrypt sensitive data in the knowledge base. Use secure authentication/authorization for API access.

**Data Privacy**: Implement privacy-preserving techniques for sensitive knowledge bases. Use differential privacy to prevent reconstruction of private training data. When using external embedding services, understand where your data is processed. Implement data minimization—only store necessary information.

**API Security**: Implement authentication (API keys, OAuth) and authorization. Use rate limiting to prevent abuse. Implement IP whitelisting if possible. Encrypt data in transit (TLS) and at rest. Regularly rotate credentials and API keys.

**Dependency Management**: Keep embedding models, vector databases, and frameworks up-to-date. Regularly scan dependencies for vulnerabilities. Implement security testing in your CI/CD pipeline.

**Compliance**: Align your RAG system with relevant regulations (GDPR, HIPAA, etc.). Maintain audit logs and comply with data retention policies. Document security architecture for compliance audits.`,
        relatedLinks: [
          { text: 'OWASP LLM Top 10', to: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/', external: true },
          { text: 'Prompt Injection Prevention', to: 'https://github.com/OWASP/LLM-based-Application-Security-Top-10', external: true }
        ]
      },
      {
        id: 'rate-limiting',
        question: 'How do I handle rate limiting?',
        answer: `Rate limiting protects RAG systems from abuse while ensuring fair access:

**Implementation Strategies**:
- Token bucket algorithm: Allow a certain number of requests per time window, refilling tokens periodically. Simple and effective.
- Sliding window: Track requests in a moving time window for more precise rate limiting.
- Adaptive rate limiting: Adjust limits based on system load and user behavior.

**Granularity Levels**:
- Per-user limits: Prevent individual users from overwhelming the system.
- Per-API-key limits: If using API keys, limit each key separately.
- Global limits: Protect overall system capacity.
- Per-endpoint limits: Different endpoints may need different limits.

**User Communication**: Return standard HTTP 429 (Too Many Requests) responses. Include Retry-After headers telling clients when to retry. Provide clear error messages explaining rate limits.

**Handling Legitimate Traffic**: Implement tiered limits for different user types (free/paid tiers). Cache responses to reduce load from repeated queries. Implement request queuing with priority for important requests. Use exponential backoff on retries to prevent thundering herds.

**Monitoring**: Track rate limit violations to identify abuse patterns. Alert on unusual traffic spikes. Monitor legitimate user frustration from rate limits—adjust limits if they're too restrictive.

**Cost Management**: Since RAG involves embedding and model API calls, rate limiting also controls costs. Implement budget alerts to prevent unexpected bills from high-traffic scenarios.`,
        relatedLinks: [
          { text: 'API Rate Limiting Best Practices', to: 'https://cloud.google.com/architecture/rate-limiting-strategies-techniques', external: true }
        ]
      },
      {
        id: 'data-privacy',
        question: 'What about data privacy?',
        answer: `Data privacy in RAG systems requires addressing multiple concerns:

**Knowledge Base Privacy**: If your knowledge base contains sensitive customer data, health information, or proprietary business secrets, it must be protected. Implement role-based access control (RBAC) ensuring users only see data they're authorized for. Encrypt the knowledge base and use secure storage backends.

**User Query Privacy**: User queries can reveal sensitive information about your business. Implement query logging controls—log enough for debugging but not so much that you retain sensitive data indefinitely. Consider differential privacy to add noise preventing re-identification. Implement query retention policies automatically deleting old queries after a retention period.

**Third-Party Services**: If using managed embedding services or LLM APIs, understand their data handling practices. Some services (like Claude API) have clear policies about not using inputs for training. Verify these before using sensitive data.

**Compliance Requirements**: GDPR (EU): Provide data deletion rights and document your legal basis for processing. CCPA (California): Allow users to request their data be deleted and understand how it's used. HIPAA (Healthcare): Implement encryption, access controls, and audit logging. PCI-DSS (Payment): Don't store payment data in knowledge bases.

**Data Minimization**: Only store information necessary for RAG to function. Remove personally identifiable information (PII) from knowledge bases when possible. Implement data retention policies automatically archiving or deleting old data.

**Practical Implementation**: Use vendor platforms that comply with relevant regulations (Anthropic, OpenAI, Pinecone all offer compliance documentation). Implement privacy by design—consider privacy in architecture decisions, not as an afterthought. Conduct regular privacy impact assessments identifying and addressing new risks.`,
        relatedLinks: [
          { text: 'GDPR Compliance Guide', to: 'https://gdpr-info.eu/', external: true },
          { text: 'Anthropic Privacy Policy', to: 'https://www.anthropic.com/privacy', external: true }
        ]
      }
    ]
  },
  {
    id: 'platform-specific',
    title: 'Platform-Specific (Cloudflare)',
    questions: [
      {
        id: 'why-vectorize',
        question: 'Why use Cloudflare Vectorize for RAG?',
        answer: `Cloudflare Vectorize is a purpose-built vector database that runs on Cloudflare's global edge network, offering unique advantages for RAG applications:

**Edge-Native Architecture**: Vectorize runs at the edge in Cloudflare's network of data centers worldwide. This means vector searches happen close to your users, dramatically reducing latency compared to centralized vector databases. Queries that might take 100-200ms with a centralized database can complete in 20-50ms with Vectorize.

**Seamless Integration**: Vectorize integrates natively with Cloudflare Workers AI, D1, and R2. You can build complete RAG workflows entirely on Cloudflare's platform without managing connections between multiple cloud providers. This simplifies architecture and reduces data transfer costs.

**Automatic Global Distribution**: Your vector indexes are automatically replicated across Cloudflare's global network. Users in Tokyo, London, and São Paulo all get low-latency access without manual configuration or regional deployments.

**Cost Efficiency**: Vectorize pricing is based on actual usage with no infrastructure provisioning required. Combined with Cloudflare's zero-egress-fee model, costs stay predictable and scale linearly with usage.

**Zero Infrastructure Management**: No servers to provision, no scaling to configure, no backups to manage. Cloudflare handles all operational concerns, letting you focus on application logic.

For applications requiring global reach, low latency, and operational simplicity, Vectorize offers compelling advantages over traditional vector databases.`,
        relatedLinks: [
          { text: 'Cloudflare Vectorize Documentation', to: 'https://developers.cloudflare.com/vectorize/', external: true },
          { text: 'Vectorize Pricing', to: 'https://developers.cloudflare.com/vectorize/platform/pricing/', external: true }
        ]
      },
      {
        id: 'workers-ai-rag',
        question: 'How does Cloudflare Workers AI work for RAG?',
        answer: `Cloudflare Workers AI provides serverless AI inference at the edge, making it ideal for RAG applications:

**Serverless Inference**: Workers AI runs machine learning models directly in Workers without managing GPU infrastructure. You make API calls to models just like any other service, but execution happens at the edge for low latency.

**Model Catalog**: Workers AI offers a curated set of models including:
- Text generation models (Llama 3, Mistral, etc.)
- Embedding models (BGE, sentence transformers)
- Specialized models for specific tasks

**RAG Integration Pattern**: A typical RAG flow with Workers AI:
1. User sends query to your Worker
2. Worker generates query embedding using Workers AI embedding model
3. Worker searches Vectorize for similar document chunks
4. Worker sends retrieved chunks + query to Workers AI text generation model
5. Model generates answer grounded in sources
6. Worker returns answer with citations

**Cost Structure**: Workers AI pricing is based on neurons processed (a measure combining model size and tokens). Embedding generation is very cost-effective, while text generation costs scale with response length.

**Performance**: Because both the embedding model and generation model run at the edge (same region as your user), total latency is minimized. You eliminate multiple inter-region API calls that would occur with traditional architectures.

**Practical Benefits**: No cold starts, automatic scaling, global distribution, and predictable pricing make Workers AI excellent for production RAG systems handling variable traffic.`,
        relatedLinks: [
          { text: 'Workers AI Documentation', to: 'https://developers.cloudflare.com/workers-ai/', external: true },
          { text: 'Workers AI Models', to: 'https://developers.cloudflare.com/workers-ai/models/', external: true }
        ]
      },
      {
        id: 'd1-rag',
        question: 'What is D1 and how does it fit into RAG?',
        answer: `D1 is Cloudflare's serverless SQLite database that runs at the edge, complementing Vectorize for comprehensive RAG systems:

**Serverless SQLite at the Edge**: D1 provides familiar SQL databases that scale automatically and replicate globally. Unlike traditional databases requiring server provisioning, D1 handles all infrastructure concerns.

**Role in RAG Architecture**: While Vectorize handles vector similarity search, D1 stores:
- Document metadata (title, author, publication date, category)
- User query history and feedback
- Access control and permissions data
- Application state and configuration
- Structured data requiring relational queries

**Hybrid Query Patterns**: Combine vector and relational queries in your RAG system:
1. Use Vectorize to find semantically similar documents
2. Use D1 to filter by metadata (date ranges, categories, access permissions)
3. Return results that satisfy both similarity and structured criteria

For example: "Find documents about RAG published after 2023 that the user has permission to access" requires both vector search (similarity) and SQL queries (date filter, permissions).

**Benefits of Edge Database**: D1 runs in the same regions as your Workers, eliminating latency from database calls. Queries complete in single-digit milliseconds, maintaining the low-latency benefits of edge computing.

**Practical Use Cases**:
- Store original document content while keeping embeddings in Vectorize
- Track user preferences and query history
- Implement content access control
- Maintain audit logs for compliance
- Cache frequently retrieved results`,
        relatedLinks: [
          { text: 'Cloudflare D1 Documentation', to: 'https://developers.cloudflare.com/d1/', external: true },
          { text: 'D1 Getting Started', to: 'https://developers.cloudflare.com/d1/get-started/', external: true }
        ]
      },
      {
        id: 'r2-rag',
        question: 'How does R2 storage work with RAG?',
        answer: `Cloudflare R2 is an S3-compatible object storage service that integrates seamlessly with RAG workflows on Cloudflare:

**Zero Egress Fees**: R2's biggest advantage is zero charges for data egress (downloads). Traditional cloud storage charges significant fees when data leaves their network, but R2 eliminates these costs. For RAG systems serving many users, this represents substantial savings.

**Document Storage Architecture**: Use R2 to store:
- Original source documents (PDFs, Word docs, presentations)
- Large text corpora before chunking and embedding
- Media files referenced in knowledge base articles
- Backup copies of processed embeddings
- Historical versions of documents for auditing

**RAG Processing Pipeline**:
1. Upload documents to R2
2. Worker retrieves document from R2
3. Worker chunks document into passages
4. Worker generates embeddings for each chunk (Workers AI)
5. Worker stores embeddings in Vectorize
6. Worker stores metadata in D1

**Retrieval Integration**: When users query your RAG system:
- Vectorize finds relevant chunk IDs
- D1 provides chunk metadata including R2 object keys
- If users need full documents, Worker retrieves from R2
- All transfers are free (no egress charges)

**Performance Considerations**: R2 offers very low latency for edge Workers. Objects are cached at the edge after first access, ensuring subsequent retrievals are extremely fast.

**Practical Benefits**: S3-compatible API means existing tools and SDKs work with R2. Combined with zero egress fees and edge performance, R2 is ideal for document-heavy RAG applications requiring frequent access to source materials.`,
        relatedLinks: [
          { text: 'Cloudflare R2 Documentation', to: 'https://developers.cloudflare.com/r2/', external: true },
          { text: 'R2 Pricing', to: 'https://developers.cloudflare.com/r2/pricing/', external: true }
        ]
      }
    ]
  }
];
