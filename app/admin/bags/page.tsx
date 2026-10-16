"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import Header from "@/components/Header";
import { useAdminGuard } from "@/lib/useAdminGuard";

const BUCKET = "shoe-images"; // همان باکت عکس مدل‌ها؛ عکس کیف‌ها زیر پوشه‌ی bags/ ذخیره می‌شود

type Bag = { id: string; code: string; thumb: string | null; count: number };

export default function BagsPage() {
    const router = useRouter();
    const ready = useAdminGuard();

    const [bags, setBags] = useState<Bag[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [code, setCode] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    async function load() {
        const [b, i] = await Promise.all([
            supabase.from("bags").select("id, code").order("code", { ascending: true }),
            supabase
                .from("bag_images")
                .select("bag_id, storage_path, created_at")
                .order("created_at", { ascending: true }),
        ]);

        if (b.error) console.error(b.error);

        const firstPath = new Map<string, string>();
        const counts = new Map<string, number>();
        for (const row of i.data || []) {
            if (!firstPath.has(row.bag_id)) firstPath.set(row.bag_id, row.storage_path);
            counts.set(row.bag_id, (counts.get(row.bag_id) || 0) + 1);
        }

        const paths = Array.from(firstPath.values());
        const urlByPath = new Map<string, string>();
        if (paths.length > 0) {
            const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrls(paths, 3600);
            (signed || []).forEach((s, idx) => {
                if (s.signedUrl) urlByPath.set(paths[idx], s.signedUrl);
            });
        }

        setBags(
            (b.data || []).map((bag) => {
                const p = firstPath.get(bag.id);
                return {
                    id: bag.id,
                    code: bag.code,
                    thumb: p ? urlByPath.get(p) || null : null,
                    count: counts.get(bag.id) || 0,
                };
            })
        );
        setLoading(false);
    }

    useEffect(() => {
        if (ready) load();
    }, [ready]);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();

        const trimmed = code.trim();
        if (!trimmed) return;

        setSaving(true);
        setMessage("");
        setSuccess(false);

        const { data: bag, error } = await supabase
            .from("bags")
            .insert({ code: trimmed })
            .select("id")
            .single();

        if (error || !bag) {
            console.error(error);
            setMessage(
                error?.code === "23505"
                    ? "این کد قبلاً برای یک کیف ثبت شده."
                    : "خطا در ثبت کیف: " + (error?.message || "")
            );
            setSaving(false);
            return;
        }

        try {
            for (const original of files) {
                const file = await compressImage(original);
                const ext = file.name.split(".").pop() || "jpg";
                const path = `bags/${bag.id}/${crypto.randomUUID()}.${ext}`;

                const { error: upErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(path, file, { cacheControl: "3600", upsert: false });
                if (upErr) throw new Error("خطای Storage: " + upErr.message);

                const { error: dbErr } = await supabase
                    .from("bag_images")
                    .insert({ bag_id: bag.id, storage_path: path });
                if (dbErr) {
                    await supabase.storage.from(BUCKET).remove([path]);
                    throw new Error("خطای دیتابیس: " + dbErr.message);
                }
            }

            setSuccess(true);
            setMessage("کیف با موفقیت ثبت شد.");
            setCode("");
            setFiles([]);
            await load();
        } catch (err) {
            console.error(err);
            setMessage(
                "کیف ثبت شد ولی آپلود عکس‌ها کامل نشد: " +
                    (err instanceof Error ? err.message : "")
            );
            await load();
        }

        setSaving(false);
    }

    const q = search.trim().toLowerCase();
    const visible = bags.filter((b) => !q || b.code.toLowerCase().includes(q));

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>کیف‌ها</h1>
                        <p className="muted">تعداد: {bags.length}</p>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                <div className="panel" style={{ marginBottom: 20 }}>
                    <h2>افزودن کیف جدید</h2>

                    <form onSubmit={handleAdd}>
                        <div className="form-grid">
                            <div className="field">
                                <label>کد کیف *</label>
                                <input
                                    className="input"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>عکس‌ها</label>
                                <input
                                    className="input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) =>
                                        setFiles(Array.from(e.target.files || []))
                                    }
                                />
                                {files.length > 0 && (
                                    <p className="muted" style={{ marginTop: 6 }}>
                                        {files.length} عکس انتخاب شده است.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="actions">
                            <button className="btn btn-primary" type="submit" disabled={saving}>
                                {saving ? "در حال ذخیره..." : "➕ ثبت کیف"}
                            </button>
                        </div>

                        {message && (
                            <p className={`status-message ${success ? "status-success" : "status-error"}`}>
                                {message}
                            </p>
                        )}
                    </form>
                </div>

                <div className="toolbar">
                    <input
                        className="input search"
                        type="text"
                        placeholder="جستجوی کد کیف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : visible.length === 0 ? (
                    <div className="panel empty-state">
                        <p>کیفی پیدا نشد.</p>
                    </div>
                ) : (
                    <div className="grid">
                        {visible.map((bag) => (
                            <article
                                className="card"
                                key={bag.id}
                                style={{ cursor: "pointer" }}
                                onClick={() => router.push(`/admin/bags/${bag.id}`)}
                            >
                                <div className="card-image">
                                    {bag.thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={bag.thumb} alt={`کیف ${bag.code}`} />
                                    ) : (
                                        <div className="gallery-placeholder">بدون عکس</div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div className="code">کد کیف: {bag.code}</div>
                                    <div className="muted">{bag.count} عکس</div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
