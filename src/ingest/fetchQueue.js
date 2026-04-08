import pool from '../../config/dbClient.js';

export async function fetchUnverifiedContent(limit = 5) {
    console.log("📥 Fetching unverified content from Neon...");

    try {
        // 1. Fetch unverified and unlocked items
        const selectQuery = `
            SELECT id, fingerprint 
            FROM content_submissions 
            WHERE verified = false AND processing = false 
            LIMIT $1
        `;
        const { rows } = await pool.query(selectQuery, [limit]);

        if (rows.length === 0) return [];

        // 2. Lock items by setting processing = true
        const ids = rows.map(r => r.id);
        await pool.query(
            `UPDATE content_submissions SET processing = true WHERE id = ANY($1)`,
            [ids]
        );

        console.log(`🔒 Locked ${rows.length} items in Neon for processing.`);
        
        // Map to standard object format for the worker
        return rows.map(r => ({
            work_id: r.id,
            fingerprint: r.fingerprint
        }));

    } catch (err) {
        console.error("❌ Neon fetch error:", err.message);
        return [];
    }
}
