'use client';

import React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">حدث خطأ غير متوقع</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-md">{error.message || 'حدث خطأ أثناء تحميل البيانات'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-500 transition"
      >
        إعادة المحاولة 🔄
      </button>
    </div>
  );
}
