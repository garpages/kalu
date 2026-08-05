"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import StarButton from "@/components/StarButton";

type ShoeModel = {
    id: string;
    code: string;
    material_type_1: string | null;
};

export default function FavoritesPage() {
    const router = useRouter();

    const [models, setModels] = useState<ShoeModel[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);

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

        setIsAdmin(profile.role === "admin");

        const { data: favRows } = await supabase
            .from("favorites")
            .select("model_id")
            .eq("user_id", user.id);

        const ids = (favRows || []).map((r) => r.model_id);

        if (ids.length === 0) {
            setModels([]);
            setLoading(false);
            return;
        }

        const { data: modelRows } = await supabase
            .from("shoe_models")
            .select("id, code, material_type_1")
            .in("id", ids)
            .order("code", { ascending: true });

        setModels(modelRows || []);
        setLoading(false);
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <h1>⭐ کدهای پرکاربرد</h1>
                        <p className="muted">تعداد: {models.length}</p>
                    </div>

                    <Link href={isAdmin ? "/admin" : "/dashboard"}>
                        <button className="btn btn-secondary">بازگشت</button>
                    </Link>
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : models.length === 0 ? (
                    <div className="panel empty-state">
                        <p>هنوز چیزی به این لیست اضافه نکردی. رو ستاره‌ی کنار هر کد بزن تا اینجا اضافه بشه.</p>
                    </div>
                ) : (
                    <div className="grid">
                        {models.map((model) => (
                            <article className="card" key={model.id}>
                                <div className="card-body">
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div className="code">کد کار: {model.code}</div>

                                        <StarButton
                                            modelId={model.id}
                                            isFavorite={true}
                                            onChange={() => load()}
                                        />
                                    </div>

                                    <div className="muted">
                                        {model.material_type_1 || "بدون جنس ثبت‌شده"}
                                    </div>

                                    <div className="card-actions">
                                        <Link
                                            className="btn btn-primary"
                                            href={isAdmin ? `/admin/model/${model.id}` : `/models/${model.id}`}
                                        >
                                            مشاهده جزئیات
                                        </Link>
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
