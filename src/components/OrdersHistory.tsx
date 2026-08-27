'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  RefreshCw, 
  ShoppingBag, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  Printer, 
  Copy, 
  Check, 
  MessageSquare, 
  Sparkles, 
  Search, 
  X, 
  ExternalLink,
  MapPin,
  CreditCard,
  Phone,
  User,
  ShieldCheck,
  Tag,
  Eye,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Ticket,
  Send
} from 'lucide-react';
import { Order, OrderItem, EventAttendee } from '@/types';

interface OrdersHistoryProps {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
  productsMap?: Record<string, any>;
  storePickupNote?: string;
  supportPhone?: string;
}

export default function OrdersHistory({
  orders,
  isLoading,
  onRefresh,
  productsMap = {},
  storePickupNote,
  supportPhone = '01555583154'
}: OrdersHistoryProps) {
  const router = useRouter();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'ready' | 'delivered'>('all');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [copiedTelegramOrderId, setCopiedTelegramOrderId] = useState<string | null>(null);

  // Telegram Support Modal State
  const [telegramModalData, setTelegramModalData] = useState<{
    orderCode: string;
    customerName: string;
    phone: string;
    total: number;
    messageText: string;
    groupUrl: string;
  } | null>(null);
  const [isCopiedInModal, setIsCopiedInModal] = useState(false);

  // Attendees Edit Modal State
  const [editingAttendeesTarget, setEditingAttendeesTarget] = useState<{
    order: Order;
    item: OrderItem;
    attendeesList: EventAttendee[];
  } | null>(null);
  const [isSavingAttendees, setIsSavingAttendees] = useState(false);

  React.useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const handleOpenAttendeesModal = (order: Order, item: OrderItem) => {
    const qty = item.quantity || 1;
    const initial: EventAttendee[] = [];
    for (let i = 0; i < qty; i++) {
      if (item.attendees && item.attendees[i]) {
        initial.push({ name: item.attendees[i].name || '', phone: item.attendees[i].phone || '', gender: item.attendees[i].gender || 'male' });
      } else if (i === 0) {
        initial.push({ name: order.customer_name || '', phone: order.customer_phone || '', gender: 'male' });
      } else {
        initial.push({ name: '', phone: '', gender: 'male' });
      }
    }
    setEditingAttendeesTarget({ order, item, attendeesList: initial });
  };

  const handleSaveAttendeesModal = async () => {
    if (!editingAttendeesTarget) return;
    const missingIdx = editingAttendeesTarget.attendeesList.findIndex(a => !a.name.trim());
    if (missingIdx > -1) {
      alert(`يرجى كتابة اسم الحاضر للتذكرة رقم ${missingIdx + 1}`);
      return;
    }

    setIsSavingAttendees(true);
    try {
      const res = await fetch('/api/orders/update-attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: editingAttendeesTarget.order.id,
          order_code: editingAttendeesTarget.order.order_code,
          item_id: editingAttendeesTarget.item.id,
          attendees: editingAttendeesTarget.attendeesList
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setLocalOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
          onRefresh();
        }
        setEditingAttendeesTarget(null);
        alert('تم حفظ وإصدار أسماء الحاضرين بنجاح! 🎉');
      } else {
        alert('فشل حفظ أسماء الحاضرين');
      }
    } catch (e) {
      alert('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSavingAttendees(false);
    }
  };

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [fetchedMap, setFetchedMap] = useState<Record<string, any>>({});

  // Auto-fetch products if productsMap prop is empty
  React.useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const map: Record<string, any> = {};
            list.forEach(p => { map[p.id] = p; });
            setFetchedMap(map);
          }
        }
      } catch (e) {}
    }
    loadProducts();
  }, []);

  const mergedMap = { ...fetchedMap, ...productsMap };

  // Helper to find product image with smart multi-tier fallbacks
  const getProductImage = (item: OrderItem): string => {
    if (item.image_url) return item.image_url;
    if (item.product?.image_url) return item.product.image_url;
    if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
      return item.product.images[0];
    }
    
    // Fallback 1: By Product ID in mergedMap
    const mapProd = mergedMap[item.product_id];
    if (mapProd) {
      if (mapProd.image_url) return mapProd.image_url;
      if (Array.isArray(mapProd.images) && mapProd.images.length > 0) return mapProd.images[0];
    }

    // Fallback 2: Clean Title Search in mergedMap values
    const rawTitle = (item.product_title || '').replace(/^[\s\.\-]+/, '').trim().toLowerCase();
    const titleMatch = Object.values(mergedMap).find(p => {
      const pTitle = (p.title_ar || p.title || '').replace(/^[\s\.\-]+/, '').trim().toLowerCase();
      return pTitle === rawTitle || rawTitle.includes(pTitle) || pTitle.includes(rawTitle);
    });

    if (titleMatch) {
      if (titleMatch.image_url) return titleMatch.image_url;
      if (Array.isArray(titleMatch.images) && titleMatch.images.length > 0) return titleMatch.images[0];
    }

    // Fallback 3: Category / Keyword Curated High-Res Graduation Artwork
    if (rawTitle.includes('نوت') || rawTitle.includes('دفتر') || rawTitle.includes('notebook')) {
      return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
    }
    if (rawTitle.includes('ماج') || rawTitle.includes('كوب') || rawTitle.includes('mug')) {
      return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80';
    }

    // Default Graduation Apparel / Jacket Image
    return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80';
  };

  // Copy order code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter orders logic
  const filteredOrders = localOrders.filter(order => {
    // Status filter
    if (statusFilter === 'verified' && order.status !== 'auto_verified' && order.status !== 'manual_verified') return false;
    if (statusFilter === 'pending' && order.status !== 'pending') return false;
    if (statusFilter === 'ready' && order.status !== 'ready_for_pickup') return false;
    if (statusFilter === 'delivered' && order.status !== 'delivered') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = order.order_code.toLowerCase().includes(q);
      const nameMatch = order.customer_name.toLowerCase().includes(q);
      const phoneMatch = order.customer_phone.includes(q);
      const refMatch = (order.transaction_ref || '').toLowerCase().includes(q);
      const itemMatch = order.items?.some(i => i.product_title.toLowerCase().includes(q));

      return codeMatch || nameMatch || phoneMatch || refMatch || itemMatch;
    }

    return true;
  });

  // Calculate KPIs
  const totalOrdersCount = orders.length;
  const verifiedCount = orders.filter(o => o.status === 'auto_verified' || o.status === 'manual_verified' || o.status === 'ready_for_pickup' || o.status === 'delivered').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  // Status Stepper Helper (0 to 4)
  const getOrderStep = (status: string): number => {
    switch (status) {
      case 'pending': return 1;
      case 'auto_verified':
      case 'manual_verified': return 2;
      case 'ready_for_pickup': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -1;
      default: return 1;
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm shadow-emerald-500/10">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم تأكيد الدفع بنجاح</span>
          </span>
        );
      case 'manual_verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مؤكد يدويًا من الادارة</span>
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-sm shadow-indigo-500/10">
            <Package className="w-3.5 h-3.5 text-indigo-400" />
            <span>جاهز للاستلام بالمقر</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>تم التسليم بنجاح 🎓</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
            <X className="w-3.5 h-3.5" />
            <span>ملغي</span>
          </span>
        );
      case 'pending_difference':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>مطلوب سداد فرق السعر 💳</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm shadow-amber-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تم التسجيل • جاري مراجعة التحويل ⏳</span>
          </span>
        );
    }
  };

  // Print Invoice Function
  const handlePrintInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (order.items || []).map((item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; text-align: right;">
          <strong>${item.product_title}</strong>
          ${item.selected_size ? `<br><small style="color: #64748b;">المقاس: ${item.selected_size}</small>` : ''}
          ${item.custom_text ? `<br><small style="color: #d97706;">التطريز: "${item.custom_text}"</small>` : ''}
          ${item.customization_option ? `<br><small style="color: #059669;">الإضافات: ${item.customization_option}</small>` : ''}
          ${item.attendees && item.attendees.length > 0 ? `<br><small style="color: #6366f1;"><strong>أسماء الحاضرين والتذاكر:</strong> ${item.attendees.map(a => a.name + (a.phone ? ` (${a.phone})` : '')).join('، ')}</small>` : ''}
        </td>
        <td style="padding: 12px; text-align: center; font-weight: bold;">${item.quantity}</td>
        <td style="padding: 12px; text-align: left;">${item.unit_price} ج.م</td>
        <td style="padding: 12px; text-align: left; font-weight: bold;">${item.unit_price * item.quantity} ج.م</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة طلب #${order.order_code}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
          .badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f1f5f9; padding: 12px; text-align: right; font-size: 13px; color: #475569; }
          .total-box { text-align: left; font-size: 18px; font-weight: bold; padding: 15px; background: #0f172a; color: #fff; border-radius: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; gap: 15px;">
            <img src="/logo-removebg-preview.png" alt="themedix" style="height: 44px; width: auto; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));" />
            <div>
              <h1 style="margin:0; font-size: 22px; font-family: sans-serif; display: flex; align-items: baseline; gap: 2px;">
                <span style="font-style: italic; font-family: serif; font-weight: bold; color: #65a30d;">the</span>
                <span style="font-weight: bold; color: #0f172a; text-transform: lowercase;">medix</span>
              </h1>
              <p style="margin:2px 0 0; color: #64748b; font-size: 13px; font-weight: 600;">فاتورة شراء وتأكيد طلب رسمية - الدفعة التاسعة 🎓</p>
            </div>
          </div>
          <div style="text-align: left;">
            <h2 style="margin:0; color: #65a30d; font-family: monospace; font-size: 20px;">#${order.order_code}</h2>
            <p style="margin:4px 0 0; color: #64748b; font-size: 12px;">${formatDate(order.created_at)}</p>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <p style="margin:0; color:#64748b; font-size: 12px;">اسم العميل:</p>
            <p style="margin:4px 0 0; font-weight: bold;">${order.customer_name}</p>
          </div>
          <div>
            <p style="margin:0; color:#64748b; font-size: 12px;">رقم الموبايل:</p>
            <p style="margin:4px 0 0; font-weight: bold; font-family: monospace;">${order.customer_phone}</p>
          </div>
          <div>
            <p style="margin:0; color:#64748b; font-size: 12px;">طريقة الدفع:</p>
            <p style="margin:4px 0 0; font-weight: bold;">${order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'انستا باي InstaPay'}</p>
          </div>
          <div>
            <p style="margin:0; color:#64748b; font-size: 12px;">رقم المعاملة/المرجع:</p>
            <p style="margin:4px 0 0; font-weight: bold; font-family: monospace;">${order.transaction_ref || 'غير مدخل'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>المنتج ومواصفاته</th>
              <th style="text-align:center;">الكمية</th>
              <th style="text-align:left;">سعر الوحدة</th>
              <th style="text-align:left;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total-box">
          المجموع الإجمالي: ${order.total_amount} ج.م
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER & REFRESH BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-inner">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
              <span>سجل طلباتي</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-mono font-bold border border-slate-700">
                {orders.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">متابعة دقيقة لجميع الطلبات وحالة الدفع والتسليم</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="self-stretch sm:self-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>تحديث الطلبات</span>
        </button>
      </div>

      {/* 2. SUMMARY KPI BAR - REASSURING & CRYSTAL CLEAR REDESIGN */}
      {orders.length > 0 && (
        <div className="space-y-3.5">
          {/* Active Pending Order Reassurance Banner if any */}
          {pendingCount > 0 && (
            <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-2">
                    <span>طلبك مسجل ومحجوز بنجاح! 🟢 (جاري مطابقة رقم التحويل)</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    النظام يقوم بمطابقة تحويلك التلقائي الآن خلال دقائق. طلبك محفوظ في المتجر ولا تحتاج لإعادة الطلب.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Orders Card */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800/90 hover:border-indigo-500/40 transition-all duration-300 shadow-lg relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition"></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">📦 الطلبات المسجلة</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white font-mono">{totalOrdersCount}</span>
                <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                  طلب مسجل
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">إجمالي عدد طلباتك بالحساب</p>
            </div>

            {/* Pending Verification Card */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-amber-500/40 hover:border-amber-500/70 transition-all duration-300 shadow-lg shadow-amber-500/5 relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/25 transition"></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400">⏳ قيد التأكيد التلقائي</span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</span>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {pendingCount > 0 ? 'جاري التحقق ⏳' : 'لا يوجد'}
                </span>
              </div>
              <p className="text-[10px] text-amber-500/90 mt-1 font-medium">محفوظة وجاري مراجعة الإيداع</p>
            </div>

            {/* Confirmed Orders Card */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800/90 hover:border-emerald-500/40 transition-all duration-300 shadow-lg relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition"></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400">✅ طلبات تم تأكيدها</span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-400 font-mono">{verifiedCount}</span>
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  {verifiedCount > 0 ? 'مؤكد 🟢' : 'في الانتظار'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">تم تأكيد الدفع والتجهيز</p>
            </div>

            {/* Total Payments Card */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800/90 hover:border-cyan-500/40 transition-all duration-300 shadow-lg relative overflow-hidden group">
              <div className="absolute -left-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition"></div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">💳 إجمالي قيمة الطلبات</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-cyan-300 font-mono">{totalSpent} <span className="text-xs font-sans text-slate-400">ج.م</span></span>
                <span className="text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">
                  المجموع 💳
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">إجمالي قيمة المشتريات المسجلة</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEARCH & FILTER CONTROLS */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/90">
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'verified', label: 'مؤكد الدفع' },
              { id: 'pending', label: 'قيد التحقق' },
              { id: 'ready', label: 'جاهز للاستلام' },
              { id: 'delivered', label: 'تم التسليم' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث بكود الطلب أو اسم المنتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. ORDERS LIST CONTAINER */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-950/40 rounded-3xl border border-slate-800/60">
          <div className="w-10 h-10 rounded-full border-3 border-amber-400 border-t-transparent animate-spin"></div>
          <p className="text-xs font-bold text-slate-300">جاري تحميل سجل طلباتك المحفوظة...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-4 bg-slate-950/40 rounded-3xl border border-slate-800/60 p-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/5">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-200">لا توجد طلبات مسجلة</h3>
            <p className="text-xs text-slate-400">لم تقم بإجراء أي طلبات باستخدام هذا الرقم حتى الآن</p>
          </div>
          <a
            href="/"
            className="mt-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>تصفح متجر المنتجات واحجز الآن 🎓</span>
          </a>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-3xl border border-slate-800/60 p-6">
          <p className="text-xs font-semibold text-slate-300">لا توجد طلبات تطابق خيارات البحث الحالية</p>
          <button
            onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
            className="mt-3 px-4 py-2 rounded-xl bg-slate-800 text-amber-400 text-xs font-bold hover:bg-slate-700 transition"
          >
            إلغاء التصفية
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const currentStep = getOrderStep(order.status);
            const itemsCount = order.items?.length || 0;

            return (
              <div
                key={order.id}
                className="bg-slate-950 border border-slate-800/90 hover:border-slate-700/90 rounded-3xl overflow-hidden transition-all duration-200 shadow-xl"
              >
                {/* ORDER CARD COLLAPSED HEADER */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-950 hover:bg-slate-900/50 transition"
                >
                  {/* Left info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-base font-extrabold text-amber-400 tracking-wide bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                        #{order.order_code}
                      </span>
                      {renderStatusBadge(order.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>تاريخ الطلب: <strong>{formatDate(order.created_at)}</strong></span>
                      </span>
                      <span className="hidden sm:inline text-slate-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>العدد: <strong>{itemsCount} منتج</strong></span>
                      </span>
                    </div>
                  </div>

                  {/* Right info (Price & Support & Accordion button) */}
                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/70">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">إجمالي الطلب</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {order.total_amount} ج.م
                      </span>
                    </div>

                    {/* Direct Contact Support for this Order */}
                    {(() => {
                      const tgGroupUrl = 'https://t.me/+6VnJtWv5mvpmYjJk';
                      const itemsList = (order.items || []).map(i => `${i.product_title} × ${i.quantity}${i.selected_size ? ` (${i.selected_size})` : ''}`).join('، ');
                      const messageText = `مرحباً إدارة المتجر 👋\nأريد الاستفسار بخصوص الطلب الخاص بي:\n\n📋 كود الطلب: #${order.order_code}\n👤 اسم العميل: ${order.customer_name}\n📱 رقم الموبايل: ${order.customer_phone}\n💳 طريقة الدفع: ${order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'InstaPay'}\n💰 إجمالي المبلغ: ${order.total_amount} ج.م\n📌 الرقم المرجعي: ${order.transaction_ref || '—'}\n🛒 تفاصيل المنتجات: ${itemsList || 'طلب تخرج'}`;

                      const handleSupportClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        try {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(messageText);
                          }
                        } catch(err) {}
                        setTelegramModalData({
                          orderCode: order.order_code,
                          customerName: order.customer_name,
                          phone: order.customer_phone,
                          total: order.total_amount,
                          messageText,
                          groupUrl: tgGroupUrl
                        });
                        setCopiedTelegramOrderId(order.id);
                        setTimeout(() => setCopiedTelegramOrderId(null), 4000);
                      };

                      return (
                        <button
                          type="button"
                          onClick={handleSupportClick}
                          className="px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          title="الانضمام والدخول لجروب التليجرام"
                        >
                          <Send className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden sm:inline">تواصل مع الدعم 💬</span>
                          <span className="sm:hidden">دعم 💬</span>
                        </button>
                      );
                    })()}

                    <button className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition">
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* EXPANDED ORDER DETAILS */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-900/40 space-y-6">
                    
                    {/* PARTIAL INVOICE / PRICE DIFFERENCE PENDING BANNER */}
                    {(order.status === 'pending_difference' || (order.is_difference_pending && order.status !== 'auto_verified' && order.status !== 'manual_verified' && order.status !== 'ready_for_pickup' && order.status !== 'delivered' && (order.difference_amount || 0) > 0)) && (() => {
                      const diffToPay = (order.difference_amount !== undefined && order.difference_amount > 0)
                        ? order.difference_amount
                        : Math.max(0, order.total_amount - (order.paid_amount || 0));
                      const displayPaid = (order.paid_amount !== undefined && order.paid_amount > 0)
                        ? order.paid_amount
                        : Math.max(0, order.total_amount - diffToPay);

                      return (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                          <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div>
                              <h4 className="text-xs font-bold text-amber-300">⚠️ تم تعديل الطلب بواسطة إدارة المتجر (يوجد فرق سعر مستحق)</h4>
                              <p className="text-[11px] text-slate-300">
                                المبلغ المدفوع سابقاً: <span className="font-mono text-emerald-400 font-bold">{displayPaid} ج.م</span> | فرق السعر المطلوب سداده الآن: <span className="font-mono text-amber-400 font-black">{diffToPay} ج.م</span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => router.push(`/pay-difference/${order.id}`)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 flex-shrink-0"
                          >
                            <span>سداد فرق السعر الآن 💳</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* A. STATUS STEPPER PROGRESS TIMELINE */}
                    {order.status !== 'cancelled' && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                        <span className="text-xs font-bold text-slate-300 block">مراحل تتبع الطلب:</span>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                          {[
                            { step: 1, label: '1. تقديم الطلب', desc: 'تم التسجيل' },
                            { step: 2, label: '2. تأكيد الدفع', desc: order.status === 'pending' ? 'جاري التحقق' : 'تم التأكيد' },
                            { step: 3, label: '3. جاهز للاستلام', desc: 'بمقر التسليم' },
                            { step: 4, label: '4. تم التسليم', desc: 'اكتمل الطلب' }
                          ].map((st) => {
                            const isPassed = currentStep >= st.step;
                            const isCurrent = currentStep === st.step;

                            return (
                              <div
                                key={st.step}
                                className={`p-2.5 rounded-xl border transition ${
                                  isCurrent
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                                    : isPassed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-900/60 border-slate-800/80 text-slate-500'
                                }`}
                              >
                                <div className="font-bold text-[11px]">{st.label}</div>
                                <div className="text-[10px] opacity-80">{st.desc}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* B. CUSTOMER & PAYMENT DETAILS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-1 font-medium">وسيلة الدفع المحولة</span>
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                          {order.payment_method === 'vodafone_cash' ? (
                            <span className="inline-flex items-center gap-1.5 text-red-300 font-semibold">
                              <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-4 h-4 object-contain" />
                              <span>فودافون كاش (Vodafone Cash)</span>
                            </span>
                          ) : (
                            <span>انستا باي (InstaPay)</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1 font-medium">رقم الموبايل المحول منه</span>
                        <span className="font-bold text-slate-200 font-mono" dir="ltr">
                          {order.sender_phone || order.customer_phone}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1 font-medium">رقم المعاملة / العملية (المرجع)</span>
                        <span className="font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block">
                          {order.transaction_ref || 'غير مدخل'}
                        </span>
                      </div>

                      {order.confirmed_line && (
                        <div className="sm:col-span-3 pt-2 border-t border-slate-800/60 text-slate-300 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>الخط المؤكِّد للاستلام: <strong className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">{order.confirmed_line}</strong></span>
                        </div>
                      )}

                      {storePickupNote && (
                        <div className="sm:col-span-3 pt-2 border-t border-slate-800/60 text-slate-300 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span>تعليمات ومقر الاستلام: <strong className="text-amber-300">{storePickupNote}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* C. PRODUCTS LIST WITH HIGH-QUALITY IMAGES */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-slate-200 flex items-center gap-2">
                          <span>محتويات الطلب والمنتجات ({itemsCount}):</span>
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => {
                            const prodImg = getProductImage(item);

                            return (
                              <div
                                key={idx}
                                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                              >
                                {/* Product Image & Title Info */}
                                <div className="flex items-start sm:items-center gap-3.5">
                                  {/* Product Thumbnail with Lightbox */}
                                  <div
                                    onClick={(e) => {
                                      if (prodImg) {
                                        e.stopPropagation();
                                        setPreviewImage({ url: prodImg, title: item.product_title });
                                      }
                                    }}
                                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden relative flex-shrink-0 group cursor-pointer ${
                                      prodImg ? 'hover:border-amber-500/60' : ''
                                    }`}
                                  >
                                    {prodImg ? (
                                      <>
                                        <img
                                          src={prodImg}
                                          alt={item.product_title}
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-amber-300">
                                          <Eye className="w-5 h-5" />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/80 p-2 text-center">
                                        <Package className="w-6 h-6 text-slate-500 mb-1" />
                                        <span className="text-[9px] font-bold text-slate-500">منتج التخرج</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Title & Customization Badges */}
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-slate-100 text-sm">{item.product_title}</h5>
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-extrabold border border-amber-500/30">
                                        × {item.quantity}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {item.selected_size && (
                                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-850 text-slate-300 border border-slate-750 font-mono text-[11px] font-semibold">
                                          المقاس: <strong className="text-amber-400">{item.selected_size}</strong>
                                        </span>
                                      )}

                                      {item.custom_text && (
                                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium flex items-center gap-1">
                                          <span>✨ التطريز:</span>
                                          <strong className="text-amber-200">&quot;{item.custom_text}&quot;</strong>
                                        </span>
                                      )}

                                      {item.customization_option && (
                                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                                          <span>💎 الإضافات:</span>
                                          <strong>{item.customization_option}</strong>
                                        </span>
                                      )}

                                      {/* Event Attendees Breakdown & Edit Action */}
                                      <div className="w-full mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                                        {item.attendees && item.attendees.length > 0 ? (
                                          <div className="flex-1 min-w-[200px] p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-amber-400 flex items-center gap-1">
                                                <Ticket className="w-3.5 h-3.5" /> أسماء الحاضرين والتذاكر ({item.attendees.length}):
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenAttendeesModal(order, item)}
                                                className="text-[11px] text-amber-300 hover:text-amber-200 font-bold underline flex items-center gap-1"
                                              >
                                                <span>تعديل الأسماء ✏️</span>
                                              </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                              {item.attendees.map((att, aIdx) => (
                                                <span key={aIdx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                                                  👤 {att.name} {att.phone ? `(${att.phone})` : ''}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAttendeesModal(order, item)}
                                            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5"
                                          >
                                            <Ticket className="w-4 h-4 text-indigo-400" />
                                            <span>🎟️ كتابة/تعديل أسماء الحاضرين للتذاكر ({item.quantity})</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Price breakdown */}
                                <div className="self-end sm:self-center text-left font-mono text-xs sm:text-sm font-bold text-amber-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800/80">
                                  {item.unit_price} ج.م × {item.quantity} = <span className="text-emerald-400 font-black">{item.unit_price * item.quantity} ج.م</span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                            تفاصيل المنتجات متاحة بالفاتورة الإجمالية
                          </div>
                        )}
                      </div>
                    </div>

                    {/* D. RECEIPT IMAGE ATTACHMENT */}
                    {order.receipt_url && (
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Receipt className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">إيصال التحويل المرفق</span>
                            <span className="text-[11px] text-slate-400">صورة الإيصال التي قمت برفعها تأكيداً للدفع</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setPreviewImage({ url: order.receipt_url!, title: `إيصال تحويل طلب #${order.order_code}` })}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold transition flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض صورة الإيصال 📄</span>
                        </button>
                      </div>
                    )}

                    {/* E. ACTION BUTTONS (PRINT, COPY, SUPPORT) */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        
                        {/* Print Invoice Button */}
                        <button
                          onClick={() => handlePrintInvoice(order)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 flex items-center justify-center gap-2"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>طباعة الفاتورة</span>
                        </button>

                        {/* Copy Code Button */}
                        <button
                          onClick={() => handleCopyCode(order.order_code)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 flex items-center justify-center gap-2"
                        >
                          {copiedCode === order.order_code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>نسخ رقم الطلب</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Contact Support Button */}
                      {(() => {
                        const tgGroupUrl = 'https://t.me/+6VnJtWv5mvpmYjJk';
                        const itemsList = (order.items || []).map(i => `${i.product_title} × ${i.quantity}${i.selected_size ? ` (${i.selected_size})` : ''}`).join('، ');
                        const messageText = `مرحباً إدارة المتجر 👋\nأريد الاستفسار بخصوص الطلب الخاص بي:\n\n📋 كود الطلب: #${order.order_code}\n👤 اسم العميل: ${order.customer_name}\n📱 رقم الموبايل: ${order.customer_phone}\n💳 طريقة الدفع: ${order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'InstaPay'}\n💰 إجمالي المبلغ: ${order.total_amount} ج.م\n📌 الرقم المرجعي: ${order.transaction_ref || '—'}\n🛒 تفاصيل المنتجات: ${itemsList || 'طلب تخرج'}`;

                        const handleSupportClick = () => {
                          try {
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(messageText);
                            }
                          } catch(e) {}
                          setTelegramModalData({
                            orderCode: order.order_code,
                            customerName: order.customer_name,
                            phone: order.customer_phone,
                            total: order.total_amount,
                            messageText,
                            groupUrl: tgGroupUrl
                          });
                          setCopiedTelegramOrderId(order.id);
                          setTimeout(() => setCopiedTelegramOrderId(null), 4000);
                        };

                        return (
                          <button
                            type="button"
                            onClick={handleSupportClick}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5 text-sky-400" />
                            <span>الدخول لجروب التليجرام والدعم</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                        );
                      })()}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. HIGH-RESOLUTION IMAGE LIGHTBOX PREVIEW MODAL */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center cursor-zoom-out animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-4 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-2">
              <h3 className="text-sm font-bold text-slate-100">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-2 border border-slate-800">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح الصورة بجودة كاملة في تبويب جديد</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. ATTENDEES EDITING MODAL */}
      {editingAttendeesTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    كتابة أسماء الحاضرين للطلب #{editingAttendeesTarget.order.order_code}
                  </h3>
                  <p className="text-[11px] text-slate-400">كتابة/تعديل أسماء التذاكر للفعالية ({editingAttendeesTarget.item.product_title})</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingAttendeesTarget(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {editingAttendeesTarget.attendeesList.map((att, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{idx === 0 ? 'التذكرة 1 (الحاضر الرئيسي)' : `التذكرة ${idx + 1} (مرافق)`}</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">اسم الحاضر بالكامل *</label>
                      <input
                        type="text"
                        required
                        placeholder={idx === 0 ? "اسمك الثلاثي" : `اسم المرافق ${idx + 1}`}
                        value={att.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingAttendeesTarget(prev => {
                            if (!prev) return null;
                            const nextList = [...prev.attendeesList];
                            nextList[idx] = { ...nextList[idx], name: val };
                            return { ...prev, attendeesList: nextList };
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1 font-semibold">رقم الموبايل (اختياري)</label>
                      <input
                        type="tel"
                        placeholder="01012345678"
                        value={att.phone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingAttendeesTarget(prev => {
                            if (!prev) return null;
                            const nextList = [...prev.attendeesList];
                            nextList[idx] = { ...nextList[idx], phone: val };
                            return { ...prev, attendeesList: nextList };
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                    <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                      <span>النوع / الجنس:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttendeesTarget(prev => {
                            if (!prev) return null;
                            const nextList = [...prev.attendeesList];
                            nextList[idx] = { ...nextList[idx], gender: 'male' };
                            return { ...prev, attendeesList: nextList };
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                          (att.gender || 'male') === 'male'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>👨 ولد (ذكر)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttendeesTarget(prev => {
                            if (!prev) return null;
                            const nextList = [...prev.attendeesList];
                            nextList[idx] = { ...nextList[idx], gender: 'female' };
                            return { ...prev, attendeesList: nextList };
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                          att.gender === 'female'
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span>👩 بنت (أنثى)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingAttendeesTarget(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSavingAttendees}
                onClick={handleSaveAttendeesModal}
                className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isSavingAttendees ? 'جاري الحفظ... ⏳' : 'حفظ وإصدار التذاكر 💾'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TELEGRAM COPIED TOAST BANNER */}
      {copiedTelegramOrderId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99990] bg-slate-900 border border-emerald-500/50 text-emerald-300 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-5">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span>تم نسخ تفاصيل طلبك تلقائياً! قم بعمل لصق (Paste) داخل الجروب 💬</span>
        </div>
      )}

      {/* 8. TELEGRAM SUPPORT & COPY CONFIRMATION MODAL */}
      {telegramModalData && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-sky-500/10 space-y-5 relative">
            <button
              onClick={() => setTelegramModalData(null)}
              className="absolute left-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>تم نسخ تفاصيل الطلب! 📋</span>
                </h3>
                <p className="text-xs text-sky-300 font-mono font-bold">كود الطلب: #{telegramModalData.orderCode}</p>
              </div>
            </div>

            {/* Success Alert Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p>
                تم نسخ كافة بيانات طلبك تلقائياً إلى حافظة جهازك (Clipboard). عند فتح الجروب قم بعمل <strong>(Paste / لصق)</strong> في المحادثة.
              </p>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">معاينة الرسالة المنسوخة:</label>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
                {telegramModalData.messageText}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2.5">
              <a
                href={telegramModalData.groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTelegramModalData(null)}
                className="w-full py-3.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition"
              >
                <Send className="w-4 h-4" />
                <span>فتح جروب التليجرام واللصق الآن 🚀</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(telegramModalData.messageText);
                      }
                    } catch(e) {}
                    setIsCopiedInModal(true);
                    setTimeout(() => setIsCopiedInModal(false), 2000);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {isCopiedInModal ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تم النسخ مجدداً 📋</span>
                    </span>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>إعادة نسخ الرسالة 📋</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTelegramModalData(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
