"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import StarButton from "@/components/StarButton";
import { saveCache, loadCache } from "@/lib/offlineCache";

type ShoeModel = {
    id: string;
    code: string;
    material_type_1: string | null;
    material_type_2: string | null;
    description: string | null;
};

const PAGE_SIZE = 24;
const CACHE_KEY = "kalu_cache_dashboard_models";

export default function DashboardPage() {
    const router = useRouter();

    const [models, setModels] = useState<ShoeModel[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        async function load() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("is_active")
                .eq("id", user.id)
                .single();

            if (profileError || !profile || !profile.is_active) {
                const cached = loadCache<ShoeModel[]>(CACHE_KEY);
                if (cached) {
                    setModels(cached);
                    setOffline(true);
                    setLoading(false);
                    return;
                }
                await supabase.auth.signOut();
                router.replace("/login");
                return;
            }

            const { data, error } = await supabase
                .from("shoe_models")
                .select("id, code, material_type_1, material_type_2, description")
                .order("code", { ascending: true });

            if (error) {
                console.error("Load Models Error:", error);
                const cached = loadCache<ShoeModel[]>(CACHE_KEY);
                if (cached) {
                    setModels(cached);
                    setOffline(true);
                }
                setLoading(false);
                return;
            }

            setModels(data || []);
            saveCache(CACHE_KEY, data || []);

            const { data: favRows } = await supabase
                .from("favorites")
                .select("model_id")
                .eq("user_id", user.id);

            setFavoriteIds(new Set((favRows || []).map((r) => r.model_id)));

            setLoading(false);
        }

        load();
    }, [router]);

    const filteredModels = models.filter((model) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;

        return [model.code, model.material_type_1, model.material_type_2, model.description]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(q));
    });

    const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
    const pageModels = filteredModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <>
            <Header />

            <main className="container page">
                {offline && (
                    <div className="status-message status-error" style={{ marginBottom: 16 }}>
                        📡 حالت آفلاین — این آخرین لیستی است که قبلاً دیده‌ای. برای اطلاعات جدید به اینترنت وصل شو.
                    </div>
                )}

                <div className="toolbar">
                    <Link href="/favorites">
                        <button className="btn btn-secondary">⭐ پرکاربردها</button>
                    </Link>

                    <input
                        className="input search"
                        type="text"
                        placeholder="جستجو بر اساس کد یا جنس..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری مدل‌ها...</p>
                ) : filteredModels.length === 0 ? (
                    <div className="panel">
                        <p className="muted">مدلی پیدا نشد.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid">
                            {pageModels.map((model) => (
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
                                            <Link
                                                className="btn btn-primary"
                                                href={`/models/${model.id}`}
                                            >
                                                مشاهده جزئیات
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="toolbar" style={{ justifyContent: "center", marginTop: 20 }}>
                                <button
                                    className="btn btn-secondary"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    قبلی
                                </button>
                                <span className="muted">صفحه {page} از {totalPages}</span>
                                <button
                                    className="btn btn-secondary"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    بعدی
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
