'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearSessionCaches, getCachedRole, setCachedRole } from "@/lib/session";
import Icon, { type IconName } from "@/components/Icon";
import { clearSignedUrlCache } from "@/lib/signedUrls";

type MenuItem = { href: string; label: string; icon: IconName; bulk?: boolean };
type MenuGroup = { title: string; items: MenuItem[] };

const ADMIN_GROUPS: MenuGroup[] = [
    {
        title: "مدل‌ها",
        items: [
            { href: "/admin", label: "پنل مدیریت", icon: "home" },
            { href: "/admin/add-model", label: "افزودن مدل جدید", icon: "plus" },
            { href: "/admin?select=1", label: "انتخاب گروهی", icon: "select", bulk: true },
            { href: "/favorites", label: "پرکاربردها", icon: "star" },
        ],
    },
    {
        title: "کارگاه",
        items: [
            { href: "/admin/workers", label: "لیست کار جمع کنی", icon: "list" },
            { href: "/admin/bags", label: "کیف‌ها", icon: "bag" },
            { href: "/admin/no-info", label: "بدون اطلاعات", icon: "file" },
        ],
    },
    {
        title: "مدیریت",
        items: [
            { href: "/admin/activity", label: "تاریخچه‌ی تغییرات", icon: "history" },
            { href: "/admin/users", label: "مدیریت کاربران", icon: "users" },
        ],
    },
];

const USER_GROUPS: MenuGroup[] = [
    {
        title: "مدل‌ها",
        items: [
            { href: "/dashboard", label: "داشبورد", icon: "home" },
            { href: "/favorites", label: "پرکاربردها", icon: "star" },
        ],
    },
];

const CLOSE_MS = 200;

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    // mounted = in the DOM, shown = animated in (lets the exit animation play)
    const [mounted, setMounted] = useState(false);
    const [shown, setShown] = useState(false);

    const menuBtnRef = useRef<HTMLButtonElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        async function checkRole() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const cached = getCachedRole(user.id);
            if (cached) {
                setIsAdmin(cached === "admin");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role) setCachedRole(user.id, profile.role);
            setIsAdmin(profile?.role === "admin");
        }

        checkRole();
    }, []);

    const openMenu = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setMounted(true);
        // two frames: the drawer must paint in its closed position first
        requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    }, []);

    const closeMenu = useCallback((restoreFocus = true) => {
        setShown(false);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setMounted(false), CLOSE_MS);
        if (restoreFocus) menuBtnRef.current?.focus();
    }, []);

    // close right away when the page changes
    useEffect(() => {
        if (timer.current) clearTimeout(timer.current);
        setShown(false);
        setMounted(false);
    }, [pathname]);

    // while open: lock page scroll, move focus in, Escape closes, Tab stays inside
    useEffect(() => {
        if (!mounted) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeBtnRef.current?.focus();

        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                closeMenu();
                return;
            }

            if (e.key !== "Tab" || !drawerRef.current) return;

            const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [mounted, closeMenu]);

    useEffect(() => {
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    async function handleLogout() {
        clearSessionCaches();
        clearSignedUrlCache();
        await supabase.auth.signOut();
        router.push("/login");
    }

    const groups = isAdmin ? ADMIN_GROUPS : USER_GROUPS;

    return (
        <>
            <header className="topbar">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <button
                        ref={menuBtnRef}
                        className="menu-btn"
                        onClick={openMenu}
                        aria-label="باز کردن منو"
                        aria-haspopup="dialog"
                        aria-expanded={mounted}
                    >
                        <Icon name="menu" size={22} />
                    </button>

                    <div className="brand-block">
                        <div className="brand">KALU</div>
                        <small className="muted">مدیریت مدل‌های کفش</small>
                    </div>
                </div>
            </header>

            {mounted && (
                <div
                    className="drawer-overlay"
                    data-open={shown}
                    onClick={() => closeMenu()}
                >
                    <nav
                        ref={drawerRef}
                        className="drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="منوی اصلی"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="drawer-head">
                            <div className="brand" style={{ fontSize: 20 }}>
                                KALU
                            </div>
                            <button
                                ref={closeBtnRef}
                                className="menu-btn"
                                onClick={() => closeMenu()}
                                aria-label="بستن منو"
                            >
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        {groups.map((group) => (
                            <div key={group.title}>
                                <div className="drawer-group">{group.title}</div>

                                {group.items.map((item) => {
                                    const active = pathname === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="drawer-link"
                                            aria-current={active ? "page" : undefined}
                                            onClick={(e) => {
                                                if (item.bulk) {
                                                    // a fresh value each time so it also works while already on /admin
                                                    e.preventDefault();
                                                    closeMenu(false);
                                                    router.push(`/admin?select=${Date.now()}`);
                                                }
                                            }}
                                        >
                                            <Icon name={item.icon} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}

                        <div className="drawer-foot">
                            <button
                                className="btn btn-danger btn-block"
                                onClick={handleLogout}
                            >
                                <Icon name="logout" size={18} />
                                خروج
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}
