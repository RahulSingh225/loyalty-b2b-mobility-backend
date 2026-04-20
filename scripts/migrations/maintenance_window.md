# Maintenance window runbook — consolidated schema migration

Overview
- Purpose: run the consolidated-schema migration, backfill legacy data, reconcile, and cut over to the new tables in a single maintenance window.

Preconditions
- Ensure a full DB snapshot/backup is available and verified.
- Ensure CI build of the application with schema changes is available.
- Notify users and schedule maintenance window / take app offline.
- Stop background workers/consumers that write or read the affected tables.

Checklist (preflight)
1. Export DB snapshot (recommended):

   - Linux/Mac:
     ```bash
     pg_dump --format=custom --file=backup_pre_migration.dump "$DATABASE_URL"
     ```

   - Windows (PowerShell):
     ```powershell
     & pg_dump --format=custom --file backup_pre_migration.dump $env:DATABASE_URL
     ```

2. Dump schema-only for fast restore reference:
   ```bash
   pg_dump --schema-only --file=schema_before.sql "$DATABASE_URL"
   ```

3. Confirm worker processes are stopped and no write traffic is occurring.
4. Ensure `DATABASE_URL` is available to the migration host and the host has `psql` and `node` in PATH.

Run steps
1. Apply schema migration (adds consolidated tables):
   ```bash
   psql "$DATABASE_URL" -f drizzle/0002_consolidated_schema.sql
   ```

2. Run backfill (copies legacy data into consolidated tables):
   ```bash
   # Node script expects $DATABASE_URL
   DATABASE_URL="$DATABASE_URL" node scripts/migrations/backfill_consolidated.js
   ```

3. Run reconciliation checks (automated script):
   ```bash
   DATABASE_URL="$DATABASE_URL" node scripts/migrations/reconcile_consolidated.js
   ```

4. Deploy application code that reads from the consolidated tables (or enable cutover flag).

5. Bring workers back online slowly and monitor for errors and discrepancy metrics.

Verification
- Run the reconciliation script and inspect the per-table reports.
- Sample manual queries (run in psql):
  - Verify transaction counts:
    ```sql
    SELECT count(*) FROM transactions;
    SELECT count(*) FROM transaction_logs;
    ```
  - Verify ledgers and balances:
    ```sql
    SELECT count(*) FROM ledgers;
    SELECT count(*) FROM user_balances;
    ```

Rollback and recovery
- If the migration or backfill fails irrecoverably, restore from `backup_pre_migration.dump` using `pg_restore`:
  ```bash
  pg_restore --clean --exit-on-error --dbname="$DATABASE_URL" backup_pre_migration.dump
  ```

Post-migration cleanup
- Wait at least 30 days (or configured retention) before dropping legacy tables.
- Use `scripts/migrations/cleanup_legacy.sql` (it contains commented, safe rename/drop statements).

PII note
- The migration does not perform tokenization of PII (Aadhaar, bank account). Ensure you integrate encryption/tokenization in application code before inserting high-sensitivity fields into the new tables in production.
