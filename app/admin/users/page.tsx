"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import ConfirmDialog from "@/components/ConfirmDialog";

type Profile = {
    id: string;
    email: string | null;
    role: string;
    is_active: boolean;
};

type Filter = "all" | "admin" | "user" | "active" | "inactive";
type Sort = "email" | "admins" | "inactive";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "همه" },
    { key: "admin", label: "مدیرها" },
    { key: "user", label: "کاربران عادی" },
    { key: "active", label: "فعال" },
    { key: "inactive", label: "غیرفعال" },
];

export default function UsersPage() {
    const router = useRouter();

    const [meId, setMeId] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [sort, setSort] = useState<Sort>("email");

    const [createOpen, setCreateOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [newRole, setNewRole] = useState("user");
    const [creating, setCreating] = useState(false);

    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const [roleTarget, setRoleTarget] = useState<Profile | null>(null);

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

        setMeId(user.id);

        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("email", { ascending: true });

        if (error) {
            console.error("Load Profiles Error:", error);
            setMessage("خطا در بارگذاری کاربران.");
            setSuccess(false);
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

    const activeAdmins = profiles.filter((p) => p.role === "admin" && p.is_active);

    function protectionReason(profile: Profile): string | null {
        if (profile.id === meId) return "نمی‌توانید حساب خودتان را تغییر دهید.";
        if (
            profile.role === "admin" &&
            profile.is_active &&
            activeAdmins.length <= 1
        ) {
            return "حداقل یک مدیر فعال باید باقی بماند.";
        }
        return null;
    }

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();

        const email = newEmail.trim();

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setMessage("ایمیل واردشده معتبر نیست.");
            setSuccess(false);
            return;
        }

        if (newPassword.length < 6) {
            setMessage("رمز عبور باید حداقل ۶ کاراکتر باشد.");
            setSuccess(false);
            return;
        }

        setCreating(true);
        setMessage("");
        setSuccess(false);

        // ذخیره‌ی نشست فعلی مدیر، چون signUp ممکن است آن را جایگزین کند
        const {
            data: { session: adminSession },
        } = await supabase.auth.getSession();

        const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({ email, password: newPassword });

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
            email,
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
        setShowPassword(false);
        setCreating(false);
        loadProfiles();
    }

    async function toggleActive(profile: Profile) {
        setSavingId(profile.id);
        setMessage("");

        const { error } = await supabase
            .from("profiles")
            .update({ is_active: !profile.is_active })
            .eq("id", profile.id);

        if (error) {
            console.error(error);
            setMessage("خطا در تغییر وضعیت کاربر.");
            setSuccess(false);
        } else {
            setProfiles((cur) =>
                cur.map((p) =>
                    p.id === profile.id ? { ...p, is_active: !p.is_active } : p
                )
            );
        }

        setSavingId(null);
    }

    async function changeRole() {
        if (!roleTarget) return;

        const profile = roleTarget;
        const nextRole = profile.role === "admin" ? "user" : "admin";

        setRoleTarget(null);
        setSavingId(profile.id);
        setMessage("");

        const { error } = await supabase
            .from("profiles")
            .update({ role: nextRole })
            .eq("id", profile.id);

        if (error) {
            console.error(error);
            setMessage("خطا در تغییر نقش کاربر.");
            setSuccess(false);
        } else {
            setProfiles((cur) =>
                cur.map((p) => (p.id === profile.id ? { ...p, role: nextRole } : p))
            );
        }

        setSavingId(null);
    }

    const counts = useMemo(
        () => ({
            all: profiles.length,
            admin: profiles.filter((p) => p.role === "admin").length,
            user: profiles.filter((p) => p.role !== "admin").length,
            active: profiles.filter((p) => p.is_active).length,
            inactive: profiles.filter((p) => !p.is_active).length,
        }),
        [profiles]
    );

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();

        const list = profiles.filter((p) => {
            if (q && !(p.email || "").toLowerCase().includes(q)) return false;
            if (filter === "admin") return p.role === "admin";
            if (filter === "user") return p.role !== "admin";
            if (filter === "active") return p.is_active;
            if (filter === "inactive") return !p.is_active;
            return true;
        });

        return [...list].sort((a, b) => {
            if (sort === "admins" && a.role !== b.role) return a.role === "admin" ? -1 : 1;
            if (sort === "inactive" && a.is_active !== b.is_active) return a.is_active ? 1 : -1;
            return (a.email || "").localeCompare(b.email || "");
        });
    }, [profiles, search, filter, sort]);

    const roleTargetNext = roleTarget?.role === "admin" ? "کاربر عادی" : "مدیر";

    return (
        <>
            <Header />

            <main className="container page">
                <div className="panel-head">
                    <div>
                        <span className="badge badge-admin">پنل مدیریت</span>
                        <h1 style={{ marginTop: 10 }}>مدیریت کاربران</h1>
                        <p className="muted">
                            {counts.all} کاربر، {counts.active} فعال
                        </p>
                    </div>

                    <Link href="/admin">
                        <button className="btn btn-secondary">بازگشت به پنل مدیریت</button>
                    </Link>
                </div>

                {message && (
                    <p
                        className={`status-message ${success ? "status-success" : "status-error"}`}
                        role="status"
                    >
                        {message}
                    </p>
                )}

                <div className="panel" style={{ marginBottom: 20 }}>
                    <button
                        type="button"
                        className="u-toggle"
                        onClick={() => setCreateOpen((v) => !v)}
                        aria-expanded={createOpen}
                        aria-controls="create-user-form"
                    >
                        <span>
                            <Icon name="plus" size={18} /> افزودن کاربر جدید
                        </span>
                        <span className="muted">{createOpen ? "بستن" : "باز کردن"}</span>
                    </button>

                    {createOpen && (
                        <form
                            id="create-user-form"
                            onSubmit={handleCreateUser}
                            style={{ marginTop: 16 }}
                        >
                            <div className="form-grid">
                                <div className="field">
                                    <label htmlFor="new-email">ایمیل</label>
                                    <input
                                        id="new-email"
                                        className="input"
                                        type="email"
                                        dir="ltr"
                                        autoComplete="off"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="new-password">رمز عبور (حداقل ۶ کاراکتر)</label>
                                    <div className="u-password">
                                        <input
                                            id="new-password"
                                            className="input"
                                            type={showPassword ? "text" : "password"}
                                            dir="ltr"
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="u-eye"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                                        >
                                            <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="field">
                                    <label htmlFor="new-role">نقش</label>
                                    <select
                                        id="new-role"
                                        className="select"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                    >
                                        <option value="user">کاربر عادی</option>
                                        <option value="admin">مدیر</option>
                                    </select>
                                </div>
                            </div>

                            <div className="actions">
                                <button className="btn btn-primary" type="submit" disabled={creating}>
                                    {creating ? "در حال ساخت..." : "ساخت کاربر"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
                    <div className="u-search">
                        <Icon name="search" size={18} />
                        <input
                            className="input search"
                            type="text"
                            dir="auto"
                            placeholder="جستجوی ایمیل..."
                            aria-label="جستجوی ایمیل کاربر"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="select"
                        style={{ maxWidth: 190 }}
                        aria-label="مرتب‌سازی"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as Sort)}
                    >
                        <option value="email">مرتب‌سازی: ایمیل</option>
                        <option value="admins">مدیرها اول</option>
                        <option value="inactive">غیرفعال‌ها اول</option>
                    </select>
                </div>

                <div className="u-chips" role="group" aria-label="فیلتر کاربران">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            className="u-chip"
                            aria-pressed={filter === f.key}
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label} <span className="u-chip-count">{counts[f.key]}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="u-list" aria-busy="true">
                        {[0, 1, 2, 3].map((i) => (
                            <div className="u-row skeleton-row" key={i} />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="panel empty-state">
                        <p>کاربری پیدا نشد.</p>
                    </div>
                ) : (
                    <div className="u-list">
                        {visible.map((profile) => {
                            const reason = protectionReason(profile);
                            const isMe = profile.id === meId;
                            const busy = savingId === profile.id;

                            return (
                                <div className="u-row" key={profile.id}>
                                    <div className="u-main">
                                        <div className="u-email" dir="ltr">
                                            {profile.email || "بدون ایمیل"}
                                        </div>

                                        <div className="u-badges">
                                            <span
                                                className={`badge ${profile.role === "admin" ? "badge-admin" : "badge-user"}`}
                                            >
                                                {profile.role === "admin" ? "مدیر" : "کاربر عادی"}
                                            </span>
                                            <span
                                                className={`badge ${profile.is_active ? "badge-on" : "badge-off"}`}
                                            >
                                                {profile.is_active ? "فعال" : "غیرفعال"}
                                            </span>
                                            {isMe && <span className="badge badge-user">شما</span>}
                                        </div>
                                    </div>

                                    <div className="u-actions">
                                        <button
                                            className="btn btn-secondary"
                                            disabled={busy || !!reason}
                                            title={reason || undefined}
                                            onClick={() => setRoleTarget(profile)}
                                        >
                                            {profile.role === "admin"
                                                ? "تبدیل به کاربر عادی"
                                                : "تبدیل به مدیر"}
                                        </button>

                                        <button
                                            className={`btn ${profile.is_active ? "btn-danger" : "btn-primary"}`}
                                            disabled={busy || !!reason}
                                            title={reason || undefined}
                                            onClick={() => toggleActive(profile)}
                                        >
                                            {profile.is_active ? "غیرفعال کردن" : "فعال کردن"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <ConfirmDialog
                open={!!roleTarget}
                title="تغییر نقش"
                message={`نقش «${roleTarget?.email || ""}» به «${roleTargetNext}» تغییر کند؟`}
                confirmLabel="تغییر نقش"
                onConfirm={changeRole}
                onCancel={() => setRoleTarget(null)}
            />
        </>
    );
}
