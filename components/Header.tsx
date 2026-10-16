'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MenuItem = { href: string; label: string };

const ADMIN_ITEMS: MenuItem[] = [
    { href: "/admin", label: "🏠 پنل مدیریت" },
    { href: "/admin/add-model", label: "➕ افزودن مدل جدید" },
    { href: "/favorites", label: "⭐ پرکاربردها" },
    { href: "/admin/workers", label: "🧵 لیست کار جمع کنی" },
    { href: "/admin/bags", label: "👜 کیف‌ها" },
    { href: "/admin/no-info", label: "📝 بدون اطلاعات" },
    { href: "/admin/activity", label: "🕘 تاریخچه‌ی تغییرات" },
    { href: "/admin/users", label: "👥 مدیریت کاربران" },
];

const USER_ITEMS: MenuItem[] = [
    { href: "/dashboard", label: "🏠 داشبورد" },
    { href: "/favorites", label: "⭐ پرکاربردها" },
];

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [open, setOpen] = useState(false);

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

    // بستن منو با تغییر صفحه
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // بستن منو با Escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const items = isAdmin ? ADMIN_ITEMS : USER_ITEMS;

    return (
        <>
            <header className="topbar">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: "8px 14px", fontSize: 20, lineHeight: 1 }}
                        onClick={() => setOpen(true)}
                        aria-label="باز کردن منو"
                    >
                        ☰
                    </button>

                    <div>
                        <div className="brand">KALU</div>
                        <small className="muted">مدیریت مدل‌های کفش</small>
                    </div>
                </div>
            </header>

            {open && (
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 11, 8, 0.5)",
                        zIndex: 100,
                    }}
                >
                    <nav
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            insetInlineStart: 0,
                            width: "min(320px, 85%)",
                            background: "var(--surface)",
                            borderInlineEnd: "1px solid var(--line)",
                            padding: 20,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            overflowY: "auto",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                            }}
                        >
                            <div className="brand">KALU</div>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: "6px 12px" }}
                                onClick={() => setOpen(false)}
                                aria-label="بستن منو"
                            >
                                ✕
                            </button>
                        </div>

                        {items.map((item) => {
                            const active = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    style={{
                                        padding: "12px 14px",
                                        borderRadius: "var(--radius-sm)",
                                        fontWeight: 700,
                                        background: active
                                            ? "var(--brass-soft)"
                                            : "transparent",
                                        border: active
                                            ? "1px solid var(--brass)"
                                            : "1px solid transparent",
                                    }}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}

                        <div style={{ flex: 1 }} />

                        <button
                            className="btn btn-danger"
                            onClick={handleLogout}
                        >
                            خروج
                        </button>
                    </nav>
                </div>
            )}
        </>
    );
}
