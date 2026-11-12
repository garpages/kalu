import { supabase } from "@/lib/supabase";
import { BUCKET, signPath } from "@/lib/signedUrls";
import { canvasToBestBlob } from "@/lib/compressImage";

const THUMB_WIDTH = 520;
const FAIL_KEY = "kalu_thumb_fail";

export const thumbPath = (path: string) => `thumbs/${path}.webp`;

function hasFailed(path: string) {
    try {
        return (sessionStorage.getItem(FAIL_KEY) || "").split("|").includes(path);
    } catch {
        return false;
    }
}

function markFailed(path: string) {
    try {
        const list = (sessionStorage.getItem(FAIL_KEY) || "").split("|").filter(Boolean);
        list.push(path);
        sessionStorage.setItem(FAIL_KEY, list.slice(-200).join("|"));
    } catch {
        /* ignore */
    }
}

// Small queue so background thumbnail work never competes with what the user is looking at.
let running = 0;
const queue: Array<() => void> = [];

function schedule<T>(job: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const start = () => {
            running++;
            job()
                .then(resolve, reject)
                .finally(() => {
                    running--;
                    queue.shift()?.();
                });
        };
        if (running < 2) start();
        else queue.push(start);
    });
}

// Builds a small WebP copy of an image that has none yet and stores it next to the original.
// Only called for admins (the only users allowed to upload).
export function createThumb(path: string, fullUrl: string): Promise<boolean> {
    if (hasFailed(path)) return Promise.resolve(false);

    return schedule(async () => {
        try {
            const res = await fetch(fullUrl);
            if (!res.ok) throw new Error("download failed");

            const bitmap = await createImageBitmap(await res.blob());
            const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no canvas");
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

            const encoded = await canvasToBestBlob(canvas, 0.72);
            if (!encoded) throw new Error("encode failed");

            const { error } = await supabase.storage
                .from(BUCKET)
                .upload(thumbPath(path), encoded.blob, {
                    contentType: encoded.type,
                    cacheControl: "31536000",
                    upsert: true,
                });
            if (error) throw error;

            return true;
        } catch {
            markFailed(path);
            return false;
        }
    });
}

// The best URL to show in a small card: the thumbnail when it exists,
// otherwise the original (and, for admins, a thumbnail is created for next time).
export async function getCardImage(path: string, canCreate: boolean): Promise<string | null> {
    const thumb = await signPath(thumbPath(path));
    if (thumb) return thumb;

    const full = await signPath(path);
    if (full && canCreate) void createThumb(path, full);

    return full;
}
