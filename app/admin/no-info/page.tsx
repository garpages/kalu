"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { useAdminGuard } from "@/lib/useAdminGuard";

type ShoeModel = {
    id: string;
    code: string;
    last_code: string | null;
    material_type_1: string | null;
};

export default function NoInfoPage() {
    const router = useRouter();
    const ready = useAdminGuard();
    const [models, setModels] = useState<ShoeModel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ready) return;

        async function load() {
            const { data, error } = await supabase
                .from("shoe_models")
                .select("id, code, last_code, material_type_1")
                .order("code", { ascending: true });

            if (error) console.error(error);

            // مدل بدون اطلاعات = کد قالب وارد نشده
            setModels((data || []).filter((m) => !m.last_code?.trim()));
            setLoading(false);
        }

        load();
    }, [ready]);

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدل‌های بدون اطلاعات</h1>
                        <p className="muted">
                            مدل‌هایی که کد قالبشان وارد نشده — تعداد: {models.length}
                        </p>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : models.length === 0 ? (
                    <div className="panel empty-state">
                        <p>برای همه‌ی مدل‌ها کد قالب ثبت شده 🎉</p>
                    </div>
                ) : (
                    <div className="grid">
                        {models.map((model) => (
                            <article className="card" key={model.id}>
                                <div className="card-body">
                                    <div className="code">کد کار: {model.code}</div>
                                    <div className="muted">
                                        {model.material_type_1 || "بدون جنس ثبت‌شده"}
                                    </div>
                                    <div className="card-actions">
                                        <button
                                            className="btn btn-primary"
                                            onClick={() =>
                                                router.push(`/admin/model/${model.id}/edit`)
                                            }
                                        >
                                            ✏️ تکمیل اطلاعات
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
