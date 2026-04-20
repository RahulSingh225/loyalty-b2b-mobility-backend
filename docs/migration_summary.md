# Consolidated schema migration — summary

Files added
- `drizzle/0002_consolidated_schema.sql` — consolidated normalized tables (already in repo).
- `scripts/migrations/backfill_consolidated.js` — backfill ETL (already in repo).
- `scripts/migrations/maintenance_window.md` — runbook and preflight checklist.
- `scripts/migrations/run_migration_and_backfill.ps1` — orchestrator for apply+backfill+reconcile (PowerShell).
- `scripts/migrations/reconcile_consolidated.js` — automated reconciliation helper.
- `scripts/migrations/cleanup_legacy.sql` — safe cleanup/rename instructions.

High-level process
1. Schedule maintenance window and notify stakeholders.
2. Stop workers and put the application into maintenance mode.
3. Backup DB (pg_dump) and export schema.
4. Run `psql "$DATABASE_URL" -f drizzle/0002_consolidated_schema.sql` to create new tables.
5. Run `node scripts/migrations/backfill_consolidated.js` to move legacy data into new tables.
6. Run `node scripts/migrations/reconcile_consolidated.js` and review any discrepancies.
7. Deploy application changes that read/write the new tables and monitor.
8. After retention & verification window, run cleanup/rename steps from `scripts/migrations/cleanup_legacy.sql`.

Notes & next steps
- PII handling: tokenization/encryption for Aadhaar and bank details should be implemented in application services before writing sensitive fields into production.
- Application code updates: services in `src/services/` must be updated to write/read the consolidated tables (a non-trivial step; see `src/services/*` references to legacy tables).
- I can run the migration on a staging DB and execute the backfill/reconciliation if you provide `DATABASE_URL` for staging or want me to run the steps locally.
