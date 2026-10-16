"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAdminGuard } from "@/lib/useAdminGuard";

type Worker = { id: string; name: string };
type Assignment = { id: string; worker_id: string; model_id: string };
type ModelLite = { id: string; code: string };

export default function WorkersPage() {
    const router = useRouter();
    const ready = useAdminGuard();

    const [workers, setWorkers] = useState<Worker[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [models, setModels] = useState<ModelLite[]>([]);
    const [loading, setLoading] = useState(true);

    const [newName, setNewName] = useState("");
    const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
    const [messages, setMessages] = useState<Record<string, string>>({});
    const [globalMessage, setGlobalMessage] = useState("");
    const [toDelete, setToDelete] = useState<Worker | null>(null);
    const [search, setSearch] = useState("");

    async function load() {
        const [w, a, m] = await Promise.all([
            supabase.from("workers").select("id, name").order("name", { ascending: true }),
            supabase.from("worker_models").select("id, worker_id, model_id"),
            supabase.from("shoe_models").select("id, code"),
        ]);

        if (w.error) console.error(w.error);
        if (a.error) console.error(a.error);

        setWorkers(w.data || []);
        setAssignments(a.data || []);
        setModels(m.data || []);
        setLoading(false);
    }

    useEffect(() => {
        if (ready) load();
    }, [ready]);

    const codeById = new Map(models.map((m) => [m.id, m.code]));
    const modelByCode = new Map(models.map((m) => [m.code.trim().toLowerCase(), m]));

    async function addWorker(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;

        const { data, error } = await supabase
            .from("workers")
            .insert({ name })
            .select("id, name")
            .single();

        if (error || !data) {
            console.error(error);
            setGlobalMessage("خطا در افزودن نفر: " + (error?.message || ""));
            return;
        }

        setGlobalMessage("");
        setNewName("");
        setWorkers((cur) =>
            [...cur, data].sort((x, y) => x.name.localeCompare(y.name, "fa"))
        );
    }

    async function addCode(worker: Worker) {
        const raw = (codeInputs[worker.id] || "").trim();
        if (!raw) return;

        const setMsg = (text: string) =>
            setMessages((cur) => ({ ...cur, [worker.id]: text }));

        const model = modelByCode.get(raw.toLowerCase());
        if (!model) {
            setMsg(`مدلی با کد «${raw}» پیدا نشد.`);
            return;
        }

        const existing = assignments.find((a) => a.model_id === model.id);
        if (existing) {
            const owner = workers.find((w) => w.id === existing.worker_id);
            setMsg(
                existing.worker_id === worker.id
                    ? "این کد قبلاً برای همین نفر ثبت شده."
                    : `این کد قبلاً به «${owner?.name || "نفر دیگری"}» داده شده.`
            );
            return;
        }

        const { data, error } = await supabase
            .from("worker_models")
            .insert({ worker_id: worker.id, model_id: model.id })
            .select("id, worker_id, model_id")
            .single();

        if (error || !data) {
            console.error(error);
            setMsg("خطا در ثبت کد: " + (error?.message || ""));
            return;
        }

        setMsg("");
        setCodeInputs((cur) => ({ ...cur, [worker.id]: "" }));
        setAssignments((cur) => [...cur, data]);
    }

    async function removeAssignment(a: Assignment) {
        const { error } = await supabase
            .from("worker_models")
            .delete()
            .eq("id", a.id);

        if (error) {
            console.error(error);
            alert("خطا در حذف کد.");
            return;
        }

        setAssignments((cur) => cur.filter((x) => x.id !== a.id));
    }

    async function deleteWorker() {
        if (!toDelete) return;
        const target = toDelete;
        setToDelete(null);

        const { error } = await supabase.from("workers").delete().eq("id", target.id);

        if (error) {
            console.error(error);
            alert("خطا در حذف نفر.");
            return;
        }

        setWorkers((cur) => cur.filter((w) => w.id !== target.id));
        setAssignments((cur) => cur.filter((a) => a.worker_id !== target.id));
    }

    const q = search.trim().toLowerCase();
    const visibleWorkers = workers.filter((w) => {
        if (!q) return true;
        if (w.name.toLowerCase().includes(q)) return true;
        return assignments.some(
            (a) =>
                a.worker_id === w.id &&
                (codeById.get(a.model_id) || "").toLowerCase().includes(q)
        );
    });

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>لیست کار جمع کنی</h1>
                        <p className="muted">
                            تعداد افراد: {workers.length} — کدهای اختصاص‌یافته: {assignments.length}
                        </p>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                <div className="panel" style={{ marginBottom: 20 }}>
                    <h2>افزودن نفر جدید</h2>
                    <form
                        onSubmit={addWorker}
                        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}
                    >
                        <input
                            className="input"
                            style={{ flex: 1, minWidth: 200 }}
                            placeholder="نام (مثلاً افشین)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
                        <button className="btn btn-primary" type="submit">
                            ➕ افزودن
                        </button>
                    </form>
                    {globalMessage && (
                        <p className="status-message status-error">{globalMessage}</p>
                    )}
                </div>

                <div className="toolbar">
                    <input
                        className="input search"
                        type="text"
                        placeholder="جستجو بر اساس نام یا کد..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <p className="muted">در حال بارگذاری...</p>
                ) : visibleWorkers.length === 0 ? (
                    <div className="panel empty-state">
                        <p>موردی پیدا نشد.</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {visibleWorkers.map((worker) => {
                            const mine = assignments.filter((a) => a.worker_id === worker.id);

                            return (
                                <div className="panel" key={worker.id}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 10,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <div>
                                            <h2 style={{ marginBottom: 0 }}>{worker.name}</h2>
                                            <span className="muted">{mine.length} کد</span>
                                        </div>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => setToDelete(worker)}
                                        >
                                            حذف نفر
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            margin: "14px 0",
                                        }}
                                    >
                                        {mine.length === 0 && (
                                            <span className="muted">هنوز کدی اختصاص داده نشده.</span>
                                        )}

                                        {mine.map((a) => (
                                            <span
                                                key={a.id}
                                                className="badge badge-admin"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    fontSize: 14,
                                                    padding: "6px 12px",
                                                }}
                                            >
                                                <span
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() =>
                                                        router.push(`/admin/model/${a.model_id}`)
                                                    }
                                                >
                                                    {codeById.get(a.model_id) || "؟"}
                                                </span>
                                                <span
                                                    style={{ cursor: "pointer", opacity: 0.7 }}
                                                    onClick={() => removeAssignment(a)}
                                                    title="حذف این کد"
                                                >
                                                    ✕
                                                </span>
                                            </span>
                                        ))}
                                    </div>

                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        <input
                                            className="input"
                                            style={{ flex: 1, minWidth: 160 }}
                                            placeholder="کد مدل (مثلاً 1200)"
                                            value={codeInputs[worker.id] || ""}
                                            onChange={(e) =>
                                                setCodeInputs((cur) => ({
                                                    ...cur,
                                                    [worker.id]: e.target.value,
                                                }))
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") addCode(worker);
                                            }}
                                        />
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => addCode(worker)}
                                        >
                                            افزودن کد
                                        </button>
                                    </div>

                                    {messages[worker.id] && (
                                        <p className="status-message status-error">
                                            {messages[worker.id]}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <ConfirmDialog
                open={!!toDelete}
                title="حذف نفر"
                message={`«${toDelete?.name || ""}» و همه‌ی کدهای اختصاص‌یافته به او از این لیست حذف می‌شود. خود مدل‌ها حذف نمی‌شوند.`}
                confirmLabel="حذف"
                danger
                onConfirm={deleteWorker}
                onCancel={() => setToDelete(null)}
            />
        </>
    );
}
