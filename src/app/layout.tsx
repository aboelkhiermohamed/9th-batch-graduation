import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '9th Batch Graduation Store | متجر الدفعة التاسعة',
  description: 'المتجر الرسمي للدفعة التاسعة - حجز واقتناء مستلزمات وملابس التخرج مع نظام الدفع الفوري',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
