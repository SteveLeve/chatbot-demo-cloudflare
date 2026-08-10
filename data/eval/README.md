# Demo-scale eval (Phase 4 / #35)

Educational gold set + report over the curated corpus (`data/corpus/`).
**Not** a production quality benchmark.

## Files

| File            | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| `gold-set.json` | Questions → expected article IDs / refuse behavior     |
| `report.json`   | Committed snapshot served by `GET /api/v1/eval/report` |

## Regenerate a live report

Against a running Worker with ingested corpus:

```bash
# Optional: trigger live run (rate-limited; ephemeral — does not write this file)
curl -X POST http://localhost:8787/api/v1/eval/run
```

To refresh the committed snapshot for demos, paste a successful POST body into
`report.json` (set `"source": "static"`) and open a PR. The Worker never writes
to git from production.

## Methodology limits

A few dozen cases over ~37 articles teach faithfulness / groundedness /
retrieval relevance. They do **not** support quality claims or model rankings.
