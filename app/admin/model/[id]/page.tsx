"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ImageGallery from "@/components/ImageGallery";
import ConfirmDialog from "@/components/ConfirmDialog";
import { logActivity } from "@/lib/activityLog";

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
    golcheh: string | null;
    aster: string | null;
    description: string | null;
};

export default function ModelDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const [model, setModel] = useState<ShoeModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [galleryRefresh, setGalleryRefresh] = useState(0);

    useEffect(() => {
        async function loadModel() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, is_active")
                .eq("id", user.id)
                .single();

            if (
                profileError ||
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
                .eq("id", params.id)
                .single();

            if (error) {
                console.error("Load Model Error:", error);
                setLoading(false);
                return;
            }

            setModel(data);
            setLoading(false);
        }

        loadModel();
    }, [params.id, router]);

    async function handleDelete() {
        if (!model) return;

        setDeleting(true);

        const { error } = await supabase
            .from("shoe_models")
            .delete()
            .eq("id", model.id);

        if (error) {
            console.error("Delete Model Error:", error);
            alert("خطا در حذف مدل.");
            setDeleting(false);
            return;
        }

        await logActivity("حذف مدل", model.code);

        router.push("/admin");
        router.refresh();
    }

    if (loading) {
        return (
            <>
                <Header />
                <main className="container page">
                    <p className="muted">در حال بارگذاری اطلاعات مدل...</p>
                </main>
            </>
        );
    }

    if (!model) {
        return (
            <>
                <Header />
                <main className="container page">
                    <div className="panel">
                        <h1>مدل پیدا نشد</h1>
                        <div className="actions">
                            <Link href="/admin">
                                <button className="btn btn-secondary">
                                    بازگشت به پنل مدیریت
                                </button>
                            </Link>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    const rows: [string, string | null][] = [
        ["کد قالب", model.last_code],
        ["کد کف", model.sole_code],
        ["کد پاشنه", model.heel_code],
        ["کد زیره", model.outsole_code],
        ["کد لژ", model.wedge_code],
        ["نوک کار", model.toe_work],
        ["نوک زیره", model.toe_sole],
        ["نوع جنس اول", model.material_type_1],
        ["نوع جنس دوم", model.material_type_2],
        ["یراق کار", model.hardware],
        ["گلچه", model.golcheh],
        ["آستر", model.aster],
    ];

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel">
                    <div className="panel-head">
                        <div>
                            <h1>کد کار: {model.code}</h1>
                        </div>

                        <div className="actions" style={{ marginTop: 0 }}>
                            <Link href={`/admin/model/${model.id}/edit`}>
                                <button className="btn btn-secondary">
                                    ✏️ ویرایش مدل
                                </button>
                            </Link>

                            <button
                                className="btn btn-danger"
                                onClick={() => setConfirmOpen(true)}
                                disabled={deleting}
                            >
                                {deleting ? "در حال حذف..." : "🗑️ حذف مدل"}
                            </button>
                        </div>
                    </div>

                    <h2 style={{ marginTop: 18 }}>تصاویر مدل</h2>

                    <ImageUploader
                        modelId={model.id}
                        modelCode={model.code}
                        onUploaded={() =>
                            setGalleryRefresh((current) => current + 1)
                        }
                    />

                    <ImageGallery modelId={model.id} refreshKey={galleryRefresh} />

                    <hr />

                    <div className="detail-grid">
                        {rows.map(([label, value]) => (
                            <div className="detail" key={label}>
                                <strong>{label}</strong>
                                {value || "ثبت نشده"}
                            </div>
                        ))}
                    </div>

                    <div className="detail" style={{ marginTop: 12 }}>
                        <strong>توضیحات</strong>
                        {model.description || "توضیحی ثبت نشده است."}
                    </div>

                    <hr />

                    <Link href="/admin">
                        <button className="btn btn-secondary">
                            بازگشت به پنل مدیریت
                        </button>
                    </Link>
                </div>
            </main>

            <ConfirmDialog
                open={confirmOpen}
                title="حذف مدل"
                message={`آیا مطمئن هستید که می‌خواهید مدل با کد "${model.code}" را حذف کنید؟`}
                confirmLabel="حذف"
                danger
                onCancel={() => setConfirmOpen(false)}
                onConfirm={() => {
                    setConfirmOpen(false);
                    handleDelete();
                }}
            />
        </>
    );
}
