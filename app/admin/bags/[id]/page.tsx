"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import Header from "@/components/Header";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAdminGuard } from "@/lib/useAdminGuard";

const BUCKET = "shoe-images";

type BagImage = {
    id: string;
    storage_path: string;
    url: string | null;
};

export default function BagDetailPage() {
    const params = useParams();
    const router = useRouter();
    const ready = useAdminGuard();
    const bagId = params.id as string;

    const [code, setCode] = useState("");
    const [codeDraft, setCodeDraft] = useState("");
    const [images, setImages] = useState<BagImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const [imageToDelete, setImageToDelete] = useState<BagImage | null>(null);
    const [confirmDeleteBag, setConfirmDeleteBag] = useState(false);

    async function load() {
        const { data: bag, error } = await supabase
            .from("bags")
            .select("id, code")
            .eq("id", bagId)
            .single();

        if (error || !bag) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        setCode(bag.code);
        setCodeDraft(bag.code);

        const { data: rows } = await supabase
            .from("bag_images")
            .select("id, storage_path")
            .eq("bag_id", bagId)
            .order("created_at", { ascending: true });

        const list = rows || [];
        let urls: (string | null)[] = [];

        if (list.length > 0) {
            const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrls(list.map((r) => r.storage_path), 3600);
            urls = (signed || []).map((s) => s.signedUrl || null);
        }

        setImages(list.map((r, i) => ({ ...r, url: urls[i] || null })));
        setLoading(false);
    }

    useEffect(() => {
        if (ready) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, bagId]);

    async function saveCode() {
        const trimmed = codeDraft.trim();
        if (!trimmed || trimmed === code) return;

        const { error } = await supabase
            .from("bags")
            .update({ code: trimmed })
            .eq("id", bagId);

        if (error) {
            setSuccess(false);
            setMessage(
                error.code === "23505"
                    ? "این کد قبلاً برای کیف دیگری ثبت شده."
                    : "خطا در تغییر کد: " + error.message
            );
            return;
        }

        setCode(trimmed);
        setSuccess(true);
        setMessage("کد کیف تغییر کرد.");
    }

    async function handleUpload() {
        if (files.length === 0) {
            setSuccess(false);
            setMessage("لطفاً حداقل یک عکس انتخاب کنید.");
            return;
        }

        setUploading(true);
        setMessage("");

        try {
            for (const original of files) {
                const file = await compressImage(original);
                const ext = file.name.split(".").pop() || "jpg";
                const path = `bags/${bagId}/${crypto.randomUUID()}.${ext}`;

                const { error: upErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(path, file, { cacheControl: "3600", upsert: false });
                if (upErr) throw new Error("خطای Storage: " + upErr.message);

                const { error: dbErr } = await supabase
                    .from("bag_images")
                    .insert({ bag_id: bagId, storage_path: path });
                if (dbErr) {
                    await supabase.storage.from(BUCKET).remove([path]);
                    throw new Error("خطای دیتابیس: " + dbErr.message);
                }
            }

            setFiles([]);
            setSuccess(true);
            setMessage("عکس‌ها با موفقیت آپلود شدند.");
            await load();
        } catch (err) {
            console.error(err);
            setSuccess(false);
            setMessage(err instanceof Error ? err.message : "خطای ناشناخته در آپلود.");
        }

        setUploading(false);
    }

    async function deleteImage() {
        if (!imageToDelete) return;
        const target = imageToDelete;
        setImageToDelete(null);

        const { error: sErr } = await supabase.storage
            .from(BUCKET)
            .remove([target.storage_path]);
        if (sErr) {
            console.error(sErr);
            alert("خطا در حذف فایل عکس.");
            return;
        }

        const { error: dErr } = await supabase
            .from("bag_images")
            .delete()
            .eq("id", target.id);
        if (dErr) {
            console.error(dErr);
            alert("خطا در حذف رکورد عکس.");
            return;
        }

        setImages((cur) => cur.filter((x) => x.id !== target.id));
    }

    async function deleteBag() {
        setConfirmDeleteBag(false);

        if (images.length > 0) {
            await supabase.storage
                .from(BUCKET)
                .remove(images.map((i) => i.storage_path));
        }

        const { error } = await supabase.from("bags").delete().eq("id", bagId);
        if (error) {
            console.error(error);
            alert("خطا در حذف کیف.");
            return;
        }

        router.replace("/admin/bags");
    }

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>کیف {code}</h1>
                    </div>

                    <Link href="/admin/bags">
                        <button className="btn btn-secondary">بازگشت به کیف‌ها</button>
                    </Link>
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : notFound ? (
                    <div className="panel empty-state">
                        <p>این کیف پیدا نشد.</p>
                    </div>
                ) : (
                    <>
                        <div className="panel" style={{ marginBottom: 20 }}>
                            <div className="field">
                                <label>کد کیف</label>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <input
                                        className="input"
                                        style={{ flex: 1, minWidth: 180 }}
                                        value={codeDraft}
                                        onChange={(e) => setCodeDraft(e.target.value)}
                                    />
                                    <button className="btn btn-secondary" onClick={saveCode}>
                                        ذخیره‌ی کد
                                    </button>
                                </div>
                            </div>

                            <div className="field" style={{ marginTop: 16 }}>
                                <label>افزودن عکس</label>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <input
                                        className="input"
                                        style={{ flex: 1, minWidth: 220 }}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) =>
                                            setFiles(Array.from(e.target.files || []))
                                        }
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleUpload}
                                        disabled={uploading}
                                    >
                                        {uploading ? "در حال آپلود..." : "آپلود عکس‌ها"}
                                    </button>
                                </div>
                            </div>

                            {message && (
                                <p className={`status-message ${success ? "status-success" : "status-error"}`}>
                                    {message}
                                </p>
                            )}
                        </div>

                        {images.length === 0 ? (
                            <div className="panel empty-state">
                                <p>هنوز عکسی برای این کیف ثبت نشده.</p>
                            </div>
                        ) : (
                            <div className="gallery">
                                {images.map((image) => (
                                    <div className="gallery-item" key={image.id}>
                                        {image.url ? (
                                            <a href={image.url} target="_blank" rel="noreferrer">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={image.url} alt={`کیف ${code}`} />
                                            </a>
                                        ) : (
                                            <div className="gallery-placeholder">عکس در دسترس نیست</div>
                                        )}
                                        <div className="gallery-item-footer">
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => setImageToDelete(image)}
                                            >
                                                حذف
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="actions" style={{ marginTop: 24 }}>
                            <button
                                className="btn btn-danger"
                                onClick={() => setConfirmDeleteBag(true)}
                            >
                                🗑️ حذف این کیف
                            </button>
                        </div>
                    </>
                )}
            </main>

            <ConfirmDialog
                open={!!imageToDelete}
                title="حذف عکس"
                message="این عکس برای همیشه حذف می‌شود."
                confirmLabel="حذف"
                danger
                onConfirm={deleteImage}
                onCancel={() => setImageToDelete(null)}
            />

            <ConfirmDialog
                open={confirmDeleteBag}
                title="حذف کیف"
                message={`کیف «${code}» همراه با همه‌ی عکس‌هایش حذف می‌شود.`}
                confirmLabel="حذف"
                danger
                onConfirm={deleteBag}
                onCancel={() => setConfirmDeleteBag(false)}
            />
        </>
    );
}
