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
        // Fetch AND lock in one atomic step to prevent re-fetching
        const { rows } = await client.query(`
            UPDATE content_submissions
            SET audit_status = 'processing'
            WHERE id IN (
                SELECT id FROM content_submissions
                WHERE audit_status = 'pending'
                LIMIT $1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, title, fingerprint
        `, [BATCH_SIZE]);

        if (!rows || rows.length === 0) {
            console.log('📭 No pending submissions.');
            return;
        }

        for (const submission of rows) {
            console.log(`🚀 Auditing Submission: ${submission.id}`);
            console.log(`📡 Scanning platforms for: "${submission.title}"...`);

            // TODO: Replace with real detection logic
            const auditResult = false;

            await client.query(`
                UPDATE content_submissions
                SET audit_status = 'completed',
                    verified = $1,
                    verified_at = NOW()
                WHERE id = $2
            `, [auditResult, submission.id]);

            console.log(`✅ Audit Complete: ${submission.id} (Result: ${auditResult})`);
        }

    } catch (err) {
        console.error('❌ Audit error:', err.message);
    } finally {
        client.release();
    }
}

// HTTP server so Fly.io smoke checks pass
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('SeekReap Tier-7 OK');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SeekReap Tier-7 Verification Layer Booting...`);
    console.log(`🌐 HTTP alive on port ${PORT}`);
    runAudit();
    setInterval(runAudit, POLL_INTERVAL);
});
