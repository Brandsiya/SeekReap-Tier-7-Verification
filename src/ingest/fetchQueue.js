import supabase from '../../config/supabaseClient.js';

export async function fetchUnverifiedContent() {
    console.log("📥 Fetching queue from Supabase...");

    const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 5;

    const { data, error } = await supabase
        .from('works')
        .select('id, fingerprint')
        .eq('verified', false)
        .limit(BATCH_SIZE);

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
