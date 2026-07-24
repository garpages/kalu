"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ModelImage = {
    id: string;
    model_id: string;
    storage_path: string;
    created_at: string;
};

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
    const [images, setImages] = useState<ModelImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

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

        setImages(data || []);
        setLoading(false);
    }

    useEffect(() => {
        loadImages();
    }, [modelId, refreshKey]);

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
                    {images.map((image) => (
                        <ImageCard
                            key={image.id}
                            image={image}
                            deleting={deleting === image.id}
                            onDelete={() => handleDelete(image)}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ImageCard({
    image,
    deleting,
    onDelete,
    readOnly,
}: {
    image: ModelImage;
    deleting: boolean;
    onDelete: () => void;
    readOnly: boolean;
}) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getImageUrl() {
            setLoading(true);

            const { data, error } = await supabase.storage
                .from("shoe-images")
                .createSignedUrl(image.storage_path, 3600);

            if (error) {
                console.error("Create Signed URL Error:", error);
                setLoading(false);
                return;
            }

            setImageUrl(data.signedUrl);
            setLoading(false);
        }

        getImageUrl();
    }, [image.storage_path]);

    return (
        <div className="gallery-item">
            {loading ? (
                <div className="gallery-placeholder">در حال بارگذاری...</div>
            ) : imageUrl ? (
                <img src={imageUrl} alt="تصویر مدل کفش" />
            ) : (
                <div className="gallery-placeholder">تصویر قابل نمایش نیست.</div>
            )}

            {!readOnly && (
                <div className="gallery-item-footer">
                    <button
                        className="btn btn-danger btn-block"
                        onClick={onDelete}
                        disabled={deleting}
                    >
                        {deleting ? "در حال حذف..." : "🗑️ حذف"}
                    </button>
                </div>
            )}
        </div>
    );
}
