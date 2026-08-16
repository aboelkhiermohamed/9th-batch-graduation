'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order, StoreSettings } from '@/types';
import { fetchOrdersFromSupabase, fetchSettingsFromSupabase, updateOrderInSupabase } from '@/lib/supabaseClient';
import { matchOrderWithUnmatchedTransactions } from '@/lib/matchingEngine';
import { 
  ArrowRight, 
  CreditCard, 
  Smartphone, 
  Check, 
  Copy, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileCheck,
  Package
} from 'lucide-react';

export default function PayDifferencePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [paymentMethod, setPaymentMethod] = useState<'vodafone_cash' | 'instapay'>('vodafone_cash');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [orders, storeSettings] = await Promise.all([
        fetchOrdersFromSupabase(),
        fetchSettingsFromSupabase()
      ]);

      setSettings(storeSettings);

      const foundOrder = orders.find(
        o => o.id === orderId || o.order_code === orderId || o.order_code === `GRAD-${orderId}`
      );

      if (foundOrder) {
        setOrder(foundOrder);
        setSenderPhone(foundOrder.sender_phone || foundOrder.customer_phone || '');
        if (foundOrder.payment_method) setPaymentMethod(foundOrder.payment_method);
      }
      setIsLoading(false);
    };

    if (orderId) {
      loadData();
    }
  }, [orderId]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!transactionRef.trim()) {
      alert('يرجى إدخال الرقم المرجعي أو رقم المعاملة بعد تحويل المبلغ');
      return;
    }

    setIsUploading(true);
    try {
      let receiptUrl = order.receipt_url;

      if (receiptFile && receiptPreview) {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file: receiptPreview,
              fileName: `partial-receipt-${order.order_code}-${Date.now()}.jpg`
            })
          });
          const data = await res.json();
          if (data.url) receiptUrl = data.url;
        } catch (e) {
          console.warn('Receipt upload failed fallback to data url');
        }
      }

      const updatedOrder: Order = {
        ...order,
        transaction_ref: transactionRef.trim(),
        sender_phone: senderPhone.trim() || order.customer_phone,
        receipt_url: receiptUrl,
        updated_at: new Date().toISOString()
      };

      // Trigger automatic matching engine for the newly submitted difference payment
      await matchOrderWithUnmatchedTransactions(updatedOrder);

      await updateOrderInSupabase(updatedOrder);
      setIsSubmitted(true);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ بيانات الدفع');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-400">جاري تحميل بيانات الفاتورة الجزئية...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">عفواً، لم يتم العثور على الطلب المطلوب</h2>
          <p className="text-xs text-slate-400">يرجى التأكد من رابط الفاتورة أو العودة لطلباتك</p>
          <button
            onClick={() => router.push('/profile?tab=orders')}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
          >
            العودة لطلباتي
          </button>
        </div>
      </div>
    );
  }

  const remainingBalance = (order.difference_amount && order.difference_amount > 0)
    ? order.difference_amount
    : Math.max(0, order.total_amount - (order.paid_amount || 0));

  const vodaFeePercent = Number(settings?.vodafone_cash_fee_percent || 0);
  const rawVodaFee = paymentMethod === 'vodafone_cash' && vodaFeePercent > 0 
    ? (remainingBalance * vodaFeePercent) / 100 
    : 0;
  const vodaFee = Math.ceil(rawVodaFee);
  const finalPayableDiff = paymentMethod === 'vodafone_cash' ? (remainingBalance + vodaFee) : remainingBalance;

  const vodaNums = settings?.vodafone_cash_numbers && settings.vodafone_cash_numbers.length > 0
    ? settings.vodafone_cash_numbers
    : ['01015339426'];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">تم إرسال بيانات سداد فرق السعر بنجاح! 🎉</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            تم تسجيل الرقم المرجعي <strong className="text-amber-400 font-mono">#{transactionRef}</strong> وسيتولى النظام مطابقة التحويل تلقائياً أو تأكيده فوراً.
          </p>
          <button
            onClick={() => router.push('/profile?tab=orders')}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20"
          >
            متابعة حالة الطلب في حسابي 🔍
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <button
            onClick={() => router.push('/profile?tab=orders')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-200 transition"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>العودة لطلباتي</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 px-2 rounded-xl bg-purple-950/70 border border-lime-500/30 flex items-center justify-center flex-shrink-0">
              <img src="/logo-removebg-preview.png" alt="The Medix Logo" className="h-6 w-auto object-contain" />
            </div>
            <div className="text-right">
              <h1 className="text-xs sm:text-base font-bold text-lime-400">فاتورة سداد فرق السعر</h1>
              <p className="text-[10px] text-slate-300 font-mono">الطلب #{order.order_code}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Order Edits Banner */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">تفاصيل تعديل الطلب وفارق السعر</h2>
              <p className="text-xs text-slate-400">العميل: {order.customer_name} ({order.customer_phone})</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">المبلغ المدفوع سابقاً</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{order.paid_amount || 0} ج.م</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1">إجمالي الطلب الجديد</span>
              <span className="text-lg font-mono font-bold text-white">{order.total_amount} ج.م</span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] text-amber-400 block mb-1 font-bold">المبلغ المتبقي المطلوب سداده</span>
              <span className="text-2xl font-mono font-black text-amber-400">{finalPayableDiff} ج.م</span>
            </div>
          </div>
        </div>

        {/* Transfer Instructions & Payment Form */}
        <div className="p-5 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <span>تحويل المتبقي وإدخال الرقم المرجعي</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">قم بتحويل المبلغ المتبقي ({finalPayableDiff} ج.م) ثم أدخل رقم المعاملة المرجعي لتأكيد الطلب</p>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('vodafone_cash')}
              className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border transition-all ${
                paymentMethod === 'vodafone_cash'
                  ? 'bg-red-500/10 border-red-500/80 text-red-300 shadow-md shadow-red-500/10 ring-1 ring-red-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
              </div>
              <span>فودافون كاش (Vodafone Cash)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('instapay')}
              className={`p-3.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 border transition-all ${
                paymentMethod === 'instapay'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-md shadow-purple-600/10 ring-1 ring-purple-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 flex-shrink-0"></span>
              <span>إنستا باي (InstaPay)</span>
            </button>
          </div>

          {/* Vodafone Cash Lines */}
          {paymentMethod === 'vodafone_cash' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                    <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                  </div>
                  <span>حول الفرق المطلوب على أحد الخطوط التالية:</span>
                </span>
              </div>

              <div className="space-y-2">
                {vodaNums.map((num, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="font-mono text-base font-bold text-white dir-ltr">{num}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(num, `num-${idx}`)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
                    >
                      {copiedText === `num-${idx}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === `num-${idx}` ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmitPartialPayment} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                رقم المحفظة المحول منها <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                الرقم المرجعي للمعاملة / رقم العملية <span className="text-rose-500">* (إجباري)</span>
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                placeholder="مثال: Ref# 026658191090"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-amber-500/50 text-white font-mono text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                رفع سكرين شوت الدفع / إيصال تحويل الفرق 📸
              </label>
              {receiptPreview ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <img src={receiptPreview} alt="Receipt preview" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-emerald-400 font-bold">✅ تم إرفاق صورة إيصال الدفع</p>
                    <p className="text-[10px] text-slate-400 truncate">{receiptFile?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(''); }}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 hover:border-amber-500/50 cursor-pointer transition text-center space-y-1">
                  <input type="file" accept="image/*" onChange={handleReceiptChange} className="hidden" />
                  <Upload className="w-5 h-5 text-amber-400" />
                  <span className="text-xs text-slate-300 font-medium">اضغط لرفع صورة إيصال التحويل</span>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 transition"
            >
              {isUploading ? (
                <span>جاري حفظ وتوثيق السداد...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد وإرسال سداد فرق السعر ({finalPayableDiff} ج.م)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
