"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

const fieldList: [string, string, boolean][] = [
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
    ["golcheh", "گلچه", false],
    ["aster", "آستر", false],
];

export default function AddModelPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        code: "",
        last_code: "",
        sole_code: "",
        heel_code: "",
        outsole_code: "",
        wedge_code: "",
        toe_work: "",
        toe_sole: "",
        material_type_1: "",
        material_type_2: "",
        hardware: "",
        golcheh: "",
        aster: "",
        description: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setSuccess(false);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setMessage("شما وارد حساب کاربری نشده‌اید.");
            setLoading(false);
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
            setMessage("شما اجازه ثبت مدل جدید را ندارید.");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("shoe_models")
            .insert([
                {
                    code: form.code.trim(),
                    last_code: form.last_code.trim() || null,
                    sole_code: form.sole_code.trim() || null,
                    heel_code: form.heel_code.trim() || null,
                    outsole_code: form.outsole_code.trim() || null,
                    wedge_code: form.wedge_code.trim() || null,
                    toe_work: form.toe_work.trim() || null,
                    toe_sole: form.toe_sole.trim() || null,
                    material_type_1: form.material_type_1.trim() || null,
                    material_type_2: form.material_type_2.trim() || null,
                    hardware: form.hardware.trim() || null,
                    golcheh: form.golcheh.trim() || null,
                    aster: form.aster.trim() || null,
                    description: form.description.trim() || null,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Add Model Error:", error);
            setMessage(`خطا در ثبت مدل: ${error.message}`);
            setLoading(false);
            return;
        }

        console.log("Model Created Successfully:", data);

        setSuccess(true);
        setMessage("مدل با موفقیت ثبت شد.");
        setLoading(false);

        setTimeout(() => {
            router.push("/admin");
            router.refresh();
        }, 900);
    }

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel">
                    <h1>افزودن مدل جدید</h1>
                    <p className="muted">مشخصات فنی مدل کفش را ثبت کنید.</p>

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
                                        value={form[name as keyof typeof form]}
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
                                    value={form.description}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="actions">
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "در حال ذخیره..." : "ذخیره مدل"}
                            </button>

                            <Link href="/admin">
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
