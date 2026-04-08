import supabase from '../../config/supabaseClient.js';

export async function fetchUnverifiedContent(limit = 5) {
    console.log("📥 Fetching unverified batch...");

    // 1. Find items not verified and not already being handled
    const { data, error } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('verified', false)
        .eq('processing', false) 
        .limit(limit);

    if (error) {
        console.error("❌ Fetch error:", error.message);
        return [];
    }

    if (data && data.length > 0) {
        const ids = data.map(item => item.submission_id || item.id);
        
        // 2. Immediate Lock: prevent other workers from grabbing these
        await supabase
            .from('content_submissions')
            .update({ processing: true })
            .in('id', ids); // Adjust to 'submission_id' if that is your PK
            
        console.log(`🔒 Locked ${data.length} items for parallel processing.`);
    }

    return data || [];
}
