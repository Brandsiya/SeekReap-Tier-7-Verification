import { startScanWorker } from './scanWorker.js';

export function startWorkers() {
    console.log("🧠 Starting verification workers...");
    startScanWorker();
}
