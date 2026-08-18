'use client';

import React, { useState } from 'react';
import { X, Lock, User, Phone, Mail, GraduationCap, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { isValidEgyptianPhone, normalizePhoneNumber } from '@/lib/smsParser';

export interface CustomerSession {
  id?: string;
  phone_number: string;
  full_name: string;
  email?: string;
  created_at?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: CustomerSession) => void;
  initialMode?: 'login' | 'register';
  customTitle?: string;
  customSubtitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  customTitle,
  customSubtitle
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login form fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form fields
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setAuthErrorMessage('');
    try {
      if (supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined
          }
        });
        if (error) {
          console.warn('Supabase Google OAuth error:', error.message);
          setAuthErrorMessage(error.message || 'فشل الاتصال بـ Google OAuth');
        }
      } else {
        setAuthErrorMessage('خيار التسجيل بـ Google غير متاح حالياً');
      }
    } catch (err: any) {
      setAuthErrorMessage('حدث خطأ أثناء الاتصال بـ Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage('');
    setIsSubmitting(true);

    try {
      const rawIdent = loginIdentifier.trim();
      const cleanIdent = rawIdent.includes('@') ? rawIdent : normalizePhoneNumber(rawIdent);

      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdent,
          password: loginPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        localStorage.setItem('graduation_customer_session', JSON.stringify(data.customer));
        if (onSuccess) {
          onSuccess(data.customer);
        }
        onClose();
      } else {
        setAuthErrorMessage(data.error || 'رقم الموبايل / الإيميل أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setAuthErrorMessage('حدث خطأ في الاتصال بالسيرفر، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage('');

    const cleanPhone = normalizePhoneNumber(registerPhone);
    if (!isValidEgyptianPhone(cleanPhone)) {
      setAuthErrorMessage('يرجى إدخال رقم موبايل مصري صحيح يبدأ بـ (010, 011, 012, 015) ومكون من 11 رقماً');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: registerFullName.trim(),
          phone_number: cleanPhone,
          email: registerEmail.trim() || undefined,
          password: registerPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        localStorage.setItem('graduation_customer_session', JSON.stringify(data.customer));
        if (onSuccess) {
          onSuccess(data.customer);
        }
        onClose();
      } else {
        setAuthErrorMessage(data.error || 'فشل إنشاء الحساب، يرجى التأكد من البيانات');
      }
    } catch (err: any) {
      setAuthErrorMessage('حدث خطأ أثناء إنشاء الحساب، حاول مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-xl p-4 flex items-center justify-center animate-fadeIn" dir="rtl">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Glassmorphism Modal Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/40 space-y-5 text-right z-10 backdrop-blur-2xl">
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-indigo-600/30 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                {customTitle || 'حساب العملاء 🎓'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {customSubtitle || 'سجل دخولك أو أنشئ حساباً لمتابعة وحجز طلباتك'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Official Google OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 shadow-lg transition-all border border-slate-200"
          >
            {isGoogleLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>المتابعة والتسجيل بـ Google 🚀</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative px-3 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-semibold">
            أو عبر البيانات المباشرة
          </span>
        </div>

        {/* Tab Switcher (Academic Noir Segmented Pill) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setAuthErrorMessage(''); }}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setAuthErrorMessage(''); }}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>إنشاء حساب جديد</span>
          </button>
        </div>

        {/* Error Banner */}
        {authErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center leading-relaxed">
            {authErrorMessage}
          </div>
        )}

        {/* LOGIN FORM */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رقم الموبايل أو البريد الإلكتروني *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="أدخل رقم الموبايل أو الإيميل"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور *
              </label>
              <input
                type="password"
                required
                placeholder="أدخل كلمة السر"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري التحقق...</span>
              ) : (
                <>
                  <span>تسجيل الدخول الآن</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الاسم الثلاثي بالكامل *
              </label>
              <input
                type="text"
                required
                placeholder="أدخل اسمك الثلاثي"
                value={registerFullName}
                onChange={(e) => setRegisterFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رقم الموبايل (مهم لمتابعة واستلام الطلب) *
              </label>
              <input
                type="tel"
                required
                placeholder="01xxxxxxxx"
                value={registerPhone}
                onChange={(e) => setRegisterPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                placeholder="example@mail.com"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور *
              </label>
              <input
                type="password"
                required
                placeholder="اختر كلمة سر حسّاسة وحافظ عليها"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري إنشاء الحساب...</span>
              ) : (
                <>
                  <span>إنشاء الحساب والانضمام 🎓</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
