Consolidation migration scripts

Files:
- `0002_consolidated_schema.sql` : Adds normalized `bank_accounts`, `addresses`, `transactions`, `transaction_logs`, `ledgers`, `redemption_channel_data`, and `approvals` tables.
- `backfill_consolidated.js` : Node script to backfill data from role-specific masters and transactions into the consolidated tables.

Runbook (recommended):
1. Take a DB snapshot or backup.
2. Run the SQL migration on a staging DB:

   psql "$DATABASE_URL" -f drizzle/0002_consolidated_schema.sql

3. Validate the schema changes.
4. Run the backfill script against the staging DB:

   DATABASE_URL="$DATABASE_URL" node scripts/migrations/backfill_consolidated.js

5. Run reconciliation checks (counts, sums, spot-check rows).
6. Implement dual-write feature-flag and deploy to a canary environment.
7. After verification, perform production rollout and monitor.

Notes & cautions:
- The backfill script uses snake_case column names consistent with current schema.ts. If your production schema differs, update the script accordingly.
- Sensitive fields like `account_number` should be tokenized or encrypted at rest. This script intentionally writes raw values; update to tokenization prior to production writes.
- Run this process with a staging snapshot first; do NOT run directly on production without approval.
