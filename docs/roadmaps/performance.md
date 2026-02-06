# Performance Roadmap (Summary)
- **Last Updated**: 2026-02-06
- **Targets**: 41% cost reduction; 82% latency improvement on cached queries
- **Canonical Issues**: pending numbers for #12–#17; tie to upcoming PRs

## Now
- Enable embedding cache (#12) with KV + 7d TTL; log hit/miss.
- Optimize chunk insertion using D1 batch API (#13).
- Prepare AI Gateway config (TTL 1h) disabled by default (#16).

## Next
- Workflow timeouts and idempotency; batch writes.
- Measure cache hit rate and tune thresholds to hit 45ms cached latency.

## Links
- Historical detail: `../archive/PERFORMANCE_OPTIMIZATION.md`
- Related issues: #12–#17 (once opened) and follow-on PRs
