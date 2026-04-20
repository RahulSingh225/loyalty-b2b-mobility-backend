// Backfill script for consolidated schema
// WARNING: Run only on staging snapshots first. Ensure backups exist.
// Usage: DATABASE_URL=postgres://... node scripts/migrations/backfill_consolidated.js

const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log('Starting backfill: bank_accounts (electricians)...');
    await client.query(`
      INSERT INTO bank_accounts (user_id, account_number, ifsc_code, account_holder_name, upi_id, is_verified, provider_metadata, created_at, updated_at, original_source, original_id)
      SELECT user_id, bank_account_no, bank_account_ifsc, bank_account_name, upi_id, is_bank_validated, jsonb_build_object('source','electricians'), created_at, updated_at, 'electricians', id
      FROM electricians
      WHERE bank_account_no IS NOT NULL OR upi_id IS NOT NULL
    `);

    console.log('Backfilled bank_accounts from retailers...');
    await client.query(`
      INSERT INTO bank_accounts (user_id, account_number, ifsc_code, account_holder_name, upi_id, is_verified, provider_metadata, created_at, updated_at, original_source, original_id)
      SELECT user_id, bank_account_no, bank_account_ifsc, bank_account_name, upi_id, is_bank_validated, jsonb_build_object('source','retailers'), created_at, updated_at, 'retailers', id
      FROM retailers
      WHERE bank_account_no IS NOT NULL OR upi_id IS NOT NULL
    `);

    console.log('Backfilled bank_accounts from counter_sales...');
    await client.query(`
      INSERT INTO bank_accounts (user_id, account_number, ifsc_code, account_holder_name, upi_id, is_verified, provider_metadata, created_at, updated_at, original_source, original_id)
      SELECT user_id, bank_account_no, bank_account_ifsc, bank_account_name, upi_id, is_bank_validated, jsonb_build_object('source','counter_sales'), created_at, updated_at, 'counter_sales', id
      FROM counter_sales
      WHERE bank_account_no IS NOT NULL OR upi_id IS NOT NULL
    `);

    console.log('Backfilling addresses from electricians...');
    await client.query(`
      INSERT INTO addresses (user_id, address_type, address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, original_source, original_id)
      SELECT user_id, 'primary', address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, 'electricians', id
      FROM electricians
      WHERE address_line_1 IS NOT NULL
    `);

    console.log('Backfilling addresses from retailers...');
    await client.query(`
      INSERT INTO addresses (user_id, address_type, address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, original_source, original_id)
      SELECT user_id, 'primary', address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, 'retailers', id
      FROM retailers
      WHERE address_line_1 IS NOT NULL
    `);

    console.log('Backfilling addresses from counter_sales...');
    await client.query(`
      INSERT INTO addresses (user_id, address_type, address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, original_source, original_id)
      SELECT user_id, 'primary', address_line_1, address_line_2, city, district, state, pincode, created_at, updated_at, 'counter_sales', id
      FROM counter_sales
      WHERE address_line_1 IS NOT NULL
    `);

    console.log('Backfilling transactions from electrician_transactions...');
    await client.query(`
      INSERT INTO transactions (user_id, user_type_id, transaction_type, points, amount, scheme_id, status, metadata, original_source, original_id, created_at)
      SELECT user_id, (SELECT id FROM user_type_entity WHERE type_name ILIKE 'electrician' LIMIT 1), 'EARNING', points, NULL, scheme_id, 'COMPLETED', jsonb_build_object('source','electrician_transactions'), 'electrician_transactions', id, created_at
      FROM electrician_transactions
    `);

    console.log('Backfilling transactions from retailer_transactions...');
    await client.query(`
      INSERT INTO transactions (user_id, user_type_id, transaction_type, points, amount, scheme_id, status, metadata, original_source, original_id, created_at)
      SELECT user_id, (SELECT id FROM user_type_entity WHERE type_name ILIKE 'retailer' LIMIT 1), 'EARNING', points, NULL, scheme_id, 'COMPLETED', jsonb_build_object('source','retailer_transactions'), 'retailer_transactions', id, created_at
      FROM retailer_transactions
    `);

    console.log('Backfilling transactions from counter_sales_transactions...');
    await client.query(`
      INSERT INTO transactions (user_id, user_type_id, transaction_type, points, amount, scheme_id, status, metadata, original_source, original_id, created_at)
      SELECT user_id, (SELECT id FROM user_type_entity WHERE type_name ILIKE 'counter_sales' LIMIT 1), 'EARNING', points, NULL, scheme_id, 'COMPLETED', jsonb_build_object('source','counter_sales_transactions'), 'counter_sales_transactions', id, created_at
      FROM counter_sales_transactions
    `);

    console.log('Aggregating ledgers from transactions...');
    await client.query(`
      INSERT INTO ledgers (user_id, opening_balance, closing_balance, last_updated)
      SELECT t.user_id, 0, COALESCE(SUM(t.points),0), NOW()
      FROM transactions t
      GROUP BY t.user_id
      ON CONFLICT (user_id) DO UPDATE SET closing_balance = EXCLUDED.closing_balance, last_updated = EXCLUDED.last_updated
    `);

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable.');
  process.exit(1);
}

main();
