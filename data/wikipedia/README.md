# Wikipedia Dataset

This directory contains Wikipedia articles in JSON format for the RAG system.

## Quick Start: Fetch Wikipedia Data

The easiest way to populate this directory is using our fetch script:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Fetch ~10MB of Wikipedia articles (recommended for demos)
python scripts/fetch-wikipedia.py --size-mb 10

# Or fetch a specific number of articles
python scripts/fetch-wikipedia.py --articles 2000

# Use English Wikipedia instead of Simple English
python scripts/fetch-wikipedia.py --size-mb 10 --lang en
```

This will automatically download articles from the `wikimedia/wikipedia` dataset and convert them to the required format.

## Expected Format

Each file should contain a Wikipedia article in the following JSON format:

```json
{
  "title": "Artificial Intelligence",
  "content": "Artificial intelligence (AI) is the simulation of human intelligence processes by machines...",
  "metadata": {
    "categories": ["Computer Science", "Technology"],
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "id": "12345"
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
  - `id` (string): Wikipedia article ID

## Manual Data Preparation

If you want to create articles manually, place JSON files in this directory following the format above.

## Ingestion

Once you have articles in this directory, ingest them into your RAG system:

```bash
# Install dependencies first
npm install

# Start your local Worker (Terminal 1)
npm run dev

# In another terminal, run the ingestion script (Terminal 2)
npm run ingest ./data/wikipedia
```

## Dataset Size Recommendations

- **Quick demo**: 5-10 MB (~1000-2000 articles)
- **Full demo**: 10-20 MB (~2000-4000 articles)
- **Extended testing**: 20-50 MB (~4000-10000 articles)

The fetch script will skip very short articles (< 500 characters) to ensure quality content.

## Fetch Script Options

```bash
# See all options
python scripts/fetch-wikipedia.py --help

# Examples:
python scripts/fetch-wikipedia.py --size-mb 5      # Smaller dataset
python scripts/fetch-wikipedia.py --articles 1000  # Exact article count
python scripts/fetch-wikipedia.py --size-mb 10 --output custom/path  # Custom output directory
```

## What Gets Downloaded?

The fetch script uses the `wikimedia/wikipedia` dataset from Hugging Face:
- **Simple English** (default): Simpler language, good for demos
- **English** (--lang en): Full English Wikipedia, more comprehensive

Articles are filtered to exclude:
- Very short articles (< 500 characters)
- Empty or stub articles
- Articles with insufficient content
