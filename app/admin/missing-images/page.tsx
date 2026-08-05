"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type ShoeModel = {
    id: string;
    code: string;
    material_type_1: string | null;
};

export default function MissingImagesPage() {
    const router = useRouter();
    const [models, setModels] = useState<ShoeModel[]>([]);
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

            const { data: allModels } = await supabase
                .from("shoe_models")
                .select("id, code, material_type_1")
                .order("code", { ascending: true });

            const { data: imageRows } = await supabase
                .from("model_images")
                .select("model_id");

            const idsWithImages = new Set(
                (imageRows || []).map((row) => row.model_id)
            );

            setModels((allModels || []).filter((m) => !idsWithImages.has(m.id)));
            setLoading(false);
        }

        load();
    }, [router]);

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدل‌های بدون عکس</h1>
                        <p className="muted">تعداد: {models.length}</p>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : models.length === 0 ? (
                    <div className="panel empty-state">
                        <p>همه‌ی مدل‌ها عکس دارند 🎉</p>
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
                                                router.push(`/admin/model/${model.id}`)
                                            }
                                        >
                                            افزودن عکس
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
