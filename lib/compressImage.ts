let webpEncodeSupported: boolean | null = null

// Not every browser can ENCODE WebP from a canvas (older Safari silently falls
// back to PNG), so we test once and fall back to JPEG when needed.
async function canEncodeWebp(): Promise<boolean> {
    if (webpEncodeSupported !== null) return webpEncodeSupported

    const probe = document.createElement("canvas")
    probe.width = probe.height = 1

    const blob: Blob | null = await new Promise((resolve) =>
        probe.toBlob(resolve, "image/webp", 0.8)
    )

    webpEncodeSupported = !!blob && blob.type === "image/webp"
    return webpEncodeSupported
}

export async function compressImage(
    file: File,
    maxWidth = 1600,
    quality = 0.8
): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
        return file;
    }

    const imageBitmap = await createImageBitmap(file);

    const scale = Math.min(1, maxWidth / imageBitmap.width);
    const width = Math.round(imageBitmap.width * scale);
    const height = Math.round(imageBitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const useWebp = await canEncodeWebp();
    const type = useWebp ? "image/webp" : "image/jpeg";
    const ext = useWebp ? ".webp" : ".jpg";

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, type, quality)
    );

    if (!blob) return file;

    // Never make a small, already-optimised photo bigger.
    if (scale === 1 && blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ext;

    return new File([blob], newName, { type });
}
