import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-3xl font-bold mb-2">404 - الصفحة غير موجودة</h2>
      <p className="text-slate-400 mb-6">عذراً، الصفحة التي تبحث عنها غير موجودة.</p>
      <Link href="/" className="px-6 py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 transition">
        العودة للرئيسية
      </Link>
    </div>
  );
}
