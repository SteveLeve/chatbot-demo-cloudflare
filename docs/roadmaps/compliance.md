# Compliance Roadmap (Summary)

- **Last Updated**: 2026-08-10
- **Canonical Issues**: #19 (export/delete/opt-out), future retention cron issue (TBD)

## Now

- Privacy endpoints shipped (#19): `GET /api/privacy/export`, `DELETE /api/privacy/delete`, `POST /api/privacy/opt-out`.
- Add retention cleanup cron and audit logging.

## Next

- Publish privacy policy page and consent flow; link from UI.
- Verify data deletion/opt-out end-to-end with tests.

## Links

- Historical detail: `../archive/COMPLIANCE_ROADMAP.md`
- Related PRs/issues: #19
