'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  User, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Code, 
  ExternalLink,
  Info
} from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#120024] text-slate-100 flex flex-col font-sans dir-rtl" dir="rtl">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <img 
              src="/logo-removebg-preview.png" 
              alt="The Medix" 
              className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(142,208,0,0.45)] transition group-hover:scale-105" 
            />
            <span className="text-xs text-lime-300 font-bold bg-lime-500/10 border border-lime-500/30 px-2.5 py-1 rounded-full hidden sm:inline-block">
              🎓 الدفعة التاسعة
            </span>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/privacy"
              className="text-xs text-slate-400 hover:text-white font-medium transition"
            >
              الخصوصية والشروط
            </a>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-800/80 text-xs sm:text-sm font-semibold text-slate-200 transition"
            >
              <ArrowRight className="w-4 h-4 text-lime-400 rotate-180" />
              <span>العودة للمتجر</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-14 space-y-10 flex-1">

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-lime-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-xl">
            <GraduationCap className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
            عن منصة The Medix | الدفعة التاسعة 🎓
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            المنصة الإلكترونية الرسمية المخصصة لتنظيم وتأكيد طلبات مستلزمات وتذكارات تخرج الدفعة التاسعة بنظام المطابقة التلقائي والإشراف الفوري.
          </p>
        </div>

        {/* Developer Contact Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-indigo-500/40 bg-slate-900/90 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Code className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-0.5">برمجة وتنفيذ المنصة</span>
              <h2 className="text-xl font-black text-white">Mohamed Ahmad (M7MED)</h2>
              <p className="text-xs text-slate-400">مطور ومصمم المنصة البرمجية للدفعة التاسعة</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            تم تطوير وتصميم هذه المنصة خصيصاً لخدمة طلاب وتأكيد جميع التحويلات والتطريز وتذاكر الحفل بأعلى دقة وشفافية وسرعة.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://t.me/M7MED1573"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2.5 shadow-lg shadow-sky-500/20 transition active:scale-95"
            >
              <Send className="w-4 h-4 text-slate-950" />
              <span>التواصل المباشر عبر تليجرام (https://t.me/M7MED1573)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Platform Purpose & Core Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">نظام مطابقة آلي</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ربط فوري بين الرسائل النصية للتحويلات والطلبات للتأكيد السريع والتلقائي دون أي تأخير.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">تنظيم البيانات بدقة</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              حفظ وتوثيق أسماء التطريز والمقاسات وتذاكر المرافقين لمنع الأخطاء في التجهيز.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">خصوصية وأمان</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              حفظ بيانات الطلاب وسجل الطلبات بأعلى معايير الأمان مع إمكانية متابعة حالة الطلب في أي وقت.
            </p>
          </div>
        </div>

        {/* Notice Card */}
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-400">
            <Info className="w-4 h-4" />
            <span>تنويه هام عن طبيعة المنصة:</span>
          </p>
          <p>
            هذه المنصة ذات طبيعة تنظيمية وبرمجية للتأكيد والتنسيق فقط. يمكنك الإطلاع على كافة الشروط والسياسات بالتفصيل في صفحة <a href="/privacy" className="underline font-bold text-white">سياسة الخصوصية والشروط</a>.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <a href="/" className="hover:text-white transition">الرئيسية</a>
          <span>•</span>
          <a href="/about" className="text-lime-400 font-bold">عن المنصة والمنفذ</a>
          <span>•</span>
          <a href="/privacy" className="hover:text-white transition">الخصوصية والشروط</a>
        </div>
        <p>© 2026 The Medix - الدفعة التاسعة. تطوير وتنفيذ: Mohamed (M7MED).</p>
      </footer>

    </div>
  );
}
