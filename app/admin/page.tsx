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
    last_code: string | null;
    sole_code: string | null;
    heel_code: string | null;
    outsole_code: string | null;
    wedge_code: string | null;
    toe_work: string | null;
    toe_sole: string | null;
    material_type_1: string | null;
    material_type_2: string | null;
    hardware: string | null;
    description: string | null;
};

export default function AdminPage() {
    const router = useRouter();

    const [models, setModels] = useState<ShoeModel[]>([]);
    const [missingImagesCount, setMissingImagesCount] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function loadModels() {
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

            if (
                !profile ||
                profile.role !== "admin" ||
                !profile.is_active
            ) {
                router.replace("/dashboard");
                return;
            }

            const { data, error } = await supabase
                .from("shoe_models")
                .select("*")
                .order("code", { ascending: true });

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            setModels(data || []);

            const { data: imageRows } = await supabase
                .from("model_images")
                .select("model_id");

            const idsWithImages = new Set(
                (imageRows || []).map((row) => row.model_id)
            );

            setMissingImagesCount(
                (data || []).filter((m) => !idsWithImages.has(m.id)).length
            );

            const { data: favRows } = await supabase
                .from("favorites")
                .select("model_id")
                .eq("user_id", user.id);

            setFavoriteIds(new Set((favRows || []).map((r) => r.model_id)));

            setLoading(false);
        }

        loadModels();
    }, [router]);

    const filteredModels = models.filter((model) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;

        return [
            model.code,
            model.material_type_1,
            model.material_type_2,
            model.hardware,
            model.last_code,
            model.sole_code,
            model.description,
        ]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(q));
    });

    const materialCounts = models.reduce<Record<string, number>>((acc, m) => {
        const key = m.material_type_1?.trim();
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const topMaterials = Object.entries(materialCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدل‌های کفش</h1>
                        <p className="muted">تعداد کل: {models.length}</p>
                    </div>

                    <div className="actions" style={{ marginTop: 0 }}>
                        <Link href="/favorites">
                            <button className="btn btn-secondary">
                                ⭐ پرکاربردها
                            </button>
                        </Link>

                        <Link href="/admin/missing-images">
                            <button className="btn btn-secondary">
                                ⚠️ بدون عکس {missingImagesCount > 0 ? `(${missingImagesCount})` : ""}
                            </button>
                        </Link>

                        <Link href="/admin/users">
                            <button className="btn btn-secondary">
                                👥 مدیریت کاربران
                            </button>
                        </Link>

                        <Link href="/admin/add-model">
                            <button className="btn btn-primary">
                                ➕ افزودن مدل جدید
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="stats">
                    <div className="stat">
                        <span className="muted">تعداد کل مدل‌ها</span>
                        <b>{models.length}</b>
                    </div>

                    {topMaterials.map(([material, count]) => (
                        <div className="stat" key={material}>
                            <span className="muted">پرکاربردترین جنس: {material}</span>
                            <b>{count}</b>
                        </div>
                    ))}
                </div>

                <div className="toolbar">
                    <input
                        className="input search"
                        type="text"
                        placeholder="جستجو بر اساس کد، جنس، یراق یا توضیحات..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری مدل‌ها...</p>
                ) : filteredModels.length === 0 ? (
                    <div className="panel empty-state">
                        <p>مدلی پیدا نشد.</p>
                    </div>
                ) : (
                    <div className="grid">
                        {filteredModels.map((model) => (
                            <article className="card" key={model.id}>
                                <div className="card-body">
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div className="code">
                                            کد کار: {model.code}
                                        </div>

                                        <StarButton
                                            modelId={model.id}
                                            isFavorite={favoriteIds.has(model.id)}
                                            onChange={(fav) =>
                                                setFavoriteIds((current) => {
                                                    const next = new Set(current);
                                                    if (fav) next.add(model.id);
                                                    else next.delete(model.id);
                                                    return next;
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="muted">
                                        {model.material_type_1 || "بدون جنس ثبت‌شده"}
                                    </div>

                                    <div className="card-actions">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                router.push(`/admin/model/${model.id}`)
                                            }
                                        >
                                            مشاهده جزئیات
                                        </button>

                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                router.push(
                                                    `/admin/add-model?copyFrom=${model.id}`
                                                )
                                            }
                                            title="ساخت مدل جدید با کپی از این مدل"
                                        >
                                            📋 کپی
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
