'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from '@/components/AuthModal';
import { isValidEgyptianPhone } from '@/lib/smsParser';
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
  Minus,
  Lock,
  Wrench
} from 'lucide-react';
import { CartItem, Order, PaymentMethod, StoreSettings, ProductAddon } from '@/types';
import { DEFAULT_SETTINGS, cleanDisplayNotes } from '@/lib/supabaseClient';

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
          if (setts) {
            setSettings(setts);
            if (!Boolean(setts.vodafone_cash_enabled) && Boolean(setts.instapay_enabled)) {
              setPaymentMethod('instapay');
            } else if (Boolean(setts.vodafone_cash_enabled)) {
              setPaymentMethod('vodafone_cash');
            }
          }
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

  // Real-time live polling for order verification status when createdOrder exists
  useEffect(() => {
    let interval: any;
    if (createdOrder && createdOrder.id) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders?id=${createdOrder.id}`);
          if (res.ok) {
            const updated = await res.json();
            if (updated && updated.status && updated.status !== createdOrder.status) {
              setCreatedOrder(updated);
              if (updated.status === 'auto_verified' || updated.status === 'manual_verified') {
                fireConfetti();
              }
            }
          }
        } catch (e) {
          console.warn('Polling status error', e);
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [createdOrder]);

  // Cart total & Vodafone Cash fee calculations
  const cartTotal = cart.reduce((acc, item) => {
    const addonsPrice = item.selectedAddons ? item.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0) : 0;
    return acc + (item.product.price + addonsPrice) * item.quantity;
  }, 0);

  const vodaFeePercent = Number(settings.vodafone_cash_fee_percent || 0);
  const rawVodaFee = paymentMethod === 'vodafone_cash' && vodaFeePercent > 0 
    ? (cartTotal * vodaFeePercent) / 100 
    : 0;
  const vodaFee = Math.ceil(rawVodaFee);
  const finalPayableTotal = paymentMethod === 'vodafone_cash' ? (cartTotal + vodaFee) : cartTotal;

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Remove item helper
  const handleRemoveItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

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
      } else {
        // Fallback to Base64 if upload endpoint returned error
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setReceiptUrl(evt.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Receipt upload fallback to Base64:', err);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setReceiptUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (settings.maintenance_mode) {
      const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
      if (!isAdmin) {
        alert('عفواً، المتجر في وضع الصيانة والتحديث حالياً، تم تعليق استقبال الطلبات الجديدة مؤقتاً.');
        return;
      }
    }

    if (cart.length === 0) {
      alert('السلة فارغة، يرجى إضافة منتجات أولاً');
      return;
    }

    const finalPhone = (customerSession?.phone_number || customerPhone).trim();

    if (!customerName.trim() || !finalPhone || !transactionRef.trim()) {
      alert('يرجى إدخال اسم العميل ورقم الموبايل والرقم المرجعي للعملية');
      return;
    }

    if (!isValidEgyptianPhone(finalPhone)) {
      alert('عفواً، رقم الموبايل غير صحيح! يرجى إدخال رقم موبايل مصري صحيح يبدأ بـ (010, 011, 012, 015) ومكون من 11 رقماً');
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
          customerPhone: finalPhone,
          senderPhone: senderPhone.trim() || finalPhone,
          transactionRef: transactionRef.trim(),
          paymentMethod,
          receiptUrl: receiptUrl || undefined,
          items: orderItems,
          totalAmount: finalPayableTotal,
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

  // --- MAINTENANCE MODE PROTECTION ---
  if (settings.maintenance_mode) {
    const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto animate-pulse">
              <Wrench className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">المتجر في وضع التحديث والصيانة حالياً 🚧</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              نقوم حالياً بإجراء صيانة مجدولة وتحديثات للمتجر وحصر الطلبات. تم تعليق استقبال الطلبات الجديدة مؤقتاً، سنعود للعمل بكامل طاقتنا قريباً جداً!
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl transition"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      );
    }
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
              {createdOrder.status === 'auto_verified' || createdOrder.status === 'manual_verified' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 shadow-lg shadow-emerald-500/20 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{createdOrder.status === 'auto_verified' ? '🤖 تم التأكيد تلقائياً' : '✅ تم التأكيد والتجهيز'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>معلق وفي انتظار التأكيد (جاري التحديث تلقائياً...)</span>
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
              onClick={() => router.push('/profile?tab=orders')}
              className="flex-1 py-3.5 px-6 rounded-2xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>متابعة وتتبع حالة الطلب 🔍</span>
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
      <header className="sticky top-0 z-40 bg-purple-950/90 backdrop-blur-xl border-b border-purple-900/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-900 border border-purple-700/60 text-xs sm:text-sm font-bold text-slate-200 transition-all flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-lime-400" />
            <span className="hidden xs:inline">العودة للمتجر</span>
            <span className="xs:hidden">عودة</span>
          </button>

          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
            <img 
              src="/logo-removebg-preview.png" 
              alt="themedix" 
              className="h-8 sm:h-11 w-auto object-contain flex-shrink-0 filter drop-shadow-[0_0_12px_rgba(142,208,0,0.35)]" 
            />
            <div className="hidden md:block text-right">
              <h1 className="text-sm font-black text-white">تأكيد الدفع وإرسال الطلب</h1>
              <p className="text-[11px] text-lime-300 font-semibold">الدفعة التاسعة 🎓</p>
            </div>
          </div>

          {/* Cart Items Count Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-300 text-xs font-bold flex-shrink-0">
            <ShoppingBag className="w-3.5 h-3.5 text-lime-400" />
            <span>{totalCartCount}</span>
            <span className="hidden sm:inline">منتجات</span>
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
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all"
            >
              تسجيل الدخول / إنشاء حساب جديد الان 👤
            </button>

            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={(cust) => {
                setCustomerSession(cust);
                if (cust.full_name) setCustomerName(cust.full_name);
                if (cust.phone_number) setCustomerPhone(cust.phone_number);
              }}
            />
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
                    {finalPayableTotal} <span className="text-amber-400 text-lg sm:text-xl">ج.م</span>
                  </span>
                </div>

                {/* Payment Method Selector Tabs */}
                {(() => {
                  const isVodaEnabled = Boolean(settings.vodafone_cash_enabled);
                  const isInstaEnabled = Boolean(settings.instapay_enabled);
                  const vodaNums = settings.vodafone_cash_numbers && settings.vodafone_cash_numbers.length > 0
                    ? settings.vodafone_cash_numbers
                    : ['01015339426'];
                  const instaAccounts = settings.instapay_ipas && settings.instapay_ipas.length > 0
                    ? settings.instapay_ipas
                    : [settings.instapay_ipa || '9thbatch@instapay'];

                  if (!isVodaEnabled && !isInstaEnabled) {
                    return (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold text-center">
                        ⚠️ الدفع الإلكتروني معطل حالياً بشكل مؤقت في المتجر. يرجى المتابعة مع خدمة العملاء.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Tabs */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                        {isVodaEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('vodafone_cash')}
                            className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border transition-all ${
                              paymentMethod === 'vodafone_cash'
                                ? 'bg-red-500/10 border-red-500/80 text-red-300 shadow-md shadow-red-500/10 ring-1 ring-red-500/30'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-5 h-5 object-contain flex-shrink-0" />
                            <span>فودافون كاش (Vodafone Cash)</span>
                          </button>
                        )}

                        {isInstaEnabled && (
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('instapay')}
                            className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border transition-all ${
                              paymentMethod === 'instapay'
                                ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-600/10 ring-1 ring-purple-500/30'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 flex-shrink-0"></span>
                            <span>إنستا باي (InstaPay)</span>
                          </button>
                        )}
                      </div>

                      {/* Transfer Numbers/Accounts Display Box */}
                      {paymentMethod === 'vodafone_cash' && isVodaEnabled && (
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-4 h-4 object-contain" />
                              <span>حول المبلغ المطلوب على أحد خطوط فودافون كاش التالية:</span>
                            </span>
                            <span className="text-red-400 font-semibold flex-shrink-0">خطوط الاستلام ({vodaNums.length})</span>
                          </div>

                          <div className="space-y-2">
                            {vodaNums.map((num, idx) => {
                              const lineLabel = settings.line_labels?.[num] || `خط ${idx + 1}`;
                              return (
                                <div key={idx} className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30 flex-shrink-0">
                                      {lineLabel}
                                    </span>
                                    <span className="text-base sm:text-lg font-mono font-extrabold text-white tracking-wider truncate dir-ltr select-all">
                                      {num}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(num, `voda-${idx}`)}
                                    className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex-shrink-0"
                                  >
                                    {copiedText === `voda-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copiedText === `voda-${idx}` ? 'تم النسخ' : 'نسخ الرقم'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'instapay' && isInstaEnabled && (
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>حول المبلغ المطلوب على أحد حسابات InstaPay التالية:</span>
                            <span className="text-purple-400 font-semibold flex-shrink-0">InstaPay ({instaAccounts.length})</span>
                          </div>

                          <div className="space-y-2">
                            {instaAccounts.map((acc, idx) => (
                              <div key={idx} className="flex flex-wrap xs:flex-nowrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                <span className="text-sm sm:text-base font-mono font-bold text-white truncate dir-ltr select-all">
                                  {acc}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(acc, `insta-${idx}`)}
                                  className="w-full xs:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex-shrink-0"
                                >
                                  {copiedText === `insta-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedText === `insta-${idx}` ? 'تم النسخ' : 'نسخ الحساب'}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                        <span>تأكيد وإرسال الطلب الآن ({finalPayableTotal} ج.م)</span>
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
                    const baseProductPrice = item.product.price;
                    const itemUnitPrice = baseProductPrice + addonsExtra;
                    const itemTotalPrice = itemUnitPrice * item.quantity;

                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize || 'nosize'}-${idx}`}
                        className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3 shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={item.product.image_url}
                            alt={item.product.title_ar || item.product.title}
                            className="w-16 h-16 rounded-xl object-cover bg-slate-950 flex-shrink-0 border border-slate-800"
                          />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                {item.product.title_ar || item.product.title}
                              </h4>
                              {item.selectedSize && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold border border-amber-500/30 flex-shrink-0">
                                  المقاس: {item.selectedSize}
                                </span>
                              )}
                            </div>

                            {/* Base price hint */}
                            <p className="text-[11px] text-slate-400 font-medium">
                              سعر القطعة الأساسي: <span className="text-slate-200 font-mono font-bold">{baseProductPrice} ج.م</span>
                            </p>

                            {/* Embroidery Customization Badge */}
                            {item.customText && (
                              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                                <span className="font-bold text-amber-400">✨ الاسم للتطريز:</span> &quot;{item.customText}&quot;
                              </div>
                            )}

                            {/* Selected Addons Breakdown */}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                                <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">💎 الإضافات المختارة:</span>
                                {item.selectedAddons.map(a => (
                                  <div key={a.id} className="flex justify-between text-[11px] text-slate-300">
                                    <span>+ {a.name}</span>
                                    <span className="font-mono text-emerald-300 font-bold">+{a.price} ج.م</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quantity and Line Total Bar */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400 block">إجمالي القطعة:</span>
                            <span className="font-extrabold text-indigo-300 font-mono text-sm">
                              {itemTotalPrice} ج.م <span className="text-[10px] text-slate-500 font-sans font-normal">({item.quantity} × {itemUnitPrice} ج.م)</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all"
                              title="حذف المنتج من السلة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-1 bg-slate-950 rounded-xl p-1 border border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, -1)}
                                className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition"
                                title="إنقاص الكمية"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-mono font-bold text-white px-2">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, 1)}
                                className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition"
                                title="زيادة الكمية"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 pt-3 shadow-lg">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>مجموع المنتجات والإضافات:</span>
                    <span className="font-mono font-bold text-slate-200">{cartTotal} ج.م</span>
                  </div>

                  {paymentMethod === 'vodafone_cash' && vodaFee > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-lime-300 bg-purple-950/60 p-2.5 rounded-xl border border-lime-500/30 gap-2">
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                          <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                        </div>
                        <span>رسوم تحويل فودافون كاش ({vodaFeePercent}%):</span>
                      </span>
                      <span className="font-mono text-xs sm:text-sm text-lime-400 whitespace-nowrap flex-shrink-0">+{vodaFee} ج.م</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>مكان الاستلام والتسليم:</span>
                    <span className="text-lime-300 font-semibold">{cleanDisplayNotes(settings.pickup_note)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm sm:text-base font-black pt-3 border-t border-slate-800 gap-2">
                    <span className="text-white whitespace-nowrap">المبلغ الكلي المطلوب تحويله:</span>
                    <span className="gradient-gold-text text-xl sm:text-2xl font-mono whitespace-nowrap flex-shrink-0">{finalPayableTotal} ج.م</span>
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
