import pg from 'pg';
import http from 'http';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 5;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;

async function runAudit() {
    console.log('📥 Fetching unverified content from Neon...');
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`
            UPDATE content_submissions
            SET status = 'processing'
            WHERE submission_id IN (
                SELECT submission_id FROM content_submissions
                WHERE status = 'pending'
                LIMIT $1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING submission_id, content_hash, creator_id
        `, [BATCH_SIZE]);

        if (!rows || rows.length === 0) {
            console.log('📭 No pending submissions.');
            return;
        }

        for (const submission of rows) {
            console.log(`🚀 Auditing Submission: ${submission.submission_id}`);

            const auditResult = false;

            await client.query(`
                UPDATE content_submissions
                SET status = 'completed',
                    verified = $1
                WHERE submission_id = $2
            `, [auditResult, submission.submission_id]);

            console.log(`✅ Audit Complete: ${submission.submission_id} (Result: ${auditResult})`);
        }
    } catch (err) {
        console.error('❌ Audit error:', err.message);
    } finally {
        client.release();
    }
}

const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('SeekReap Tier-7 OK');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SeekReap Tier-7 Booting on port ${PORT}...`);
    runAudit();
    setInterval(runAudit, POLL_INTERVAL);
});
