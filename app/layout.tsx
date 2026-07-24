import "./globals.css";
import type { Metadata } from "next";
export const metadata:Metadata={title:"KALU | مدیریت مدل‌های کفش",description:"سیستم مدیریت اطلاعات مدل‌های کفش"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}
