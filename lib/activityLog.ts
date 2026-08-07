import { supabase } from "@/lib/supabase";

export async function logActivity(action: string, modelCode?: string | null) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_log").insert({
        user_email: user?.email || null,
        action,
        model_code: modelCode || null,
    });
}
