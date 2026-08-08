# Curated Demo Corpus (Phase 2 / #33)

This directory holds the **committed, reproducible** knowledge base for the RAG demo.
Unlike the legacy bulk `data/wikipedia/` fetch (gitignored, ~2,000+ articles), this curated set
is tracked in git so a fresh clone shows exactly what the system can answer from.

## Contents

- `curated-list.json` — manifest of source filenames (used by `scripts/build-corpus.js --copy`)
- `*.json` — article payloads with stable `id`, `title`, `content`, and `metadata`
- Generated SPA manifest: `ui/src/content/corpus-manifest.json` (build via `npm run corpus:build`)

## Article count

~37 articles on computing, AI, and foundational science (Simple English Wikipedia).

## Local workflow

```bash
# Regenerate SPA manifest from committed JSON (no network)
npm run corpus:build

# Optional: rebuild corpus files from local data/wikipedia/ fetch
npm run corpus:build -- --copy

# Ingest into R2 + D1 + Vectorize (requires wrangler dev or deployed worker)
npm run ingest:corpus
# or: npm run ingest ./data/corpus http://localhost:8787
```

## Stable article IDs

Each file includes an `id` slug (e.g. `artificial-intelligence`) passed through ingest so
corpus browser URLs and R2 keys stay consistent across environments.
