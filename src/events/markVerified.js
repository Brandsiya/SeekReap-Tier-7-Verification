import supabase from '../../config/supabaseClient.js';

export async function markVerified(work_id) {
    const { error } = await supabase
        .from('works')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', work_id);

    if (error) {
        console.error(`❌ Error marking work ${work_id} as verified:`, error.message);
        return false;
    }

    console.log(`✅ Work ${work_id} marked as verified`);
    return true;
}
