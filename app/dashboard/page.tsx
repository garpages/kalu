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
    material_type_2: string | null;
    description: string | null;
};

export default function DashboardPage() {
    const router = useRouter();

    const [models, setModels] = useState<ShoeModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function load() {
            // بررسی ورود کاربر
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            // بررسی فعال بودن حساب (نقش برای این صفحه مهم نیست،
            // چون هم مدیر و هم کاربر عادی اجازه دیدن لیست را دارند)
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
                .select("id, code, material_type_1, material_type_2, description")
                .order("code", { ascending: true });

            if (error) {
                console.error("Load Models Error:", error);
                setLoading(false);
                return;
            }

            setModels(data || []);
            setLoading(false);
        }

        load();
    }, [router]);

    const filteredModels = models.filter((model) =>
        model.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Header />

            <main className="container page">
                <div className="toolbar">
                    <input
                        className="input search"
                        type="text"
                        placeholder="جستجو بر اساس کد کار..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری مدل‌ها...</p>
                ) : filteredModels.length === 0 ? (
                    <div className="panel">
                        <p className="muted">مدلی پیدا نشد.</p>
                    </div>
                ) : (
                    <div className="grid">
                        {filteredModels.map((model) => (
                            <article className="card" key={model.id}>
                                <div className="card-body">
                                    <div className="code">
                                        کد کار: {model.code}
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
                )}
            </main>
        </>
    );
}
