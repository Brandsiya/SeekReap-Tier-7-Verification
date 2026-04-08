import { fetchUnverifiedContent } from '../src/ingest/fetchQueue.js';
import { detectContentUsage } from '../src/detector/detect.js';
import { verifyUsage } from '../src/verifier/verify.js';
import { recordEvent } from '../src/events/record.js';
import { markWorkAsVerified } from '../src/events/markVerified.js';

const activeJobs = new Set();

export async function startScanWorker() {
    console.log("🔍 Scan Worker running...");

    setInterval(async () => {
        console.log("⏱ Worker tick...");

        try {
            const queue = await fetchUnverifiedContent();

            if (!queue || queue.length === 0) {
                console.log("📭 Queue empty, waiting...");
                return;
            }

            for (const item of queue) {
                if (activeJobs.has(item.work_id)) {
                    console.log(`⏳ Skipping active job: ${item.work_id}`);
                    continue;
                }

                activeJobs.add(item.work_id);

                try {
                    console.log(`🚀 Processing: ${item.work_id}`);

                    const detections = await detectContentUsage(item);

                    if (!detections || detections.length === 0) {
                        console.log(`❌ No detections for: ${item.work_id}`);
                        await markWorkAsVerified(item.work_id);
                        continue;
                    }

                    for (const match of detections) {
                        const result = await verifyUsage(match);

                        await recordEvent({
                            work_id: item.work_id,
                            source_url: match.url,
                            status: result.status,
                            confidence: match.confidence || null,
                            checked_at: new Date().toISOString()
                        });
                    }

                    await markWorkAsVerified(item.work_id);
                    console.log(`✅ Completed: ${item.work_id}`);

                } catch (err) {
                    console.error(`❌ Error processing ${item.work_id}:`, err.message);
                } finally {
                    activeJobs.delete(item.work_id);
                }
            }

        } catch (err) {
            console.error("🔥 Worker cycle failure:", err.message);
        }

    }, 10000);
}
