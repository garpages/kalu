"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ModelImage = {
    id: string;
    model_id: string;
    storage_path: string;
    created_at: string;
};

type ResolvedImage = ModelImage & { url: string | null };

type ImageGalleryProps = {
    modelId: string;
    refreshKey?: number;
    readOnly?: boolean;
};

export default function ImageGallery({
    modelId,
    refreshKey,
    readOnly = false,
}: ImageGalleryProps) {
    const [images, setImages] = useState<ResolvedImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    async function loadImages() {
        setLoading(true);

        const { data, error } = await supabase
            .from("model_images")
            .select("*")
            .eq("model_id", modelId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Load Images Error:", error);
            setLoading(false);
            return;
        }

        const rows = data || [];

        if (rows.length === 0) {
            setImages([]);
            setLoading(false);
            return;
        }

        const { data: signedUrls } = await supabase.storage
            .from("shoe-images")
            .createSignedUrls(
                rows.map((row) => row.storage_path),
                3600
            );

        const resolved: ResolvedImage[] = rows.map((row, index) => ({
            ...row,
            url: signedUrls?.[index]?.signedUrl || null,
        }));

        setImages(resolved);
        setLoading(false);
    }

    useEffect(() => {
        loadImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelId, refreshKey]);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (lightboxIndex === null) return;

            if (e.key === "Escape") setLightboxIndex(null);
            if (e.key === "ArrowRight") stepLightbox(1);
            if (e.key === "ArrowLeft") stepLightbox(-1);
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightboxIndex, images.length]);

    function stepLightbox(direction: number) {
        setLightboxIndex((current) => {
            if (current === null) return current;
            const next = (current + direction + images.length) % images.length;
            return next;
        });
    }

    async function handleDelete(image: ModelImage) {
        const confirmed = window.confirm(
            "آیا مطمئن هستید که می‌خواهید این عکس را حذف کنید؟"
        );

        if (!confirmed) return;

        setDeleting(image.id);

        const { error: storageError } = await supabase.storage
            .from("shoe-images")
            .remove([image.storage_path]);

        if (storageError) {
            console.error("Storage Delete Error:", storageError);
            alert("خطا در حذف فایل عکس.");
            setDeleting(null);
            return;
        }

        const { error: dbError } = await supabase
            .from("model_images")
            .delete()
            .eq("id", image.id);

        if (dbError) {
            console.error("Database Delete Error:", dbError);
            alert("فایل حذف شد ولی اطلاعات آن از دیتابیس حذف نشد.");
            setDeleting(null);
            return;
        }

        setImages((current) => current.filter((item) => item.id !== image.id));
        setDeleting(null);
    }

    if (loading) {
        return <p className="muted">در حال بارگذاری تصاویر...</p>;
    }

    return (
        <div>
            <h3>تصاویر ثبت شده</h3>

            {images.length === 0 ? (
                <p className="muted">هنوز تصویری برای این مدل ثبت نشده است.</p>
            ) : (
                <div className="gallery">
                    {images.map((image, index) => (
                        <div className="gallery-item" key={image.id}>
                            {image.url ? (
                                <img
                                    src={image.url}
                                    alt="تصویر مدل کفش"
                                    style={{ cursor: "zoom-in" }}
                                    onClick={() => setLightboxIndex(index)}
                                />
                            ) : (
                                <div className="gallery-placeholder">
                                    تصویر قابل نمایش نیست.
                                </div>
                            )}

                            {!readOnly && (
                                <div className="gallery-item-footer">
                                    <button
                                        className="btn btn-danger btn-block"
                                        onClick={() => handleDelete(image)}
                                        disabled={deleting === image.id}
                                    >
                                        {deleting === image.id
                                            ? "در حال حذف..."
                                            : "🗑️ حذف"}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {lightboxIndex !== null && images[lightboxIndex]?.url && (
                <div
                    className="lightbox-overlay"
                    onClick={() => setLightboxIndex(null)}
                >
                    <button
                        className="lightbox-close"
                        onClick={() => setLightboxIndex(null)}
                        aria-label="بستن"
                    >
                        ✕
                    </button>

                    {images.length > 1 && (
                        <button
                            className="lightbox-nav lightbox-prev"
                            onClick={(e) => {
                                e.stopPropagation();
                                stepLightbox(-1);
                            }}
                            aria-label="قبلی"
                        >
                            ‹
                        </button>
                    )}

                    <img
                        className="lightbox-img"
                        src={images[lightboxIndex].url!}
                        alt="تصویر مدل کفش"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {images.length > 1 && (
                        <button
                            className="lightbox-nav lightbox-next"
                            onClick={(e) => {
                                e.stopPropagation();
                                stepLightbox(1);
                            }}
                            aria-label="بعدی"
                        >
                            ›
                        </button>
                    )}

                    <div className="lightbox-counter">
                        {lightboxIndex + 1} / {images.length}
                    </div>
                </div>
            )}
        </div>
    );
}
