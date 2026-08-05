"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StarButton({
    modelId,
    isFavorite,
    onChange,
}: {
    modelId: string;
    isFavorite: boolean;
    onChange?: (favorited: boolean) => void;
}) {
    const [busy, setBusy] = useState(false);

    async function toggle(e: React.MouseEvent) {
        e.stopPropagation();
        e.preventDefault();

        if (busy) return;
        setBusy(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setBusy(false);
            return;
        }

        if (isFavorite) {
            await supabase
                .from("favorites")
                .delete()
                .eq("user_id", user.id)
                .eq("model_id", modelId);
            onChange?.(false);
        } else {
            await supabase
                .from("favorites")
                .insert({ user_id: user.id, model_id: modelId });
            onChange?.(true);
        }

        setBusy(false);
    }

    return (
        <button
            onClick={toggle}
            disabled={busy}
            title={isFavorite ? "حذف از پرکاربردها" : "افزودن به پرکاربردها"}
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                padding: 4,
                color: isFavorite ? "var(--brass)" : "var(--ink-soft)",
            }}
        >
            {isFavorite ? "★" : "☆"}
        </button>
    );
}
