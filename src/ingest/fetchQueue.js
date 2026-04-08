import pool from '../../config/dbClient.js';

export async function fetchUnverifiedContent(limit = 5) {
    try {
        console.log("📥 Fetching unverified content from Neon...");
        
        // Use submission_id instead of id
        const query = `
            UPDATE content_submissions 
            SET processing = true 
            WHERE submission_id IN (
                SELECT submission_id FROM content_submissions 
                WHERE verified = false AND processing = false 
                LIMIT $1 
                FOR UPDATE SKIP LOCKED
            ) 
            RETURNING *;
        `;
        
        const res = await pool.query(query, [limit]);
        return res.rows;
    } catch (err) {
        console.error("❌ Neon fetch error:", err.message);
        throw err;
    }
}
