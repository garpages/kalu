"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        async function checkSession() {
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

            if (!profile || !profile.is_active) {
                router.replace("/login");
                return;
            }

            router.replace(profile.role === "admin" ? "/admin" : "/dashboard");
        }

        checkSession();
    }, [router]);

    return (
        <main className="login">
            <p className="muted">در حال بارگذاری...</p>
        </main>
    );
}
