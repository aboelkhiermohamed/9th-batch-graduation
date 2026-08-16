import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Medix | متجر الدفعة التاسعة',
  description: 'The Medix - المتجر الرسمي لمستلزمات وملابس تخرج الدفعة التاسعة مع نظام الدفع الفوري والمطابقة الآلية',
  icons: {
    icon: '/logo-removebg-preview.png',
    shortcut: '/logo-removebg-preview.png',
    apple: '/logo-removebg-preview.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-[#120024] text-slate-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
