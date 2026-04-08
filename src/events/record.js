import supabase from '../../config/supabaseClient.js';

export async function recordEvent(event) {
    console.log("📡 Recording event:", event);

    const { error } = await supabase
        .from('content_matches')
        .insert([{
            work_id: event.work_id,
            source_url: event.source_url,
            status: event.status,
            confidence: event.confidence || null,
            checked_at: event.checked_at
        }]);

    if (error) {
        console.error("❌ Failed to record event:", error.message);
    }
}
