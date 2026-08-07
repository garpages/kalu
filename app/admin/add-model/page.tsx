"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import CopyFromPicker from "@/components/CopyFromPicker";
import { logActivity } from "@/lib/activityLog";

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

const emptyForm = {
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
};

function AddModelForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const copyFrom = searchParams.get("copyFrom");

    const [form, setForm] = useState(emptyForm);
    const [copyNotice, setCopyNotice] = useState(false);
    const [draftFound, setDraftFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    async function applyCopyFrom(sourceId: string) {
        const { data, error } = await supabase
            .from("shoe_models")
            .select("*")
            .eq("id", sourceId)
            .single();

        if (error || !data) return;

        setForm({
            code: "",
            last_code: data.last_code || "",
            sole_code: data.sole_code || "",
            heel_code: data.heel_code || "",
            outsole_code: data.outsole_code || "",
            wedge_code: data.wedge_code || "",
            toe_work: data.toe_work || "",
            toe_sole: data.toe_sole || "",
            material_type_1: data.material_type_1 || "",
            material_type_2: data.material_type_2 || "",
            hardware: data.hardware || "",
            golcheh: data.golcheh || "",
            aster: data.aster || "",
            description: data.description || "",
        });

        setCopyNotice(true);
    }

    useEffect(() => {
        if (copyFrom) applyCopyFrom(copyFrom);
        else {
            const saved = localStorage.getItem("kalu_draft_add_model");
            if (saved) setDraftFound(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [copyFrom]);

    useEffect(() => {
        const hasContent = Object.values(form).some((v) => v.trim() !== "");
        if (hasContent) {
            localStorage.setItem("kalu_draft_add_model", JSON.stringify(form));
        }
    }, [form]);

    function restoreDraft() {
        const saved = localStorage.getItem("kalu_draft_add_model");
        if (saved) {
            try {
                setForm(JSON.parse(saved));
            } catch {
                // ignore
            }
        }
        setDraftFound(false);
    }

    function discardDraft() {
        localStorage.removeItem("kalu_draft_add_model");
        setDraftFound(false);
    }

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

        logActivity("ثبت مدل جدید", form.code);
        localStorage.removeItem("kalu_draft_add_model");

        setSuccess(true);
        setMessage("مدل با موفقیت ثبت شد.");
        setLoading(false);

        setTimeout(() => {
            router.push("/admin");
            router.refresh();
        }, 900);
    }

    return (
        <main className="container page">
            <div className="panel">
                <h1>افزودن مدل جدید</h1>
                <p className="muted">مشخصات فنی مدل کفش را ثبت کنید.</p>

                {draftFound && (
                    <div className="status-message status-success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span>یک پیش‌نویس ذخیره‌شده پیدا شد. بازیابی بشه؟</span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="btn btn-primary" onClick={restoreDraft}>بازیابی</button>
                            <button type="button" className="btn btn-secondary" onClick={discardDraft}>نه، دور بریز</button>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 12 }}>
                    <CopyFromPicker onSelect={applyCopyFrom} />
                </div>

                {copyNotice && (
                    <p className="status-message status-success">
                        اطلاعات از یک مدل مشابه کپی شد — فقط کد کار جدید را وارد کنید.
                    </p>
                )}

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
    );
}

export default function AddModelPage() {
    return (
        <>
            <Header />
            <Suspense fallback={<main className="container page"><p className="muted">در حال بارگذاری...</p></main>}>
                <AddModelForm />
            </Suspense>
        </>
    );
}
