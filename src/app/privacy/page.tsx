'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  ArrowRight, 
  Coins, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Send
} from 'lucide-react';

export default function PrivacyPage() {
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
              href="/about"
              className="text-xs text-slate-400 hover:text-white font-medium transition"
            >
              عن المنصة والمنفّذ
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
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-14 space-y-8 flex-1">

        {/* Page Title & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            سياسة الخصوصية وأحكام الاستخدام 📜
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            توضيح شامل لدور المنصة البرمجية وسياسة الخصوصية وآلية استقبال الأموال وتنظيم الطلبات.
          </p>
        </div>

        {/* Core Policy Highlighted Box 1: Platform Purpose */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-indigo-500/40 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">1. طبيعة المنصة والدور التنظيمي</h2>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>مهمة المنصة الأساسية:</span>
            </p>
            <p className="text-slate-300">
              المنصة مهمتها تأكيد التحويلات والطلبات وتنظيم المعلومات وتوثيق المقاسات وأسماء التطريز بعيداً تماماً عن أي امور مالية أو إدارة أرصدة مالية مباشرة.
            </p>
          </div>
        </div>

        {/* Core Policy Highlighted Box 2: Funds Handling & Wallets */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-amber-500/40 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">2. آلية حفظ واستقبال الأموال والتحويلات</h2>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
            <p className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>استقبال وحفظ المبالغ المادية:</span>
            </p>
            <p className="text-slate-300">
              لا يتم احتجاز أو معالجة أو تخزين أي مبالغ مالية داخل السيستم البرمجي للموقع نهائياً، ويتم حفظ واستقبال جميع الأموال والتحويلات مباشرةً على المحافظ الخاصة بزملائنا المتبرعين بها لتسهيل التحويلات وتنظيم المبالغ المخصصة للدفعة.
            </p>
          </div>
        </div>

        {/* Section 3: Student Data & Privacy */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">3. حماية وسرية بيانات الطلاب</h2>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></span>
              <span><strong>استخدام البيانات:</strong> تُستخدم بيانات الطالب (الاسم، رقم الموبايل، المقاسات، التطريز) حصرياً لأغراض تجهيز الطلب، التحقق من التحويل، وتأكيد التسليم.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></span>
              <span><strong>عدم المشاركة:</strong> يتم التعامل مع بيانات كافة الطلاب بشرية وسرية تامة دون تسريبها أو استخدامها لأي أغراض تجارية خارج إطار تخرج الدفعة التاسعة.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></span>
              <span><strong>المطابقة الآلية:</strong> يُطلب من الطلاب إدخال الرقم المرجعي للمعاملة بدقة لتمكين نظام السيرفر من تأكيد الطلب فورياً ومطابقة الإيصالات تلقائياً.</span>
            </li>
          </ul>
        </div>

        {/* Support & Inquiry Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-right">
            <h3 className="text-base font-bold text-white">هل لديك أي استفسار أو اقتراح؟</h3>
            <p className="text-xs text-slate-400">يمكنك التواصل المباشر مع مطوّر المنصة عبر تليجرام في أي وقت.</p>
          </div>
          <a
            href="https://t.me/M7MED1573"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition shadow-md flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>تليجرام: @M7MED1573</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-3">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-400">
          <a href="/" className="hover:text-white transition">الرئيسية</a>
          <span>•</span>
          <a href="/about" className="hover:text-white transition">عن المنصة والمنفذ</a>
          <span>•</span>
          <a href="/privacy" className="text-lime-400 font-bold">الخصوصية والشروط</a>
        </div>
        <p>© 2026 The Medix - الدفعة التاسعة. جميع الحقوق محفوظة.</p>
      </footer>

    </div>
  );
}
