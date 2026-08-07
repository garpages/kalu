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

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";

    return new File([blob], newName, { type: "image/jpeg" });
}
