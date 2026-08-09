'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  Copy, 
  Check, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Package, 
  ArrowRight,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Send,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';
import { CartItem, Order, PaymentMethod, StoreSettings, ProductAddon } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/supabaseClient';

const fireConfetti = (options?: any) => {
  if (typeof window === 'undefined') return;
  import('canvas-confetti').then((confettiModule) => {
    const fn = confettiModule.default || confettiModule;
    if (typeof fn === 'function') {
      fn(options);
    }
  }).catch((err) => {
    console.warn('Confetti trigger warning:', err);
  });
};

export default function CheckoutPage() {
  const router = useRouter();

  // Settings & Cart state
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Form State
  const [customerSession, setCustomerSession] = useState<{ phone_number: string; full_name: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vodafone_cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Submitted Order Result State
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Load cart & settings from localStorage and API
  useEffect(() => {
    async function init() {
      try {
        const savedCart = localStorage.getItem('graduation_store_cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }

        const savedCustomer = localStorage.getItem('graduation_customer_session');
        if (savedCustomer) {
          try {
            const cust = JSON.parse(savedCustomer);
            setCustomerSession(cust);
            if (cust.full_name) setCustomerName(cust.full_name);
            if (cust.phone_number) setCustomerPhone(cust.phone_number);
          } catch(e) {}
        }

        const setRes = await fetch('/api/admin/settings');
        if (setRes.ok) {
          const setts = await setRes.json();
          if (setts) setSettings(setts);
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    init();
  }, []);

  // Sync cart back to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('graduation_store_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Cart total calculations
  const cartTotal = cart.reduce((acc, item) => {
    const addonsPrice = item.selectedAddons ? item.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0) : 0;
    return acc + (item.product.price + addonsPrice) * item.quantity;
  }, 0);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Update quantity helper
  const handleUpdateQuantity = (idx: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  // Copy helper
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Receipt File Upload Handler
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
    setReceiptFile(file);

    // Read as Base64 Data URL as primary reliable fallback
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setReceiptUrl(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    setIsUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'receipts');
      fd.append('folder', 'orders');

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (res.ok && data.url) {
        setReceiptUrl(data.url);
      }
    } catch (err) {
      console.warn('Receipt upload fallback to Base64:', err);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('السلة فارغة، يرجى إضافة منتجات أولاً');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !transactionRef.trim()) {
      alert('يرجى إدخال اسم العميل ورقم الموبايل والرقم المرجعي للعملية');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderItems = cart.map(item => {
        const addonsPrice = item.selectedAddons ? item.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0) : 0;
        const unitPrice = item.product.price + addonsPrice;
        const addonsSummary = item.selectedAddons && item.selectedAddons.length > 0
          ? item.selectedAddons.map(a => `${a.name} (+${a.price} ج.م)`).join('، ')
          : undefined;

        return {
          product_id: item.product.id,
          product_title: item.product.title_ar || item.product.title,
          selected_size: item.selectedSize,
          customText: item.customText,
          customization_option: addonsSummary,
          selected_addons: item.selectedAddons,
          quantity: item.quantity,
          unit_price: unitPrice,
          product: item.product
        };
      });

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          senderPhone: senderPhone.trim() || customerPhone.trim(),
          transactionRef: transactionRef.trim(),
          paymentMethod,
          receiptUrl: receiptUrl || undefined,
          items: orderItems,
          notes: `المقاسات والتسليم: ${settings.pickup_note}`
        })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setCreatedOrder(data.order);
        setCart([]);
        localStorage.removeItem('graduation_store_cart');

        fireConfetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        alert(data.error || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch (err: any) {
      alert('فشل الاتصال بالسيرفر، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const activeVodafoneNumber = settings.vodafone_cash_numbers[0] || '01015339426';

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin"></span>
          <span>جاري تحميل صفحة الدفع...</span>
        </div>
      </div>
    );
  }

  // --- ORDER SUCCESS CONFIRMATION VIEW ---
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl glass-modal rounded-3xl p-6 sm:p-8 border border-slate-700/80 text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">تم تسجيل طلبك بنجاح! 🎓🎉</h2>
            <p className="text-xs sm:text-sm text-slate-300">نشكرك على إتمام العملية. جاري التحقق من الإيصال وتأكيد طلبك فوريًا.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400 font-semibold">كود الطلب الخاص بك:</span>
              <span className="text-lg font-mono font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/30">
                {createdOrder.order_code}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">اسم العميل:</span>
              <span className="font-bold text-white">{createdOrder.customer_name}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">رقم الموبايل:</span>
              <span className="font-mono font-bold text-white">{createdOrder.customer_phone}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">الرقم المرجعي للعملية:</span>
              <span className="font-mono font-bold text-amber-300">{createdOrder.transaction_ref}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">إجمالي المبلغ:</span>
              <span className="font-bold text-indigo-400">{createdOrder.total_amount} ج.م</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">حالة الطلب الآن:</span>
              {createdOrder.status === 'auto_verified' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🤖 مؤكد تلقائياً</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>معلق وفي انتظار التأكيد</span>
                </span>
              )}
            </div>

            {/* ORDER ITEMS & ADDONS LIST */}
            {createdOrder.items && createdOrder.items.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-xs font-bold text-amber-400">محتويات الطلب والإضافات ({createdOrder.items.length}):</p>
                <div className="space-y-1.5">
                  {createdOrder.items.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>{item.product_title} × {item.quantity}</span>
                        {item.selected_size && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px]">
                            المقاس: {item.selected_size}
                          </span>
                        )}
                      </div>
                      {item.custom_text && (
                        <p className="text-[11px] text-amber-400 font-medium">
                          ✨ التطريز: &quot;{item.custom_text}&quot;
                        </p>
                      )}
                      {item.customization_option && (
                        <p className="text-[11px] text-emerald-400 font-medium">
                          💎 الإضافات: {item.customization_option}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RECEIPT PREVIEW IF ATTACHED */}
            {createdOrder.receipt_url && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>صورة إيصال التحويل المرفقة:</span>
                </p>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-center">
                  <img src={createdOrder.receipt_url} alt="Receipt" className="max-h-48 object-contain rounded-lg" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push(`/?tracker=true&code=${encodeURIComponent(createdOrder.order_code)}`)}
              className="flex-1 py-3.5 px-6 rounded-2xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30"
            >
              متابعة وتتبع حالة الطلب 🔍
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700"
            >
              العودة للمتجر الرئيسي
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-xs sm:text-sm font-semibold text-slate-200 transition-all"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>العودة للمتجر</span>
          </button>

          <div className="text-center">
            <h1 className="text-sm sm:text-lg font-black gradient-gold-text">
              تأكيد الدفع وإرسال الطلب
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">
              متجر الدفعة التاسعة الرسمية 🎓
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">إجمالي العناصر:</span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-xs border border-amber-500/30">
              {totalCartCount} منتجات
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        {!customerSession ? (
          <div className="max-w-md mx-auto text-center py-12 space-y-5 glass-modal p-8 rounded-3xl border border-slate-700/80 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white mb-2">تسجيل الدخول مطلوب لإتمام الطلب 🎓</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                عفواً، ينبغي عليك إنشاء حساب أو تسجيل الدخول لحسابك أولاً لإتمام عملية الشراء وإرسال الطلب
              </p>
            </div>
            <button
              onClick={() => router.push('/?login=true')}
              className="w-full py-4 px-6 rounded-2xl gradient-purple-btn text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition"
            >
              تسجيل الدخول / إنشاء حساب جديد الان 👤
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
              <ShoppingBag className="w-10 h-10 stroke-1" />
            </div>
            <h3 className="text-xl font-bold text-white">السلة فارغة حالياً</h3>
            <p className="text-xs text-slate-400">يرجى العودة للمتجر الرئيسي وإضافة منتجات التخرج للسلة أولاً</p>
            <button
              onClick={() => router.push('/')}
              className="py-3 px-6 rounded-2xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30"
            >
              تصفح منتجات المتجر الآن
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (On Desktop): Payment Instructions & Customer Form (7 cols) */}
            <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
              
              <div className="glass-modal rounded-3xl p-5 sm:p-8 border border-slate-700/80 space-y-6 shadow-2xl">
                
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-400" />
                    <span>بيانات التحويل ومعلومات الطلب</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">ادفع المبلغ المطلوب عبر فودافون كاش أو إنستا باي ثم أدخل بياناتك وإيصال التحويل</p>
                </div>

                {/* Total Required Amount */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 text-center">
                  <span className="text-xs font-bold text-amber-400 block mb-1">إجمالي المبلغ المطلوب تحويله</span>
                  <span className="text-3xl sm:text-4xl font-black text-white">
                    {cartTotal} <span className="text-amber-400 text-lg sm:text-xl">ج.م</span>
                  </span>
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vodafone_cash')}
                    className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
                      paymentMethod === 'vodafone_cash'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-600/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                    <span>فودافون كاش (Vodafone Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('instapay')}
                    className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all ${
                      paymentMethod === 'instapay'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-600/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                    <span>إنستا باي (InstaPay)</span>
                  </button>
                </div>

                {/* Transfer Number Copy Box */}
                {paymentMethod === 'vodafone_cash' ? (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>حول المبلغ على رقم فودافون كاش التالي:</span>
                      <span className="text-rose-400 font-semibold flex-shrink-0">محفظة كاش</span>
                    </div>
                    <div className="flex flex-wrap xs:flex-nowrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-base sm:text-xl font-mono font-extrabold text-white tracking-widest truncate dir-ltr select-all">
                        {activeVodafoneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeVodafoneNumber, 'voda')}
                        className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex-shrink-0"
                      >
                        {copiedText === 'voda' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText === 'voda' ? 'تم النسخ' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>حول المبلغ على حساب InstaPay IPA التالي:</span>
                      <span className="text-purple-400 font-semibold flex-shrink-0">InstaPay</span>
                    </div>
                    <div className="flex flex-wrap xs:flex-nowrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-sm sm:text-base font-mono font-bold text-white truncate dir-ltr select-all">
                        {settings.instapay_ipa}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(settings.instapay_ipa, 'insta')}
                        className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex-shrink-0"
                      >
                        {copiedText === 'insta' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText === 'insta' ? 'تم النسخ' : 'نسخ الحساب'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Form Inputs */}
                <form onSubmit={handlePlaceOrder} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      الاسم بالكامل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسمك الثلاثي"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                      <span>رقم موبايل العميل (الخاص بالحساب واستلام الطلب) <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-amber-400 font-semibold">ويرتبط بحسابك لمتابعة الطلب 🎓</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1 flex flex-wrap items-center justify-between gap-1">
                      <span>رقم المحفظة المحوّل منها <span className="text-slate-400 font-normal">(في حالة تم التحويل من رقم آخر/صديق/والدك)</span></span>
                      <span className="text-[10px] text-indigo-300 font-mono">Sender Wallet Phone</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="أدخل رقم المحفظة التي حولت منها (أو اتركه فارغاً إذا كان نفس رقمك)"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1 flex flex-wrap items-center justify-between gap-1">
                      <span>الرقم المرجعي للمعاملة / رقم العملية <span className="text-rose-500 font-black">* (إجباري)</span></span>
                      <span className="text-[10px] text-amber-400 font-mono">Ref# / Transaction ID</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل الرقم المرجعي أو رقم العملية (مثال: Ref# 8554632e أو 123456789)"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/60 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-xs sm:text-sm font-mono shadow-inner shadow-amber-500/5"
                    />
                  </div>

                  {/* Receipt Screenshot Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1">
                      رفع صورة إيصال التحويل / سكرين شوت الدفع 📸 <span className="text-slate-400 font-normal">(مستحسن لتأكيد فوري)</span>
                    </label>

                    {receiptPreview ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
                        <img src={receiptPreview} alt="Receipt preview" className="w-16 h-16 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {isUploadingReceipt ? (
                            <p className="text-xs text-amber-400 font-bold animate-pulse">جاري رفع الإيصال لـ Supabase...</p>
                          ) : (
                            <p className="text-xs text-emerald-400 font-bold">✅ تم مرفق صورة الإيصال جاهز للطلب</p>
                          )}
                          <p className="text-[10px] text-slate-400 truncate">{receiptFile?.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setReceiptFile(null); setReceiptPreview(''); setReceiptUrl(''); }}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/60 cursor-pointer transition text-center space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-slate-300 font-medium">اضغط لرفع صورة إيصال التحويل (معاينة فورية)</span>
                        <span className="text-[10px] text-slate-500">يقبل الصور بصيغة JPG, PNG</span>
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingOrder || isUploadingReceipt}
                    className="w-full py-4 px-6 rounded-2xl gradient-purple-btn text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 disabled:opacity-50 transition-all mt-4"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        <span>جاري إرسال الطلب...</span>
                      </>
                    ) : (
                      <>
                        <span>تأكيد وإرسال الطلب الآن ({cartTotal} ج.م)</span>
                        <Send className="w-5 h-5 rotate-180" />
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Right Column (On Desktop): Cart Items & Order Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
              
              <div className="glass-modal rounded-3xl p-5 sm:p-6 border border-slate-700/80 space-y-4 shadow-xl">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" />
                    <span>ملخص المنتجات المطلوبة ({cart.length})</span>
                  </h3>
                  <button
                    onClick={() => router.push('/')}
                    className="text-xs text-amber-400 font-bold hover:underline"
                  >
                    + تعديل أو إضافة منتجات
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    const addonsExtra = item.selectedAddons ? item.selectedAddons.reduce((s, a) => s + (a.price || 0), 0) : 0;
                    const itemUnitPrice = item.product.price + addonsExtra;
                    const itemTotalPrice = itemUnitPrice * item.quantity;

                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize || 'nosize'}-${idx}`}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={item.product.image_url}
                            alt={item.product.title_ar}
                            className="w-14 h-14 rounded-xl object-cover bg-slate-950 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                              {item.product.title_ar || item.product.title}
                            </h4>
                            {item.selectedSize && (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                                المقاس: {item.selectedSize}
                              </span>
                            )}
                            {item.customText && (
                              <p className="text-[10px] text-amber-300 font-medium truncate">
                                ✨ التطريز: &quot;{item.customText}&quot;
                              </p>
                            )}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <div className="text-[10px] text-indigo-300 space-y-0.5">
                                {item.selectedAddons.map(a => (
                                  <p key={a.id}>➕ {a.name} (+{a.price} ج.م)</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                          <span className="font-extrabold text-indigo-400 dir-ltr">
                            {itemUnitPrice} ج.م × {item.quantity} = {itemTotalPrice} ج.م
                          </span>

                          <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, -1)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-white px-1.5">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(idx, 1)}
                              className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 pt-3">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>مجموع المنتجات:</span>
                    <span>{cartTotal} ج.م</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>مكان التسليم:</span>
                    <span className="text-amber-400 font-semibold">{settings.pickup_note}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm sm:text-base font-black pt-2 border-t border-slate-800">
                    <span className="text-white">المبلغ الكلي المطلوب:</span>
                    <span className="gradient-gold-text text-xl sm:text-2xl">{cartTotal} ج.م</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>

    </div>
  );
}
