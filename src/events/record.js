import pool from '../../config/dbClient.js';

export async function recordEvent(eventData) {
    const { work_id, source_url, status, confidence } = eventData;
    
    try {
        await pool.query(
            `INSERT INTO audit_events (submission_id, source_url, status, confidence, occurred_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [work_id, source_url, status, confidence]
        );
    } catch (err) {
        console.error("📝 Event Recording Failed:", err.message);
    }
}
