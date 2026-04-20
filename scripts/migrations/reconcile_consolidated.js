// Simple reconciliation helper.
// Scans public tables that have a numeric 'points' or 'amount' column and compares
// their counts and sums to the consolidated `transactions` table when possible.

const { Client } = require('pg');

const metadataKeys = ['original_source', 'original_table', 'source_table'];

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('Set DATABASE_URL environment variable');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();

  // Find candidate legacy tables which contain numeric points/amount columns
  const q = `
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('points','amount')
    GROUP BY table_name
    ORDER BY table_name
  `;

  const res = await client.query(q);
  if (res.rows.length === 0) {
    console.log('No legacy tables with `points` or `amount` column found in public schema.');
  }

  console.log('Found tables to check:', res.rows.map(r => r.table_name).join(', '));

  for (const { table_name } of res.rows) {
    try {
      const legacyQ = `SELECT count(*)::int as count, coalesce(sum(points), coalesce(sum(amount),0)) as total FROM "${table_name}"`;
      const legacy = await client.query(legacyQ);
      const legacyCount = legacy.rows[0].count || 0;
      const legacySum = legacy.rows[0].total || 0;

      let foundMatch = false;
      for (const key of metadataKeys) {
        const txQ = `SELECT count(*)::int as count, coalesce(sum(points),0) as total FROM transactions WHERE (metadata->>'${key}') = '${table_name}'`;
        try {
          const tx = await client.query(txQ);
          const txCount = tx.rows[0].count || 0;
          const txSum = tx.rows[0].total || 0;
          if (txCount > 0 || txSum > 0) {
            console.log(`\n[match] legacy=${table_name} via metadata key='${key}'`);
            console.log(`  legacy: rows=${legacyCount}, sum=${legacySum}`);
            console.log(`  transactions: rows=${txCount}, sum=${txSum}`);
            foundMatch = true;
            break;
          }
        } catch (err) {
          // ignore but keep trying other keys
        }
      }

      if (!foundMatch) {
        console.log(`\n[no-match] legacy=${table_name}`);
        console.log(`  legacy: rows=${legacyCount}, sum=${legacySum}`);
        console.log('  transactions: no obvious metadata link found; consider manual verification.');
      }
    } catch (err) {
      console.error(`Error checking table ${table_name}:`, err.message || err);
    }
  }

  // High-level totals
  try {
    const t1 = await client.query('SELECT count(*)::int as c, coalesce(sum(points),0) as s FROM transactions');
    const t2 = await client.query('SELECT count(*)::int as c, coalesce(sum(points),0) as s FROM transaction_logs');
    console.log('\n=== High-level totals');
    console.log(`transactions: rows=${t1.rows[0].c}, sum=${t1.rows[0].s}`);
    console.log(`transaction_logs: rows=${t2.rows[0].c}, sum=${t2.rows[0].s}`);
  } catch (err) {
    console.warn('Could not compute high-level totals.', err.message || err);
  }

  await client.end();
  console.log('\nReconciliation script completed. Review outputs and investigate any discrepancies.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
