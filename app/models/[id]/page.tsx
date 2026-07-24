"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ImageGallery from "@/components/ImageGallery";

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

export default function ModelViewPage() {
    const params = useParams();
    const router = useRouter();

    const [model, setModel] = useState<ShoeModel | null>(null);
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

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("is_active")
                .eq("id", user.id)
                .single();

            if (profileError || !profile || !profile.is_active) {
                await supabase.auth.signOut();
                router.replace("/login");
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

        load();
    }, [params.id, router]);

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
                        <p>مدل پیدا نشد.</p>

                        <div className="actions">
                            <Link className="btn btn-secondary" href="/dashboard">
                                بازگشت به داشبورد
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
    ];

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel">
                    <h1>کد کار: {model.code}</h1>

                    <div className="detail-grid" style={{ marginTop: 18 }}>
                        {rows.map(([label, value]) => (
                            <div className="detail" key={label}>
                                <strong>{label}</strong>
                                {value || "ثبت نشده"}
                            </div>
                        ))}
                    </div>

                    {model.description && (
                        <div className="detail" style={{ marginTop: 12 }}>
                            <strong>توضیحات</strong>
                            <div style={{ whiteSpace: "pre-wrap" }}>
                                {model.description}
                            </div>
                        </div>
                    )}

                    <hr style={{ margin: "22px 0" }} />

                    <ImageGallery modelId={model.id} readOnly />

                    <div className="actions">
                        <Link className="btn btn-secondary" href="/dashboard">
                            بازگشت به داشبورد
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
}
