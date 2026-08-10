'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  ShieldCheck, 
  Package, 
  KeyRound, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mail, 
  Phone, 
  Award, 
  Lock, 
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  Receipt,
  Sparkles,
  Search,
  UserPlus,
  Eye,
  EyeOff,
  XCircle
} from 'lucide-react';
import { Order } from '@/types';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerProfilePage() {
  const router = useRouter();

  // Active Tab: 'personal' | 'orders' | 'security'
  const [activeTab, setActiveTab] = useState<'personal' | 'orders' | 'security'>('personal');

  // Customer Session State
  const [customerSession, setCustomerSession] = useState<{ id?: string; phone_number: string; full_name: string; email?: string; created_at?: string } | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Profile Edit State
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth Page Mode & Register State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Google Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);

  // Guest Login Form State (If not logged in)
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestAuthError, setGuestAuthError] = useState('');
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

  // Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Load customer session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('graduation_customer_session');
      if (saved) {
        const sess = JSON.parse(saved);
        setCustomerSession(sess);
        setFullNameInput(sess.full_name || '');
        setEmailInput(sess.email || '');
        setPhoneInput(sess.phone_number || '');
        fetchCustomerOrders(sess.phone_number);
      }
    } catch (e) {
      console.error('Error loading customer session', e);
    } finally {
      setIsSessionLoaded(true);
    }
  }, []);

  const fetchCustomerOrders = async (phone: string) => {
    if (!phone) return;
    setIsLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.warn('Failed to fetch orders', err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSession) return;
    setProfileMessage(null);
    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/customer/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: customerSession.phone_number,
          full_name: fullNameInput.trim(),
          email: emailInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedSess = {
          ...customerSession,
          full_name: data.customer?.full_name || fullNameInput.trim(),
          email: data.customer?.email || emailInput.trim()
        };
        setCustomerSession(updatedSess);
        localStorage.setItem('graduation_customer_session', JSON.stringify(updatedSess));
        setProfileMessage({ type: 'success', text: data.message || 'تم حفظ البيانات بنجاح' });
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء حفظ البيانات' });
      }
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: 'فشل الاتصال بالخادم، حاول مرة أخرى' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSession) return;
    setSecurityMessage(null);

    if (newPassword.trim() !== confirmPassword.trim()) {
      setSecurityMessage({ type: 'error', text: 'كلمتا المرور الجديدتان غير متطابقتين' });
      return;
    }

    if (newPassword.trim().length < 4) {
      setSecurityMessage({ type: 'error', text: 'كلمة المرور يجب أن تتكون من 4 أرقام/حروف على الأقل' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/customer/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: customerSession.phone_number,
          current_password: currentPassword.trim(),
          new_password: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSecurityMessage({ type: 'success', text: data.message || 'تم تغيير كلمة المرور بنجاح' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSecurityMessage({ type: 'error', text: data.error || 'فشل تغيير كلمة المرور' });
      }
    } catch (err) {
      setSecurityMessage({ type: 'error', text: 'حدث خطأ في الاتصال بالخادم' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthError('');
    setIsGuestSubmitting(true);

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: guestPhone.trim(),
          password: guestPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        setCustomerSession(data.customer);
        localStorage.setItem('graduation_customer_session', JSON.stringify(data.customer));
        setFullNameInput(data.customer.full_name || '');
        setEmailInput(data.customer.email || '');
        setPhoneInput(data.customer.phone_number || '');
        fetchCustomerOrders(data.customer.phone_number);
      } else {
        setGuestAuthError(data.error || 'رقم الموبايل أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setGuestAuthError('حدث خطأ في الاتصال بالشبكة');
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuestAuthError('');

    if (!regFullName.trim() || !regPhone.trim() || !regPassword.trim()) {
      setGuestAuthError('يرجى إكمال الحقول الإلزامية (الاسم، الموبايل، كلمة المرور)');
      return;
    }

    if (regPassword.trim() !== regConfirmPassword.trim()) {
      setGuestAuthError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (regPassword.trim().length < 4) {
      setGuestAuthError('كلمة المرور يجب أن لا تقل عن 4 أرقام/حروف');
      return;
    }

    setIsGuestSubmitting(true);
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          phone_number: regPhone.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.customer) {
        setCustomerSession(data.customer);
        localStorage.setItem('graduation_customer_session', JSON.stringify(data.customer));
        setFullNameInput(data.customer.full_name || '');
        setEmailInput(data.customer.email || '');
        setPhoneInput(data.customer.phone_number || '');
        fetchCustomerOrders(data.customer.phone_number);
      } else {
        setGuestAuthError(data.error || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      setGuestAuthError('حدث خطأ في الاتصال بالشبكة');
    } finally {
      setIsGuestSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setGuestAuthError('');
    setIsGoogleModalOpen(true);
  };

  const handleConfirmGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim() || !googleName.trim() || !googlePhone.trim()) {
      alert('يرجى إكمال جميع بيانات حساب Google والموبايل');
      return;
    }

    setIsSubmittingGoogle(true);
    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: `${googleName.trim()} (Google)`,
          phone_number: googlePhone.trim(),
          email: googleEmail.trim().toLowerCase(),
          password: 'google-oauth-customer-' + Date.now().toString(36)
        })
      });

      const data = await res.json();
      let customerData: any = null;

      if (res.ok && data.success && data.customer) {
        customerData = data.customer;
      } else {
        const loginRes = await fetch('/api/customer/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: googlePhone.trim(),
            password: 'google-oauth-customer'
          })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.customer) {
          customerData = loginData.customer;
        } else {
          customerData = {
            id: 'cust-google-' + Date.now().toString(36),
            full_name: `${googleName.trim()} (Google)`,
            phone_number: googlePhone.trim(),
            email: googleEmail.trim().toLowerCase(),
            created_at: new Date().toISOString()
          };
        }
      }

      setCustomerSession(customerData);
      localStorage.setItem('graduation_customer_session', JSON.stringify(customerData));
      setFullNameInput(customerData.full_name);
      setEmailInput(customerData.email || '');
      setPhoneInput(customerData.phone_number);
      fetchCustomerOrders(customerData.phone_number);
      setIsGoogleModalOpen(false);
    } catch (err) {
      alert('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleLogout = () => {
    if (confirm('هل أنت تأكد من تسجيل الخروج من حسابك؟')) {
      localStorage.removeItem('graduation_customer_session');
      setCustomerSession(null);
      router.push('/');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_verified':
      case 'manual_verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم تأكيد الدفع
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="w-3.5 h-3.5" />
            جاهز للاستلام 🎓
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تم التسيلم
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            ملغي
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            قيد الانتظار والتحقق
          </span>
        );
    }
  };

  if (!isSessionLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-slate-400">جاري تحميل بيانات البروفايل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* --- TOP NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs sm:text-sm font-semibold border border-slate-700/60"
            >
              <ChevronRight className="w-4 h-4 text-amber-400" />
              <span>العودة للمتجر</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-slate-950" />
            </div>
            <span className="text-sm sm:text-base font-bold gradient-gold-text hidden xs:inline">
              بروفايل عميل الدفعة التاسعة
            </span>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTAINER --- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* If Guest / Not Logged In Prompt */}
        {!customerSession ? (
          <div className="max-w-xl mx-auto relative">
            {/* Ambient Background Glow Orbs */}
            <div className="absolute -top-12 -right-12 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-60 h-60 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative glass-card border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl bg-slate-900/90 backdrop-blur-xl">
              
              {/* Header Badge & Title */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  {authMode === 'login' ? (
                    <Lock className="w-8 h-8 text-amber-400" />
                  ) : (
                    <UserPlus className="w-8 h-8 text-amber-400" />
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                  {authMode === 'login' ? 'مرحباً بك مجدداً 🎓' : 'إنضمام لطلاب الدفعة التاسعة ✨'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  {authMode === 'login' 
                    ? 'سجل دخولك للوصول إلى تفاصيل طلباتك، التطريز، وإعدادات الأمان'
                    : 'أنشئ حسابك الجديد الآن لمتابعة حجزك وتخصيص مستلزمات التخرج'}
                </p>
              </div>

              {/* Segmented Auth Tabs */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 mb-8 relative">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setGuestAuthError(''); }}
                  className={`py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    authMode === 'login'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setGuestAuthError(''); }}
                  className={`py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    authMode === 'register'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إنشاء حساب جديد</span>
                </button>
              </div>

              {/* Official Google OAuth Button */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 shadow-xl transition-all border border-slate-200"
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
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <span className="relative px-4 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-semibold">
                  أو عبر البيانات المباشرة
                </span>
              </div>

              {guestAuthError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-bold flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{guestAuthError}</span>
                </div>
              )}

              {/* Login Form */}
              {authMode === 'login' && (
                <form onSubmit={handleGuestLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>رقم الموبايل أو البريد الإلكتروني</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 01012345678 أو student@gmail.com"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>كلمة المرور</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono pl-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGuestSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    {isGuestSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>جاري الدخول...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-5 h-5" />
                        <span>تسجيل الدخول للبروفايل ➔</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Register Form */}
              {authMode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>الاسم بالكامل</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد محمد علي"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>رقم الموبايل</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="01012345678"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>البريد الإلكتروني (اختياري)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="student@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>كلمة المرور</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>تأكيد كلمة المرور</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition shadow-inner font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGuestSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
                  >
                    {isGuestSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>جاري إنشاء الحساب...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>إنشاء حساب الدفعة التاسعة 🎉</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Trust Badges */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>تشفير وأمان عالي</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>متابعة فورية للطلبات</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>مزايا التخرج الحصرية</span>
                </div>
              </div>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  العودة للصفحة الرئيسية
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* Logged-in Profile View */
          <div className="space-y-8">
            
            {/* User Profile Header Card */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 p-1 shadow-xl shadow-amber-500/20 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-100">
                        {customerSession.full_name || 'عميل المتجر'}
                      </h1>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        عميل موثق
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span dir="ltr">{customerSession.phone_number}</span>
                      </span>
                      {customerSession.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>{customerSession.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'personal'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>المعلومات الشخصية</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('orders');
                  fetchCustomerOrders(customerSession.phone_number);
                }}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'orders'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>طلباتي ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'security'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>إعدادات الأمان</span>
              </button>
            </div>

            {/* --- TAB CONTENT AREA --- */}

            {/* 1. PERSONAL INFO TAB */}
            {activeTab === 'personal' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">تعديل البيانات الشخصية</h2>
                    <p className="text-xs text-slate-400">تحديث الاسم والبريد الإلكتروني المسجل في حسابك</p>
                  </div>
                </div>

                {profileMessage && (
                  <div className={`mb-6 p-4 rounded-2xl border text-xs font-semibold ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">الاسم بالكامل</label>
                    <input
                      type="text"
                      required
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">رقم الموبايل (لا يمكن تغييره لمعرف الحساب)</label>
                    <input
                      type="text"
                      disabled
                      value={phoneInput}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-500 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">البريد الإلكتروني (اختياري)</label>
                    <input
                      type="email"
                      placeholder="example@domain.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="py-3.5 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>حفظ التغيرات 💾</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 2. ORDERS HISTORY TAB */}
            {activeTab === 'orders' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">سجل طلباتي</h2>
                      <p className="text-xs text-slate-400">عرض وتتبع جميع الطلبات التي قمت بإجرائها</p>
                    </div>
                  </div>

                  <button
                    onClick={() => fetchCustomerOrders(customerSession.phone_number)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                  </button>
                </div>

                {isLoadingOrders ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    <p className="text-xs">جاري تحميل طلباتك...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <ShoppingBag className="w-12 h-12 text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">لا توجد طلبات سابقة مسجلة بهذا الرقم</p>
                    <button
                      onClick={() => router.push('/')}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition"
                    >
                      تصفح المنتجات واطلب الآن 🎓
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      return (
                        <div
                          key={order.id}
                          className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition hover:border-slate-700"
                        >
                          <div
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-extrabold text-amber-400">
                                  #{order.order_code}
                                </span>
                                {getStatusBadge(order.status)}
                              </div>
                              <p className="text-xs text-slate-400">
                                تاريخ الطلب: {new Date(order.created_at).toLocaleDateString('ar-EG')}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-left">
                                <span className="text-xs text-slate-400 block">إجمالي الطلب</span>
                                <span className="text-base font-bold text-emerald-400">{order.total_amount} ج.م</span>
                              </div>
                              <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
                                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Order Details */}
                          {isExpanded && (
                            <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/60 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                                <div>
                                  <span className="text-slate-500 block">طريقة الدفع</span>
                                  <span className="font-semibold text-slate-200">
                                    {order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'انستا باي (InstaPay)'}
                                  </span>
                                </div>
                                {order.sender_phone && (
                                  <div>
                                    <span className="text-slate-500 block">رقم المرسل</span>
                                    <span className="font-semibold text-slate-200" dir="ltr">{order.sender_phone}</span>
                                  </div>
                                )}
                                {order.transaction_ref && (
                                  <div>
                                    <span className="text-slate-500 block">رقم المعاملة/المرجع</span>
                                    <span className="font-semibold text-slate-200">{order.transaction_ref}</span>
                                  </div>
                                )}
                              </div>

                              {/* Items List */}
                              <div>
                                <h4 className="text-xs font-bold text-slate-300 mb-2">المنتجات المطلوبة:</h4>
                                <div className="space-y-2">
                                  {order.items && order.items.length > 0 ? (
                                    order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                                        <div>
                                          <span className="font-bold text-slate-200">{item.product_title}</span>
                                          {item.selected_size && (
                                            <span className="mr-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                              {item.selected_size}
                                            </span>
                                          )}
                                          {item.custom_text && (
                                            <p className="text-[11px] text-amber-400 mt-0.5">تطريز: {item.custom_text}</p>
                                          )}
                                        </div>
                                        <div className="text-left font-bold text-slate-300">
                                          {item.quantity} × {item.unit_price} ج.م
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-slate-500">ملاحظة: تفاصيل المنتجات متاحة بالفاتورة الإجمالية</p>
                                  )}
                                </div>
                              </div>

                              {/* Receipt Image Link */}
                              {order.receipt_url && (
                                <div>
                                  <a
                                    href={order.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold transition"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                    <span>عرض صورة إيصال التحويل المرفق 📄</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. SECURITY SETTINGS TAB */}
            {activeTab === 'security' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">إعدادات الأمان وتغيير كلمة المرور</h2>
                    <p className="text-xs text-slate-400">حماية حسابك وتغيير كلمة المرور الخاصة بك</p>
                  </div>
                </div>

                {securityMessage && (
                  <div className={`mb-6 p-4 rounded-2xl border text-xs font-semibold ${
                    securityMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {securityMessage.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-6 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">كلمة المرور الحالية (إن وجدت)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">تأكيد كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>تحديث كلمة المرور 🔒</span>
                    )}
                  </button>
                </form>

                {/* Additional Security Info Box */}
                <div className="mt-8 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-200">نصيحة أمان لحسابك:</p>
                    <p className="text-slate-400">
                      احرص دائماً على عدم مشاركة كلمة المرور الخاصة بك مع أي شخص. كلمة المرور تُستخدم للوصول إلى سجل طلباتك وتتبع مشترياتك بأمان.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      {/* --- GOOGLE AUTH MODAL --- */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="relative max-w-md w-full glass-card rounded-3xl p-6 sm:p-8 border border-slate-700 bg-slate-900 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-2 flex items-center justify-center shadow">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تسجيل جديد بـ Google</h3>
                  <p className="text-xs text-slate-400">أدخل بياناتك لربط حساب Google بالمتجر</p>
                </div>
              </div>
              <button onClick={() => setIsGoogleModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmGoogleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>بريد Google الإلكتروني</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="student.name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>الاسم بالكامل على Google</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="أحمد محمد علي"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>رقم الموبايل للتواصل والدفع</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingGoogle}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                {isSubmittingGoogle ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>جاري الربط والحفظ...</span>
                  </>
                ) : (
                  <span>متابعة الدخول بحساب Google 🚀</span>
                )}
              </button>
            </form>

          </div>
        </div>
      )}
      </main>
    </div>
  );
}
