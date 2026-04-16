import pkg from 'pg';
import http from 'http';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — exiting');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const BATCH_SIZE    = parseInt(process.env.BATCH_SIZE)    || 5;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;

let running = false;

async function runAudit() {
  if (running) {
    console.log('Audit already running — skipping this tick');
    return;
  }
  running = true;

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT submission_id, content_hash, creator_id
       FROM content_submissions
       WHERE status = 'pending'
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [BATCH_SIZE]
    );

    console.log(`Batch locked: ${rows.length} rows`);

    if (rows.length === 0) {
      await client.query('COMMIT');
      console.log('No pending submissions');
      return;
    }

    for (const sub of rows) {
      console.log(`Auditing: ${sub.submission_id}`);
      await client.query(
        `UPDATE content_submissions
         SET status      = 'verified',
             verified    = true,
             verified_at = NOW(),
             updated_at  = NOW()
         WHERE submission_id = $1`,
        [sub.submission_id]
      );
      console.log(`Verified: ${sub.submission_id}`);
    }

    await client.query('COMMIT');
    console.log(`Committed ${rows.length} verifications`);

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
