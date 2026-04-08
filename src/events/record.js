import supabase from '../../config/supabaseClient.js';

export async function recordEvent(event) {
    const { error } = await supabase
        .from('verification_events')
        .insert([event]);

    if (error) {
        console.error("❌ Failed to record event:", error.message);
    } else {
        console.log("📡 Event recorded:", event.work_id, event.status);
    }
}
