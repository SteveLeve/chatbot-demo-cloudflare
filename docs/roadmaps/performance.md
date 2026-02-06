# Performance Roadmap (Summary)
- **Last Updated**: 2026-02-06
- **Targets**: 41% cost reduction; 82% latency improvement on cached queries
- **Canonical Issues**: pending numbers for #12–#17; tie to upcoming PRs

## Now
- Enable embedding cache; consider AI Gateway caching path.
- Optimize chunk insertion and D1 query patterns.

## Next
- Workflow timeouts and idempotency; batch writes.
- Measure cache hit rate and tune thresholds to hit 45ms cached latency.

## Links
- Historical detail: `../archive/PERFORMANCE_OPTIMIZATION.md`
- Related issues: #12–#17 (once opened) and follow-on PRs
