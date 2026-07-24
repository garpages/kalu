"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();

        setError("");
        setLoading(true);

        // ورود به حساب Supabase
        const { data, error: loginError } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            });

        if (loginError || !data.user) {
            console.error("Login Error:", loginError);
            setError("ایمیل یا رمز عبور اشتباه است.");
            setLoading(false);
            return;
        }

        // دریافت اطلاعات کاربر از profiles
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", data.user.id)
            .single();

        if (profileError || !profile) {
            console.error("Profile Error:", profileError);

            await supabase.auth.signOut();

            setError("اطلاعات حساب کاربری پیدا نشد.");
            setLoading(false);
            return;
        }

        // بررسی فعال بودن حساب
        if (!profile.is_active) {
            await supabase.auth.signOut();

            setError("دسترسی این حساب غیرفعال شده است.");
            setLoading(false);
            return;
        }

        // انتقال بر اساس نقش
        if (profile.role === "admin") {
            router.push("/admin");
        } else {
            router.push("/dashboard");
        }

        router.refresh();
    }

    return (
        <div className="login-card">
            <div className="brand">KALU</div>

            <h1>مدیریت مدل‌های کفش</h1>

            <p className="muted">
                ورود به KALU
            </p>

            <form onSubmit={submit}>
                <input
                    className="input"
                    type="email"
                    placeholder="ایمیل"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    className="input"
                    type="password"
                    placeholder="رمز عبور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "در حال ورود..." : "ورود"}
                </button>
            </form>

            {error && (
                <p style={{ color: "#b42318" }}>
                    {error}
                </p>
            )}
        </div>
    );
}