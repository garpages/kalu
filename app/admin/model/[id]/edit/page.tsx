"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

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

const fieldList: [keyof ShoeModel, string, boolean][] = [
    ["code", "کد کار", true],
    ["last_code", "کد قالب", false],
    ["sole_code", "کد کف", false],
    ["heel_code", "کد پاشنه", false],
    ["outsole_code", "کد زیره", false],
    ["wedge_code", "کد لژ", false],
    ["toe_work", "نوک کار", false],
    ["toe_sole", "نوک زیره", false],
    ["material_type_1", "نوع جنس اول", false],
    ["material_type_2", "نوع جنس دوم", false],
    ["hardware", "یراق کار", false],
];

export default function EditModelPage() {
    const params = useParams();
    const router = useRouter();

    const [form, setForm] = useState<ShoeModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function loadModel() {
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

            const { data, error } = await supabase
                .from("shoe_models")
                .select("*")
                .eq("id", params.id)
                .single();

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            setForm(data);
            setLoading(false);
        }

        loadModel();
    }, [params.id, router]);

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        if (!form) return;

        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: value,
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form) return;

        setSaving(true);
        setMessage("");
        setSuccess(false);

        const { error } = await supabase
            .from("shoe_models")
            .update({
                code: form.code,
                last_code: form.last_code,
                sole_code: form.sole_code,
                heel_code: form.heel_code,
                outsole_code: form.outsole_code,
                wedge_code: form.wedge_code,
                toe_work: form.toe_work,
                toe_sole: form.toe_sole,
                material_type_1: form.material_type_1,
                material_type_2: form.material_type_2,
                hardware: form.hardware,
                description: form.description,
            })
            .eq("id", form.id);

        if (error) {
            console.error(error);
            setMessage("خطا در ذخیره تغییرات.");
            setSaving(false);
            return;
        }

        setSuccess(true);
        setMessage("تغییرات با موفقیت ذخیره شد.");

        setTimeout(() => {
            router.push(`/admin/model/${form.id}`);
        }, 900);
    }

    if (loading) {
        return (
            <>
                <Header />
                <main className="container page">
                    <p className="muted">در حال بارگذاری...</p>
                </main>
            </>
        );
    }

    if (!form) {
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

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel">
                    <h1>ویرایش مدل</h1>
                    <p className="muted">کد کار: {form.code}</p>

                    <hr />

                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            {fieldList.map(([name, label, required]) => (
                                <div className="field" key={name}>
                                    <label>
                                        {label}
                                        {required ? " *" : ""}
                                    </label>
                                    <input
                                        className="input"
                                        name={name}
                                        value={form[name] || ""}
                                        onChange={handleChange}
                                        required={required}
                                    />
                                </div>
                            ))}

                            <div className="field full">
                                <label>توضیحات</label>
                                <textarea
                                    className="textarea"
                                    name="description"
                                    value={form.description || ""}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="actions">
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </button>

                            <Link href={`/admin/model/${form.id}`}>
                                <button className="btn btn-secondary" type="button">
                                    انصراف
                                </button>
                            </Link>
                        </div>

                        {message && (
                            <p className={`status-message ${success ? "status-success" : "status-error"}`}>
                                {message}
                            </p>
                        )}
                    </form>
                </div>
            </main>
        </>
    );
}
