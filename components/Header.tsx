'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function checkRole() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            setIsAdmin(profile?.role === "admin");
        }

        checkRole();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <header className="topbar">
            <div>
                <div className="brand">KALU</div>
                <small className="muted">مدیریت مدل‌های کفش</small>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <button
                    className="btn btn-secondary"
                    onClick={() => router.push(isAdmin ? "/admin" : "/dashboard")}
                >
                    {isAdmin ? "پنل مدیریت" : "داشبورد"}
                </button>

                <button className="btn btn-secondary" onClick={handleLogout}>
                    خروج
                </button>
            </div>
        </header>
    );
}
