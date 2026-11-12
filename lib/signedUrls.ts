import { supabase } from "@/lib/supabase";

export const BUCKET = "shoe-images";

const TTL_SECONDS = 3600;
const KEEP_MS = 50 * 60 * 1000; // reuse a signed URL for 50 min (it is valid for 60)
const PREFIX = "kalu_su:";

type Entry = { u: string; e: number; b: string };

// Where signed URLs currently point (our own /sb proxy or Supabase directly).
// A cached URL is only reused if it was signed for the same base.
function storageBase(): string {
    return supabase.storage
        .from(BUCKET)
        .getPublicUrl("x")
        .data.publicUrl.replace(/\/object\/public.*$/, "");
}

function readCache(path: string): string | null {
    try {
        const raw = localStorage.getItem(PREFIX + path);
        if (!raw) return null;
        const entry: Entry = JSON.parse(raw);
        if (Date.now() > entry.e || entry.b !== storageBase()) {
            localStorage.removeItem(PREFIX + path);
            return null;
        }
        return entry.u;
    } catch {
        return null;
    }
}

function writeCache(path: string, url: string) {
    try {
        localStorage.setItem(
            PREFIX + path,
            JSON.stringify({ u: url, e: Date.now() + KEEP_MS, b: storageBase() } satisfies Entry)
        );
    } catch {
        /* storage full or unavailable: skip caching */
    }
}

export function clearSignedUrlCache() {
    try {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(PREFIX))
            .forEach((k) => localStorage.removeItem(k));
    } catch {
        /* ignore */
    }
}

// Many components ask for one URL each; collect them for a moment and sign in ONE request.
// The same path keeps the same URL for ~50 min, so the browser can reuse the downloaded image.
const waiting = new Map<string, Array<(url: string | null) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
    timer = null;
    const batch = new Map(waiting);
    waiting.clear();

    const paths = Array.from(batch.keys());
    if (paths.length === 0) return;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, TTL_SECONDS);

    paths.forEach((path, i) => {
        const url = !error ? data?.[i]?.signedUrl ?? null : null;
        if (url) writeCache(path, url);
        batch.get(path)!.forEach((resolve) => resolve(url));
    });
}

// Resolves to null when the object does not exist (or signing failed).
export function signPath(path: string): Promise<string | null> {
    const cached = readCache(path);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
        const list = waiting.get(path) || [];
        list.push(resolve);
        waiting.set(path, list);
        if (!timer) timer = setTimeout(flush, 25);
    });
}
