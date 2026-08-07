"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import StarButton from "@/components/StarButton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { logActivity } from "@/lib/activityLog";
import { saveCache, loadCache } from "@/lib/offlineCache";

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

const PAGE_SIZE = 24;
const CACHE_KEY = "kalu_cache_admin_models";

export default function AdminPage() {
    const router = useRouter();

    const [models, setModels] = useState<ShoeModel[]>([]);
    const [missingImagesCount, setMissingImagesCount] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [offline, setOffline] = useState(false);

    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

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

    const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
    const pageModels = filteredModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const materialCounts = models.reduce<Record<string, number>>((acc, m) => {
        const key = m.material_type_1?.trim();
        if (key) acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const topMaterials = Object.entries(materialCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);

    function toggleSelect(id: string) {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function exportSelectedCsv() {
        const selected = models.filter((m) => selectedIds.has(m.id));
        const headers = ["code", "last_code", "sole_code", "heel_code", "outsole_code", "wedge_code", "toe_work", "toe_sole", "material_type_1", "material_type_2", "hardware"];
        const rows = selected.map((m) =>
            headers.map((h) => `"${(m as any)[h] ?? ""}"`).join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kalu-models.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleBulkDelete() {
        setBulkDeleting(true);

        const ids = Array.from(selectedIds);

        const { error } = await supabase
            .from("shoe_models")
            .delete()
            .in("id", ids);

        if (error) {
            console.error("Bulk Delete Error:", error);
            alert("خطا در حذف گروهی.");
            setBulkDeleting(false);
            return;
        }

        logActivity(`حذف گروهی ${ids.length} مدل`);

        setModels((current) => current.filter((m) => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setSelectMode(false);
        setBulkDeleting(false);
    }

    return (
        <>
            <Header />

            <main className="container page">
                {offline && (
                    <div className="status-message status-error" style={{ marginBottom: 16 }}>
                        📡 حالت آفلاین — این آخرین لیستی است که قبلاً دیده‌ای.
                    </div>
                )}

                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدل‌های کفش</h1>
                        <p className="muted">تعداد کل: {models.length}</p>
                    </div>

                    <div className="actions" style={{ marginTop: 0, flexWrap: "wrap" }}>
                        <Link href="/favorites">
                            <button className="btn btn-secondary">⭐ پرکاربردها</button>
                        </Link>

                        <Link href="/admin/missing-images">
                            <button className="btn btn-secondary">
                                ⚠️ بدون عکس {missingImagesCount > 0 ? `(${missingImagesCount})` : ""}
                            </button>
                        </Link>

                        <Link href="/admin/activity">
                            <button className="btn btn-secondary">📜 تاریخچه</button>
                        </Link>

                        <Link href="/admin/users">
                            <button className="btn btn-secondary">👥 مدیریت کاربران</button>
                        </Link>

                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                setSelectMode((v) => !v);
                                setSelectedIds(new Set());
                            }}
                        >
                            {selectMode ? "لغو انتخاب گروهی" : "☑️ انتخاب گروهی"}
                        </button>

                        <Link href="/admin/add-model">
                            <button className="btn btn-primary">➕ افزودن مدل جدید</button>
                        </Link>
                    </div>
                </div>

                {selectMode && (
                    <div className="panel" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <span className="muted">{selectedIds.size} مورد انتخاب شده</span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                className="btn btn-secondary"
                                disabled={selectedIds.size === 0}
                                onClick={exportSelectedCsv}
                            >
                                ⬇️ خروجی CSV
                            </button>
                            <button
                                className="btn btn-danger"
                                disabled={selectedIds.size === 0}
                                onClick={() => setBulkConfirmOpen(true)}
                            >
                                🗑️ حذف انتخاب‌شده‌ها
                            </button>
                        </div>
                    </div>
                )}

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
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری مدل‌ها...</p>
                ) : filteredModels.length === 0 ? (
                    <div className="panel empty-state">
                        <p>مدلی پیدا نشد.</p>
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
                                                gap: 8,
                                            }}
                                        >
                                            {selectMode && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(model.id)}
                                                    onChange={() => toggleSelect(model.id)}
                                                    style={{ width: 18, height: 18 }}
                                                />
                                            )}

                                            <div className="code" style={{ flex: 1 }}>
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

            <ConfirmDialog
                open={bulkConfirmOpen}
                title="حذف گروهی"
                message={`آیا مطمئن هستید که می‌خواهید ${selectedIds.size} مدل انتخاب‌شده را حذف کنید؟`}
                confirmLabel={bulkDeleting ? "در حال حذف..." : "حذف"}
                danger
                onCancel={() => setBulkConfirmOpen(false)}
                onConfirm={() => {
                    setBulkConfirmOpen(false);
                    handleBulkDelete();
                }}
            />
        </>
    );
}
