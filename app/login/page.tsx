"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoginForm from "@/components/LoginForm";

export default function Page() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setChecking(false);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_active")
                .eq("id", user.id)
                .single();

            if (!profile || !profile.is_active) {
                setChecking(false);
                return;
            }

            router.replace(profile.role === "admin" ? "/admin" : "/dashboard");
        }

        checkSession();
    }, [router]);

    if (checking) {
        return (
            <main className="login">
                <p className="muted">در حال بررسی ورود...</p>
            </main>
        );
    }

    return (
        <main className="login">
            <LoginForm />
        </main>
    );
}
