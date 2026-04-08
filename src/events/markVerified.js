import supabase from '../../config/supabaseClient.js';

export async function markWorkAsVerified(work_id) {
    const { error } = await supabase
        .from('content_submissions')
        .update({
            verified: true,
            verified_at: new Date().toISOString()
        })
        .eq('id', work_id);

    if (error) {
        console.error(`❌ Failed to mark verified: ${work_id}`, error.message);
    } else {
        console.log(`✔️ Marked verified: ${work_id}`);
    }
}
