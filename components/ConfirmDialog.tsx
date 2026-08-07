"use client";

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "تایید",
    danger = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 11, 8, 0.5)",
                zIndex: 200,
                display: "grid",
                placeItems: "center",
                padding: 20,
            }}
            onClick={onCancel}
        >
            <div
                className="panel"
                style={{ maxWidth: 380, width: "100%" }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ marginBottom: 8 }}>{title}</h2>
                <p className="muted">{message}</p>

                <div className="actions">
                    <button
                        className={danger ? "btn btn-danger" : "btn btn-primary"}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>

                    <button className="btn btn-secondary" onClick={onCancel}>
                        انصراف
                    </button>
                </div>
            </div>
        </div>
    );
}
