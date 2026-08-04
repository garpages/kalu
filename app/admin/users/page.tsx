"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

type Profile = {
    id: string;
    email: string | null;
    role: string;
    is_active: boolean;
};

export default function UsersPage() {
    const router = useRouter();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("user");
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    async function loadProfiles() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.replace("/login");
            return;
        }

        const { data: myProfile } = await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", user.id)
            .single();

        if (!myProfile || myProfile.role !== "admin" || !myProfile.is_active) {
            router.replace("/dashboard");
            return;
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("email", { ascending: true });

        if (error) {
            console.error("Load Profiles Error:", error);
            setLoading(false);
            return;
        }

        setProfiles(data || []);
        setLoading(false);
    }

    useEffect(() => {
        loadProfiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();

        setCreating(true);
        setMessage("");
        setSuccess(false);

        // ذخیره‌ی نشست فعلی مدیر، چون signUp ممکن است آن را جایگزین کند
        const {
            data: { session: adminSession },
        } = await supabase.auth.getSession();

        const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
                email: newEmail.trim(),
                password: newPassword,
            });

        if (signUpError || !signUpData.user) {
            console.error("Create User Error:", signUpError);
            setMessage(`خطا در ساخت کاربر: ${signUpError?.message || ""}`);
            setSuccess(false);
            setCreating(false);
            return;
        }

        // بازگرداندن نشست مدیر (چون signUp ممکن است کاربر جدید را جایگزین کرده باشد)
        if (adminSession) {
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }

        const { error: profileError } = await supabase.from("profiles").insert({
            id: signUpData.user.id,
            email: newEmail.trim(),
            role: newRole,
            is_active: true,
        });

        if (profileError) {
            console.error("Create Profile Error:", profileError);
            setMessage(`کاربر ساخته شد ولی پروفایلش ثبت نشد: ${profileError.message}`);
            setSuccess(false);
            setCreating(false);
            return;
        }

        setMessage("کاربر جدید با موفقیت ساخته شد.");
        setSuccess(true);
        setNewEmail("");
        setNewPassword("");
        setNewRole("user");
        setCreating(false);
        loadProfiles();
    }

    async function toggleActive(profile: Profile) {
        setSavingId(profile.id);

        const { error } = await supabase
            .from("profiles")
            .update({ is_active: !profile.is_active })
            .eq("id", profile.id);

        if (error) {
            console.error("Toggle Active Error:", error);
            alert("خطا در تغییر وضعیت کاربر.");
            setSavingId(null);
            return;
        }

        setProfiles((current) =>
            current.map((p) =>
                p.id === profile.id ? { ...p, is_active: !p.is_active } : p
            )
        );
        setSavingId(null);
    }

    async function toggleRole(profile: Profile) {
        const newRoleValue = profile.role === "admin" ? "user" : "admin";

        const confirmed = window.confirm(
            `آیا مطمئنی نقش این کاربر به «${
                newRoleValue === "admin" ? "مدیر" : "کاربر عادی"
            }» تغییر کند؟`
        );

        if (!confirmed) return;

        setSavingId(profile.id);

        const { error } = await supabase
            .from("profiles")
            .update({ role: newRoleValue })
            .eq("id", profile.id);

        if (error) {
            console.error("Toggle Role Error:", error);
            alert("خطا در تغییر نقش کاربر.");
            setSavingId(null);
            return;
        }

        setProfiles((current) =>
            current.map((p) =>
                p.id === profile.id ? { ...p, role: newRoleValue } : p
            )
        );
        setSavingId(null);
    }

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدیریت کاربران</h1>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">
                            بازگشت به پنل مدیریت
                        </button>
                    </Link>
                </div>

                <div className="panel" style={{ marginBottom: 20 }}>
                    <h2>افزودن کاربر جدید</h2>

                    <form onSubmit={handleCreateUser}>
                        <div className="form-grid">
                            <div className="field">
                                <label>ایمیل *</label>
                                <input
                                    className="input"
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>رمز عبور *</label>
                                <input
                                    className="input"
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>نقش</label>
                                <select
                                    className="select"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                >
                                    <option value="user">کاربر عادی (فقط مشاهده)</option>
                                    <option value="admin">مدیر (دسترسی کامل)</option>
                                </select>
                            </div>
                        </div>

                        <div className="actions">
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={creating}
                            >
                                {creating ? "در حال ساخت..." : "➕ ساخت کاربر"}
                            </button>
                        </div>

                        {message && (
                            <p className={`status-message ${success ? "status-success" : "status-error"}`}>
                                {message}
                            </p>
                        )}
                    </form>
                </div>

                <div className="panel">
                    <h2>کاربران فعلی</h2>

                    {loading ? (
                        <p className="muted">در حال بارگذاری...</p>
                    ) : profiles.length === 0 ? (
                        <p className="muted">کاربری پیدا نشد.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                            {profiles.map((profile) => (
                                <div
                                    key={profile.id}
                                    className="detail"
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 10,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700 }}>
                                            {profile.email || "بدون ایمیل ثبت‌شده"}
                                        </div>
                                        <span
                                            className={`badge ${
                                                profile.role === "admin"
                                                    ? "badge-admin"
                                                    : "badge-user"
                                            }`}
                                        >
                                            {profile.role === "admin" ? "مدیر" : "کاربر عادی"}
                                        </span>{" "}
                                        <span className="muted">
                                            {profile.is_active ? "فعال" : "غیرفعال"}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => toggleRole(profile)}
                                            disabled={savingId === profile.id}
                                        >
                                            تغییر به {profile.role === "admin" ? "کاربر عادی" : "مدیر"}
                                        </button>

                                        <button
                                            className={profile.is_active ? "btn btn-danger" : "btn btn-secondary"}
                                            onClick={() => toggleActive(profile)}
                                            disabled={savingId === profile.id}
                                        >
                                            {profile.is_active ? "غیرفعال کردن" : "فعال کردن"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
