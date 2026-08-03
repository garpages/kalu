import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    title: "KALU | مدیریت مدل‌های کفش",
    description: "سیستم مدیریت اطلاعات مدل‌های کفش",
    icons: {
        icon: [
            { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
            { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
        apple: [
            { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "KALU",
    },
};

export const viewport: Viewport = {
    themeColor: "#6b4226",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fa" dir="rtl">
            <body>{children}</body>
        </html>
    );
}
