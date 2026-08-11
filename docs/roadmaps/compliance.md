# Compliance Roadmap (Summary)

- **Last Updated**: 2026-08-10
- **Canonical Issues**: #19 (export/delete/opt-out), future retention cron issue (TBD)

## Now

- Privacy endpoints shipped (#19): `GET /api/privacy/export`, `DELETE /api/privacy/delete`, `POST /api/privacy/opt-out`.
- Multi-turn coverage gap closed (PR #49 review): sessions previously reset per query, so export/delete
  could only reach the latest turn of a conversation. Sessions are now reused across turns within the
  30-minute self-service window, so a full multi-turn conversation is exportable/deletable as one unit.
- Add retention cleanup cron and audit logging.

## Next

- Publish privacy policy page and consent flow; link from UI.
- Verify data deletion/opt-out end-to-end with tests.
- Conversations that span longer than 30 minutes still split into multiple sessions once the window
  lapses — earlier turns remain individually exportable/deletable but not as one combined action.
  Revisit if longer-lived conversations become common (e.g. a conversation-level grouping id).

## Links

- Historical detail: `../archive/COMPLIANCE_ROADMAP.md`
- Related PRs/issues: #19
