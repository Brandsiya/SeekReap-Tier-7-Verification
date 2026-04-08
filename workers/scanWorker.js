import pool from '../config/dbClient.js';
import { fetchUnverifiedContent } from '../src/ingest/fetchQueue.js';
import { detectContentUsage } from '../src/detector/detect.js';
import { verifyUsage } from '../src/verifier/verify.js';
import { recordEvent } from '../src/events/record.js';

const activeJobs = new Set();

async function globalCleanup() {
    console.log("🧹 Running startup cleanup: Resetting stale processing flags...");
    try {
        const result = await pool.query("UPDATE content_submissions SET processing = false WHERE processing = true");
        console.log(`✨ Cleanup complete: Released ${result.rowCount} stuck jobs.`);
    } catch (err) {
        console.error("⚠️ Startup cleanup failed:", err.message);
    }
}

export async function startScanWorker() {
    await globalCleanup();
    console.log("🔍 Parallel Scan Worker Active.");

    setInterval(async () => {
        try {
            const queue = await fetchUnverifiedContent(5);
            if (!queue || queue.length === 0) return;

            await Promise.all(queue.map(async (item) => {
                const sid = item.submission_id;

                if (activeJobs.has(sid)) return;
                activeJobs.add(sid);

                try {
                    console.log(`🚀 Auditing Submission: ${sid}`);
                    
                    // 1. Detect matches (External APIs / Web Scrapers)
                    const detections = await detectContentUsage(item);
                    
                    // 2. Verify each match and record the event
                    for (const match of detections) {
                        const result = await verifyUsage(match);
                        await recordEvent({
                            work_id: sid,
                            source_url: match.url,
                            status: result.status,
                            confidence: match.confidence || null
                        });
                    }

                    // 3. Final Decision: High confidence match = verified
                    const isVerified = detections.some(d => d.confidence > 0.9);

                    await pool.query(
                        `UPDATE content_submissions 
                         SET verified = $1, verified_at = NOW(), processing = false 
                         WHERE submission_id = $2`,
                        [isVerified, sid]
                    );

                    console.log(`✅ Audit Complete: ${sid} (Result: ${isVerified})`);
                } catch (err) {
                    console.error(`❌ Audit Failed: ${sid} ->`, err.message);
                    await pool.query(
                        "UPDATE content_submissions SET processing = false WHERE submission_id = $1",
                        [sid]
                    );
                } finally {
                    activeJobs.delete(sid);
                }
            }));
        } catch (err) {
            console.error("🔥 Global loop error:", err.message);
        }
    }, 10000);
}
