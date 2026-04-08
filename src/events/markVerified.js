import supabase from '../../config/supabaseClient.js';

export async function markVerified(work_id) {
    const { error } = await supabase
        .from('works')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', work_id);

    if (error) {
        console.error(`❌ Failed to mark verified: ${work_id}`, error.message);
    } else {
        console.log(`✅ Work marked verified: ${work_id}`);
    }
}
