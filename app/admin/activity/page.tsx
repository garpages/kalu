"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type LogRow = {
    id: string;
    user_email: string | null;
    action: string;
    model_code: string | null;
    created_at: string;
};

export default function ActivityLogPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
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

            const { data, error } = await supabase
                .from("activity_log")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) {
                console.error("Load Activity Log Error:", error);
                setLoading(false);
                return;
            }

            setLogs(data || []);
            setLoading(false);
        }

        load();
    }, [router]);

    function formatDate(iso: string) {
        return new Date(iso).toLocaleString("fa-IR");
    }

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>تاریخچه تغییرات</h1>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                <div className="panel">
                    {loading ? (
                        <p className="muted">در حال بارگذاری...</p>
                    ) : logs.length === 0 ? (
                        <p className="muted">هنوز رویدادی ثبت نشده است.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="detail"
                                    style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
                                >
                                    <div>
                                        <strong>{log.action}</strong>
                                        {log.model_code && <span> — کد کار: {log.model_code}</span>}
                                        <div className="muted" style={{ marginTop: 4 }}>
                                            {log.user_email || "کاربر نامشخص"}
                                        </div>
                                    </div>

                                    <div className="muted" style={{ whiteSpace: "nowrap" }}>
                                        {formatDate(log.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
