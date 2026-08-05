"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type SearchResult = { id: string; code: string };

export default function CopyFromPicker({
    onSelect,
}: {
    onSelect: (modelId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    async function handleSearch(value: string) {
        setQuery(value);

        if (value.trim().length === 0) {
            setResults([]);
            return;
        }

        setSearching(true);

        const { data } = await supabase
            .from("shoe_models")
            .select("id, code")
            .ilike("code", `%${value.trim()}%`)
            .limit(6);

        setResults(data || []);
        setSearching(false);
    }

    if (!open) {
        return (
            <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(true)}
            >
                📋 کپی از یک کد دیگر
            </button>
        );
    }

    return (
        <div className="panel" style={{ marginBottom: 18, padding: 16 }}>
            <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 8 }}>
                می‌خوای از کدوم کد کپی کنی؟
            </label>

            <input
                className="input"
                placeholder="کد کار را تایپ کن..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
            />

            {searching && <p className="muted" style={{ marginTop: 8 }}>در حال جستجو...</p>}

            {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {results.map((r) => (
                        <button
                            key={r.id}
                            type="button"
                            className="btn btn-secondary"
                            style={{ justifyContent: "flex-start" }}
                            onClick={() => {
                                onSelect(r.id);
                                setOpen(false);
                                setQuery("");
                                setResults([]);
                            }}
                        >
                            کد کار: {r.code}
                        </button>
                    ))}
                </div>
            )}

            <div className="actions" style={{ marginTop: 12 }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                        setOpen(false);
                        setQuery("");
                        setResults([]);
                    }}
                >
                    انصراف
                </button>
            </div>
        </div>
    );
}
