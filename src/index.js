import pkg from 'pg';
import http from 'http';
const { Pool } = pkg;

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set'); process.exit(1); }

console.log('DB prefix:', DB.slice(0, 40));

const pool = new Pool({
  connectionString: DB,
  ssl: { rejectUnauthorized: true },
  max: 5,
  connectionTimeoutMillis: 10000,
});

const BATCH_SIZE    = parseInt(process.env.BATCH_SIZE)    || 5;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;
let running = false;

async function runAudit() {
  if (running) { console.log('Already running, skip'); return; }
  running = true;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT submission_id FROM content_submissions
       WHERE status = 'pending' LIMIT $1 FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );
    console.log(`Batch: ${rows.length} pending`);
    if (rows.length === 0) { await client.query('COMMIT'); return; }
    for (const sub of rows) {
      await client.query(
        `UPDATE content_submissions
         SET status='verified', verified=true, verified_at=NOW(), updated_at=NOW()
         WHERE submission_id=$1`,
        [sub.submission_id]
      );
      console.log(`Verified: ${sub.submission_id}`);
    }
    await client.query('COMMIT');
    console.log(`Committed ${rows.length}`);
  } catch (err) {
    if (client) try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Audit error:', err.message);
  } finally {
    if (client) client.release();
    running = false;
  }
}

const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', tier: 7 }));
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Tier-7 running on port ${PORT}`);
  runAudit();
  setInterval(runAudit, POLL_INTERVAL);
});
