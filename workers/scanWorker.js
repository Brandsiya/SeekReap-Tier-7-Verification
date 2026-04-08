import { fetchUnverifiedContent } from '../src/ingest/fetchQueue.js';
import { detectContentUsage } from '../src/detector/detect.js';
import { verifyUsage } from '../src/verifier/verify.js';
import { recordEvent } from '../src/events/record.js';
import { markVerified } from '../src/events/markVerified.js';

const activeJobs = new Set();
const WORKER_COUNT = parseInt(process.env.WORKER_COUNT) || 3;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;

async function processItem(item) {
    if (activeJobs.has(item.work_id)) {
        console.log(`⏳ Skipping active job: ${item.work_id}`);
        return;
    }

    activeJobs.add(item.work_id);

    try {
        console.log(`🚀 Processing: ${item.work_id}`);

        const detections = await detectContentUsage(item);

        if (!detections || detections.length === 0) {
            console.log(`❌ No detections for: ${item.work_id}`);
            return;
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

            if (result.status === 'verified') {
                await markVerified(item.work_id);
            }
        }

        console.log(`✅ Completed: ${item.work_id}`);

    } catch (err) {
        console.error(`❌ Error processing ${item.work_id}:`, err.message);
    } finally {
        activeJobs.delete(item.work_id);
    }
}

async function workerLoop(id) {
    console.log(`🧑‍💻 Worker ${id} started`);

    setInterval(async () => {
        console.log(`⏱ Worker ${id} tick...`);
        try {
            const queue = await fetchUnverifiedContent();

            if (!queue || queue.length === 0) {
                console.log(`📭 Worker ${id} queue empty`);
                return;
            }

            for (const item of queue) {
                await processItem(item);
            }
        } catch (err) {
            console.error(`🔥 Worker ${id} cycle failure:`, err.message);
        }
    }, POLL_INTERVAL);
}

export function startScanWorker() {
    console.log(`🔍 Starting ${WORKER_COUNT} scan workers...`);
    for (let i = 1; i <= WORKER_COUNT; i++) {
        workerLoop(i);
    }
}
