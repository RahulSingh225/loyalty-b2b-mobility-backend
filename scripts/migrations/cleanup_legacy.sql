-- Cleanup legacy tables AFTER thorough verification.
-- This file contains example rename/drop statements. Do NOT run until you
-- have verified the backfill and reconciliation step and waited the retention window.

-- Example: rename legacy tables to keep a backup in the same DB (safe, reversible)
-- ALTER TABLE electricians RENAME TO electricians_legacy_20260420;
-- ALTER TABLE retailers RENAME TO retailers_legacy_20260420;
-- ALTER TABLE counter_sales RENAME TO counter_sales_legacy_20260420;

-- When you have confirmed all data and reporting is using the new tables,
-- you can drop legacy tables (use with extreme caution):
-- DROP TABLE IF EXISTS electricians_legacy_20260420 CASCADE;

-- Keep full dumps of legacy tables off the database; store exports in object storage if needed.
