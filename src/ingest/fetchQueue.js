import supabase from '../../config/supabaseClient.js';

export async function fetchUnverifiedContent() {
    console.log("📥 Fetching unverified queue from Supabase...");

    const { data, error } = await supabase
        .from('content_submissions')
        .select('id, fingerprint')
        .eq('verified', false)
        .limit(10);

    if (error) {
        console.error("❌ Supabase fetch error:", error.message);
        return [];
    }

    if (!data || data.length === 0) return [];

    return data.map(item => ({
        work_id: item.id,
        fingerprint: item.fingerprint
    }));
}
