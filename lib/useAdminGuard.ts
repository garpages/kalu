"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// بررسی می‌کند کاربر وارد شده، ادمین و فعال باشد؛ در غیر این‌صورت هدایتش می‌کند.
export function useAdminGuard() {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function check() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_active")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "admin" || !profile.is_active) {
                router.replace("/dashboard");
                return;
            }

            setReady(true);
        }

        check();
    }, [router]);

    return ready;
}
