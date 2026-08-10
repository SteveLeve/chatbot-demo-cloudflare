# Red-team scenarios (demo-scale)

Curated adversarial prompts for the Phase 5 educational red-team surface (`#36`).

## Purpose

Teach visitors what prompt injection, out-of-corpus asks, and hallucination pressure look like — and how **this** constrained RAG demo resists them.

This is **not** attack tooling. Freeform adversarial input is not accepted on the red-team API; only scenario IDs from this file can be tried live.

## Files

| File             | Role                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `scenarios.json` | Curated scenarios + teaching notes + committed observed outcomes |

## API

- `GET /api/v1/redteam/scenarios` — serves this snapshot (`source: static`)
- `POST /api/v1/redteam/try` — `{ "scenarioId": "..." }` only; rate-limited; skips D1 chat logging

## Privacy

Live tries set a demo-mode skip so adversarial text does **not** accumulate in `chat_sessions` / `chat_messages`. Full privacy endpoints remain tracked in `#19`.

## Methodology limits

Small hand-written set over ~37 articles. Educational only — not a security audit or production red-team claim.
