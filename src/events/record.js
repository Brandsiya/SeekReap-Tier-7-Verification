import pool from '../../config/dbClient.js';

export async function recordEvent(event) {
    try {
        const query = `
            INSERT INTO verification_events (work_id, source_url, status, confidence, checked_at)
            VALUES ($1, $2, $3, $4, $5)
        `;
        const values = [
            event.work_id, 
            event.source_url, 
            event.status, 
            event.confidence, 
            new Date()
        ];
        await pool.query(query, values);
        console.log(`📡 Event recorded for ${event.work_id}`);
    } catch (err) {
        console.error("❌ Failed to record event in Neon:", err.message);
    }
}
