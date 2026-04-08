import pool from '../../config/dbClient.js';

export async function markVerified(work_id) {
    try {
        await pool.query(
            `UPDATE content_submissions 
             SET verified = true, verified_at = NOW(), processing = false 
             WHERE id = $1`,
            [work_id]
        );
        console.log(`✅ Work ${work_id} marked as verified in Neon.`);
    } catch (err) {
        console.error(`❌ Error marking work ${work_id}:`, err.message);
    }
}
