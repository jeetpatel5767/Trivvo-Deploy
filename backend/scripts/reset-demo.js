// Before recording the demo: back up every Tr!vvo table to a JSON file, then empty them.
// Usage (from backend/):  node scripts/reset-demo.js --yes
// Without --yes it only writes the backup and prints the row counts.
// On-chain transactions and Hedera messages are not touched (they can't be).
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const TABLES = ['events', 'task_proofs', 'nullifiers', 'participants', 'analytics', 'hunts', 'vendors', 'public.users'];

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const backup = {};
  for (const t of TABLES) backup[t] = (await pool.query(`SELECT * FROM ${t}`)).rows;
  const file = path.join(__dirname, '..', '..', 'database', `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log('Backup written:', file);
  for (const t of TABLES) console.log(`  ${t}: ${backup[t].length} rows`);

  if (process.argv.includes('--yes')) {
    await pool.query(`TRUNCATE ${TABLES.join(', ')} CASCADE`);
    console.log('All tables emptied. Create and fund the demo hunts from the vendor screens.');
  } else {
    console.log('Nothing deleted. Run again with --yes to empty the tables.');
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
