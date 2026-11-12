"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/Icon";

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

        const { error } = isFavorite
            ? await supabase
                  .from("favorites")
                  .delete()
                  .eq("user_id", user.id)
                  .eq("model_id", modelId)
            : await supabase
                  .from("favorites")
                  .insert({ user_id: user.id, model_id: modelId });

        // only change the star when the server accepted it
        if (!error) onChange?.(!isFavorite);

        setBusy(false);
    }

    const label = isFavorite ? "حذف از پرکاربردها" : "افزودن به پرکاربردها";

    return (
        <button
            type="button"
            className="star-btn"
            data-on={isFavorite}
            onClick={toggle}
            disabled={busy}
            title={label}
            aria-label={label}
            aria-pressed={isFavorite}
        >
            <Icon name="star" size={20} fill={isFavorite ? "currentColor" : "none"} />
        </button>
    );
}
