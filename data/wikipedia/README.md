# Wikipedia Dataset

Place your Wikipedia articles in JSON format in this directory.

## Expected Format

Each file should contain a Wikipedia article in the following JSON format:

```json
{
  "title": "Artificial Intelligence",
  "content": "Artificial intelligence (AI) is the simulation of human intelligence processes by machines...",
  "metadata": {
    "categories": ["Computer Science", "Technology"],
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "lastModified": "2025-01-06"
  }
}
```

## Required Fields

- `title` (string): The article title
- `content` (string): The full article text

## Optional Fields

- `metadata` (object): Additional metadata
  - `categories` (array): Article categories
  - `url` (string): Wikipedia URL
  - `lastModified` (string): Last modification date

## Ingestion

To ingest the articles into your RAG system:

```bash
# Install dependencies first
npm install

# Start your local Worker
npm run dev

# In another terminal, run the ingestion script
npm run ingest ./data/wikipedia
```

## Dataset Size

For optimal demo performance, keep the dataset between 10-20MB total (approximately 20-50 articles depending on length).
