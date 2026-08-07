"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import { logActivity } from "@/lib/activityLog";

type ImageUploaderProps = {
    modelId: string;
    modelCode?: string;
    onUploaded?: () => void;
};

export default function ImageUploader({
    modelId,
    modelCode,
    onUploaded,
}: ImageUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [success, setSuccess] = useState(false);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files) return;

        setFiles(Array.from(e.target.files));
        setMessage("");
    }

    async function handleUpload() {
        if (files.length === 0) {
            setSuccess(false);
            setMessage("لطفاً حداقل یک عکس انتخاب کنید.");
            return;
        }

        setUploading(true);
        setMessage("");

        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error("کاربر وارد حساب نشده است.");
            }

            for (const rawFile of files) {
                const file = await compressImage(rawFile);
                const fileExt = file.name.split(".").pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${modelId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("shoe-images")
                    .upload(filePath, file, {
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (uploadError) {
                    console.error("STORAGE UPLOAD ERROR:", uploadError);
                    throw new Error(`خطای Storage: ${uploadError.message}`);
                }

                const { error: dbError } = await supabase
                    .from("model_images")
                    .insert({
                        model_id: modelId,
                        storage_path: filePath,
                    });

                if (dbError) {
                    console.error("DATABASE ERROR:", dbError);

                    await supabase.storage.from("shoe-images").remove([filePath]);

                    throw new Error(`خطای دیتابیس: ${dbError.message}`);
                }
            }

            setFiles([]);
            setSuccess(true);
            setMessage("عکس‌ها با موفقیت آپلود شدند.");

            logActivity(`آپلود ${files.length} عکس`, modelCode);

            onUploaded?.();
        } catch (error) {
            console.error("UPLOAD ERROR:", error);

            setSuccess(false);

            if (error instanceof Error) {
                setMessage(error.message);
            } else {
                setMessage("خطای ناشناخته در آپلود عکس.");
            }
        }

        setUploading(false);
    }

    return (
        <div className="field">
            <label>افزودن عکس‌های مدل</label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                    className="input"
                    style={{ flex: 1, minWidth: 220 }}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                />

                <button
                    className="btn btn-primary"
                    onClick={handleUpload}
                    disabled={uploading}
                >
                    {uploading ? "در حال آپلود..." : "آپلود عکس‌ها"}
                </button>
            </div>

            {files.length > 0 && (
                <p className="muted" style={{ marginTop: 8 }}>
                    {files.length} عکس انتخاب شده است.
                </p>
            )}

            {message && (
                <p className={`status-message ${success ? "status-success" : "status-error"}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
