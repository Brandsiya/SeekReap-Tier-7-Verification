import { fetchUnverifiedContent } from '../src/ingest/fetchQueue.js';
import { detectContentUsage } from '../src/detector/detect.js';
import { verifyUsage } from '../src/verifier/verify.js';
import { recordEvent } from '../src/events/record.js';
import supabase from '../config/supabaseClient.js';

const activeJobs = new Set();

export async function startScanWorker() {
    console.log("🔍 Parallel Scan Worker Active.");

    setInterval(async () => {
        try {
            const queue = await fetchUnverifiedContent();
            if (!queue || queue.length === 0) return;

            // Process the entire batch in parallel
            await Promise.all(queue.map(async (item) => {
                const itemId = item.submission_id || item.id;
                if (activeJobs.has(itemId)) return;

                activeJobs.add(itemId);

                try {
                    console.log(`🚀 Processing: ${itemId}`);
                    const detections = await detectContentUsage(item);

                    for (const match of detections) {
                        const result = await verifyUsage(match);
                        await recordEvent({
                            work_id: itemId,
                            source_url: match.url,
                            status: result.status
                        });
                    }

                    // 3. Resolve: Mark verified and release the lock
                    const isVerified = detections.some(d => d.confidence > 0.9);
                    await supabase
                        .from('content_submissions')
                        .update({ 
                            verified: isVerified, 
                            verified_at: new Date(), 
                            processing: false 
                        })
                        .eq('id', itemId);

                    console.log(`✅ Success: ${itemId}`);

                } catch (err) {
                    console.error(`❌ Job Failed: ${itemId}`, err.message);
                    // Critical: Release lock on error so it can be retried
                    await supabase
                        .from('content_submissions')
                        .update({ processing: false })
                        .eq('id', itemId);
                } finally {
                    activeJobs.delete(itemId);
                }
            }));
        } catch (err) {
            console.error("🔥 Global loop error:", err.message);
        }
    }, 10000);
}
