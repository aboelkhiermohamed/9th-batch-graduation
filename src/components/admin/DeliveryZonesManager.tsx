'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Edit3,
  Trash2,
  Eye,
  RotateCcw,
  AlertCircle,
  Package,
  Calendar,
  User,
  Phone,
  Check,
  X,
  Save,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { DeliveryZone, DeliveryZoneOrder, DeliveryItemSummary } from '@/types';

interface DeliveryZonesManagerProps {
  currentAdmin: { id: string; username: string; display_name: string; role: string } | null;
}

// Clean internal image tags, brackets, and metadata markers for human presentation
export function cleanDisplayOrderDetails(text?: string | null): string {
  if (!text) return 'بدون تفاصيل';
  return text
    .replace(/\[IMG:[\s\S]*?\]/gi, '')
    .replace(/\[ATTENDEES:[\s\S]*?\]/gi, '')
    .replace(/\[الإضافات:[\s\S]*?\]/gi, '')
    .replace(/\[التطريز:[\s\S]*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'بدون تفاصيل';
}

// Clean Add-on text helper
export function cleanAddonNameInUI(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^تخصيص:\s*/i, '')
    .replace(/^إضافة:\s*/i, '')
    .replace(/^ملحق:\s*/i, '')
    .replace(/\s*\(\s*\+?\s*\d+[\s\S]*?\)/gi, '')
    .replace(/\s*\+\s*\d+\s*(ج\.م|EGP|\$)?/gi, '')
    .replace(/[\(\)]/g, '')
    .replace(/\[.*?\]/g, '')
    .trim();
}

// Split text by top-level " + " outside parentheses
export function splitTopLevelPlus(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      if (parenDepth > 0) parenDepth--;
      current += char;
    } else if (char === '+' && parenDepth === 0) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const lastTrimmed = current.trim();
  if (lastTrimmed) parts.push(lastTrimmed);
  return parts;
}

export interface ParsedOrderItem {
  title: string;
  size?: string;
  qty?: number;
  customization?: string;
}

export function parseOrderDetailsToItems(text?: string | null, rawItems?: DeliveryItemSummary[]): ParsedOrderItem[] {
  if (rawItems && rawItems.length > 0) {
    const results: ParsedOrderItem[] = [];
    rawItems.forEach(item => {
      const cleanTitle = cleanDisplayOrderDetails(item.product_title) || 'منتج';
      results.push({
        title: cleanTitle,
        size: item.selected_size ? cleanDisplayOrderDetails(item.selected_size) : undefined,
        qty: item.quantity > 1 ? item.quantity : undefined,
        customization: (item.custom_text || item.customization_option)
          ? cleanDisplayOrderDetails(item.custom_text ? `تطريز: ${item.custom_text}` : item.customization_option)
          : undefined
      });
    });
    return results;
  }

  if (!text) return [];

  const rawParts = splitTopLevelPlus(text);
  const items: ParsedOrderItem[] = [];

  rawParts.forEach(part => {
    const clean = cleanDisplayOrderDetails(part);
    const match = clean.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    if (!match) {
      items.push({ title: clean });
      return;
    }

    const title = match[1].trim() || 'منتج';
    const extraStr = match[2] || '';
    const extraParts = extraStr.split('|').map(s => s.trim()).filter(Boolean);

    let size: string | undefined = undefined;
    let qty: number | undefined = undefined;
    let customization: string | undefined = undefined;
    const extractedAddons: string[] = [];

    extraParts.forEach(p => {
      if (p.startsWith('مقاس:')) {
        size = p.replace('مقاس:', '').trim();
      } else if (p.startsWith('كمية:')) {
        qty = parseInt(p.replace('كمية:', '').trim(), 10) || undefined;
      } else if (p.startsWith('تطريز:')) {
        customization = p;
      } else if (p.startsWith('تخصيص:') || p.includes('Card') || p.includes('Notebook') || p.includes('Cap') || p.includes('Sunglasses') || p.includes('+')) {
        const cleanName = cleanAddonNameInUI(p);
        if (cleanName && !extractedAddons.includes(cleanName)) {
          extractedAddons.push(cleanName);
        }
      } else if (p) {
        customization = customization ? `${customization} | ${p}` : p;
      }
    });

    items.push({ title, size, qty, customization });

    // Each extracted Add-on becomes its own individual checklist item!
    extractedAddons.forEach(addon => {
      items.push({ title: `ملحق: ${addon}` });
    });
  });

  return items;
}

function OrderItemsList({
  text,
  items,
  deliveredIndices,
  orderStatus
}: {
  text?: string | null;
  items?: DeliveryItemSummary[];
  deliveredIndices?: number[];
  orderStatus?: 'pending' | 'delivered' | 'partial';
}) {
  const parsed = useMemo(() => parseOrderDetailsToItems(text, items), [text, items]);

  if (parsed.length === 0) {
    return <span className="text-slate-500 text-xs">بدون تفاصيل</span>;
  }

  // Separate garments and add-ons while preserving original index for delivery tracking!
  const garmentsWithIndex: Array<{ item: ParsedOrderItem; idx: number }> = [];
  const addonsWithIndex: Array<{ item: ParsedOrderItem; idx: number }> = [];

  parsed.forEach((item, idx) => {
    if (item.title.startsWith('ملحق:') || item.title.startsWith('إضافة:')) {
      addonsWithIndex.push({ item, idx });
    } else {
      garmentsWithIndex.push({ item, idx });
    }
  });

  return (
    <div className="space-y-1.5 py-0.5 text-xs">
      {/* 1. Garments & Kids Items (Compact clean rows) */}
      {garmentsWithIndex.map(({ item, idx }) => {
        const isItemDelivered = orderStatus === 'delivered' || (orderStatus === 'partial' && (deliveredIndices?.includes(idx) ?? false));
        const isKids = item.title.includes('اطفال') || item.title.includes('أطفال');

        return (
          <div
            key={idx}
            className={`flex items-center gap-1.5 flex-wrap px-2.5 py-1 rounded-lg border transition ${
              isItemDelivered
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : isKids
                ? 'bg-sky-950/20 border-sky-500/30 text-slate-200'
                : 'bg-slate-900/80 border-slate-800 text-slate-200'
            }`}
          >
            {isKids && (
              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                👶 أطفال
              </span>
            )}

            <span className="font-bold text-[11px] sm:text-xs text-white">
              {item.title}
            </span>

            {item.size && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-bold" dir="ltr">
                مقاس: {item.size}
              </span>
            )}

            {item.qty && item.qty > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono text-[10px] font-bold">
                ×{item.qty}
              </span>
            )}

            {item.customization && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] max-w-[220px] truncate" title={item.customization}>
                {item.customization}
              </span>
            )}

            {/* Status indicator */}
            {isItemDelivered ? (
              <span className="mr-auto px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
                <span>مستلم</span>
              </span>
            ) : orderStatus === 'partial' ? (
              <span className="mr-auto px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold flex items-center gap-0.5 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                <span>معلق</span>
              </span>
            ) : null}
          </div>
        );
      })}

      {/* 2. Add-ons (Single Compact Inline Flow of Chips!) */}
      {addonsWithIndex.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>الملحقات:</span>
          </span>

          {addonsWithIndex.map(({ item, idx }) => {
            const isItemDelivered = orderStatus === 'delivered' || (orderStatus === 'partial' && (deliveredIndices?.includes(idx) ?? false));
            const cleanTitle = item.title.replace(/^(?:ملحق|إضافة):\s*/i, '').trim();

            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border transition ${
                  isItemDelivered
                    ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/40 font-bold'
                    : orderStatus === 'partial'
                    ? 'bg-amber-950/25 text-amber-300 border-amber-500/30 font-bold'
                    : 'bg-purple-950/20 text-purple-300 border-purple-500/30'
                }`}
              >
                <span>{cleanTitle}</span>
                {isItemDelivered ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : orderStatus === 'partial' ? (
                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                ) : null}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DeliveryZonesManager({ currentAdmin }: DeliveryZonesManagerProps) {
  // Navigation: Sub-sections
  const [subTab, setSubTab] = useState<'create' | 'delivery' | 'edit'>('delivery');

  // Shared Data States
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // -------------------------------------------------------------
  // SUB-SECTION 1: CREATE ZONES STATE
  // -------------------------------------------------------------
  const [createZoneName, setCreateZoneName] = useState('Zone A - القاعة الرئيسية');
  const [createDefaultTime, setCreateDefaultTime] = useState('10:00 ص - 11:30 ص');
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  const [createCustomTime, setCreateCustomTime] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [foundOrder, setFoundOrder] = useState<{
    order_id: string;
    order_code: string;
    customer_name: string;
    customer_phone: string;
    items_summary: string;
    items: DeliveryItemSummary[];
    status: string;
  } | null>(null);
  const [createSheetOrders, setCreateSheetOrders] = useState<{
    order_id: string;
    order_code: string;
    customer_name: string;
    customer_phone: string;
    items_summary: string;
    items: DeliveryItemSummary[];
    delivery_time: string;
  }[]>([]);
  const [isSavingNewSheet, setIsSavingNewSheet] = useState(false);

  // Local storage draft key for unsaved new sheets
  const DRAFT_STORAGE_KEY = 'graduation_delivery_create_draft';

  // 1. Restore draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.name) setCreateZoneName(parsed.name);
          if (parsed.defaultTime) setCreateDefaultTime(parsed.defaultTime);
          if (Array.isArray(parsed.orders) && parsed.orders.length > 0) {
            setCreateSheetOrders(parsed.orders);
          }
        }
      } catch (e) {
        console.warn('Failed restoring create sheet draft:', e);
      }
    }
  }, []);

  // 2. Auto-save draft on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (createSheetOrders.length > 0) {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({
              name: createZoneName,
              defaultTime: createDefaultTime,
              orders: createSheetOrders
            })
          );
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Failed saving create sheet draft:', e);
      }
    }
  }, [createZoneName, createDefaultTime, createSheetOrders]);

  // 3. Warn user before leaving/refreshing if they have unsaved orders
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (createSheetOrders.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [createSheetOrders.length]);

  // -------------------------------------------------------------
  // SUB-SECTION 2: ZONES DELIVERY STATE
  // -------------------------------------------------------------
  const [openedZoneId, setOpenedZoneId] = useState<string | null>(null);
  const [openedZone, setOpenedZone] = useState<DeliveryZone | null>(null);
  const [isLoadingOpenedZone, setIsLoadingOpenedZone] = useState(false);
  const [deliveryCodeSearch, setDeliveryCodeSearch] = useState('');
  const [deliverySearchFeedback, setDeliverySearchFeedback] = useState<{ type: 'found' | 'not_found' | 'external'; message: string; externalOrder?: any } | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'pending' | 'partial' | 'delivered'>('all');
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState<string | null>(null);
  const [undoModalOrder, setUndoModalOrder] = useState<DeliveryZoneOrder | null>(null);
  const [itemDeliveryModalOrder, setItemDeliveryModalOrder] = useState<DeliveryZoneOrder | null>(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([]);
  const [isSavingItemDelivery, setIsSavingItemDelivery] = useState(false);

  // Global Unified Search State (for Add-ons, Kids & All Zones)
  const [globalSearchInput, setGlobalSearchInput] = useState('');
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);
  const [globalSearchResult, setGlobalSearchResult] = useState<any | null>(null);
  const [globalSearchFeedback, setGlobalSearchFeedback] = useState<{ type: 'found' | 'not_found' | 'info'; message: string } | null>(null);

  // Ref for table rows / mobile cards scrolling
  const orderRowRefs = useRef<Record<string, HTMLElement | null>>({});

  // -------------------------------------------------------------
  // SUB-SECTION 3: ZONES EDIT STATE
  // -------------------------------------------------------------
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [editZoneName, setEditZoneName] = useState('');
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSearchOrderTime, setEditSearchOrderTime] = useState('');
  const [isEditSearching, setIsEditSearching] = useState(false);
  const [editFoundOrder, setEditFoundOrder] = useState<any | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteConfirmZone, setDeleteConfirmZone] = useState<DeliveryZone | null>(null);
  const [viewingZoneModal, setViewingZoneModal] = useState<DeliveryZone | null>(null);

  // Show Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // -------------------------------------------------------------
  // FETCH ALL ZONES (Summary for Dashboard)
  // -------------------------------------------------------------
  const fetchZonesList = async () => {
    try {
      setIsLoadingZones(true);
      const res = await fetch('/api/admin/zones', { cache: 'no-store' });
      if (!res.ok) throw new Error('فشل جلب البيانات');
      const data = await res.json();
      if (data.success && Array.isArray(data.zones)) {
        setZones(data.zones);
        setIsUsingFallback(Boolean(data.isUsingFallback));
      }
    } catch (err: any) {
      console.error('Error fetching zones list:', err);
      showToast('تعذر تحميل كشوفات التسليم', 'error');
    } finally {
      setIsLoadingZones(false);
    }
  };

  useEffect(() => {
    fetchZonesList();
  }, []);

  // -------------------------------------------------------------
  // 1. CREATE ZONES LOGIC
  // -------------------------------------------------------------
  const handleSearchOrderForCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = createSearchQuery.trim();
    if (!q) {
      showToast('يرجى إدخال رقم أو كود الطلب للبحث', 'info');
      return;
    }

    try {
      setIsSearchingOrder(true);
      setFoundOrder(null);
      const res = await fetch(`/api/admin/zones/search-order?query=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        showToast(data.error || 'لم يتم العثور على أي طلب يطابق هذا الكود أو الرقم', 'error');
        return;
      }

      setFoundOrder(data.order);
      if (!createCustomTime) {
        setCreateCustomTime(createDefaultTime);
      }
    } catch (err) {
      console.error('Search order error:', err);
      showToast('حدث خطأ أثناء البحث عن الطلب', 'error');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  const handleAddFoundOrderToSheet = () => {
    if (!foundOrder) return;

    // Check duplicate in current sheet
    const isDuplicate = createSheetOrders.some(o => o.order_id === foundOrder.order_id);
    if (isDuplicate) {
      showToast(`الطلب #${foundOrder.order_code} مضاف بالفعل في هذا الكشف!`, 'error');
      return;
    }

    const assignedTime = createCustomTime.trim() || createDefaultTime.trim() || '10:00 ص - 11:30 ص';

    setCreateSheetOrders(prev => [
      ...prev,
      {
        order_id: foundOrder.order_id,
        order_code: foundOrder.order_code,
        customer_name: foundOrder.customer_name,
        customer_phone: foundOrder.customer_phone,
        items_summary: foundOrder.items_summary,
        items: foundOrder.items,
        delivery_time: assignedTime
      }
    ]);

    showToast(`تمت إضافة الطلب #${foundOrder.order_code} إلى الكشف بنجاح`, 'success');
    setFoundOrder(null);
    setCreateSearchQuery('');
  };

  const handleRemoveOrderFromCreateSheet = (orderId: string) => {
    setCreateSheetOrders(prev => prev.filter(o => o.order_id !== orderId));
    showToast('تمت إزالة الطلب من الكشف', 'info');
  };

  const handleSaveNewZoneSheet = async () => {
    const name = createZoneName.trim();
    if (!name) {
      showToast('يرجى إدخال اسم الزون أو الكشف', 'error');
      return;
    }

    if (createSheetOrders.length === 0) {
      showToast('الكشف فارغ! يرجى إضافة طلب واحد على الأقل قبل الحفظ', 'error');
      return;
    }

    try {
      setIsSavingNewSheet(true);
      const res = await fetch('/api/admin/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          created_by: currentAdmin?.display_name || 'Admin',
          orders: createSheetOrders.map(o => ({
            order_id: o.order_id,
            order_code: o.order_code,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            items_summary: o.items_summary,
            items: o.items,
            delivery_time: o.delivery_time
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ الكشف');
      }

      showToast(`تم إنشاء كشف "${name}" بنجاح بإجمالي ${createSheetOrders.length} طلب`, 'success');

      // Reset form and remove draft
      setCreateSheetOrders([]);
      setCreateZoneName('Zone B - كشف جديد');
      setFoundOrder(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      // Refresh zones list and navigate to Delivery section
      await fetchZonesList();
      setSubTab('delivery');
      if (data.zone?.id) {
        openDeliverySheet(data.zone.id);
      }
    } catch (err: any) {
      console.error('Error saving new sheet:', err);
      showToast(err.message || 'فشل حفظ كشف التسليم', 'error');
    } finally {
      setIsSavingNewSheet(false);
    }
  };

  // -------------------------------------------------------------
  // 2. ZONES DELIVERY LOGIC
  // -------------------------------------------------------------
  const openDeliverySheet = async (zoneId: string) => {
    try {
      setIsLoadingOpenedZone(true);
      setOpenedZoneId(zoneId);
      setDeliveryCodeSearch('');
      setDeliverySearchFeedback(null);
      setHighlightedOrderId(null);
      setDeliveryFilter('all');

      const res = await fetch(`/api/admin/zones/${zoneId}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success || !data.zone) {
        throw new Error(data.error || 'تعذر فتح الكشف');
      }

      setOpenedZone(data.zone);
    } catch (err: any) {
      console.error('Error opening sheet:', err);
      showToast(err.message || 'تعذر فتح كشف التسليم', 'error');
    } finally {
      setIsLoadingOpenedZone(false);
    }
  };

  const handleDeliverySearchByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!openedZone || !openedZone.orders) return;

    const q = deliveryCodeSearch.trim().replace(/^#/, '').toLowerCase();
    if (!q) {
      setDeliverySearchFeedback(null);
      setHighlightedOrderId(null);
      return;
    }

    // Search within current sheet by order code, phone, or student name
    const found = openedZone.orders.find(o => {
      const code = (o.order_code || '').toLowerCase().replace(/^#/, '');
      const gradCode = code.replace(/^grad-/, '');
      const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
      const name = (o.customer_name || '').toLowerCase();
      const cleanQ = q.replace(/^grad-/, '');

      return (
        code === q ||
        gradCode === cleanQ ||
        code.includes(q) ||
        cleanPhone.endsWith(q) ||
        name.includes(q)
      );
    });

    if (found) {
      if (deliveryFilter !== 'all') {
        setDeliveryFilter('all');
      }
      setHighlightedOrderId(found.order_id);
      setDeliverySearchFeedback({
        type: 'found',
        message: `تم العثور على الطلب: #${found.order_code} - ${found.customer_name} (${found.delivery_status === 'delivered' ? 'مستلم سابقاً ✅' : 'قيد التسليم ⏳'})`
      });

      // Scroll to row smoothly
      setTimeout(() => {
        const rowEl = orderRowRefs.current[found.order_id];
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      setHighlightedOrderId(null);
      // Auto search database globally in background
      try {
        const res = await fetch(`/api/admin/zones/search-order?query=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.order) {
          setDeliverySearchFeedback({
            type: 'external',
            message: `هذا الطلب مسجل في كشف آخر: [${data.order.zone_name || 'كشف تسليم'}]`,
            externalOrder: data.order
          });
          return;
        }
      } catch (err) {}

      setDeliverySearchFeedback({
        type: 'not_found',
        message: `⚠️ الطلب "${deliveryCodeSearch}" غير موجود في هذا الكشف ولا في أي كشف آخر.`
      });
    }
  };

  // Global Unified Search: Search ANY order across all zones directly from DB (bandwidth-optimized)
  const handleGlobalDeliverySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = globalSearchInput.trim().replace(/^#/, '');
    if (!q) {
      setGlobalSearchFeedback({ type: 'info', message: 'يرجى إدخال كود الطلب أو رقم الهاتف أو اسم الطالب' });
      setGlobalSearchResult(null);
      return;
    }

    try {
      setIsGlobalSearching(true);
      setGlobalSearchFeedback(null);
      setGlobalSearchResult(null);

      const res = await fetch(`/api/admin/zones/search-order?query=${encodeURIComponent(q)}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        setGlobalSearchFeedback({
          type: 'not_found',
          message: data.error || `⚠️ لم يتم العثور على أي طلب يطابق "${q}"`
        });
        return;
      }

      setGlobalSearchResult(data.order);
      setGlobalSearchFeedback({
        type: 'found',
        message: `تم العثور على طلب: ${data.order.customer_name} (${data.order.order_code})`
      });

      // If this order exists in currently opened zone, also highlight it!
      if (openedZone && openedZone.orders) {
        const inZone = openedZone.orders.find(o => o.order_id === data.order.order_id || o.order_code === data.order.order_code);
        if (inZone) {
          setHighlightedOrderId(inZone.order_id);
          const el = orderRowRefs.current[inZone.order_id];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    } catch (err: any) {
      console.error('Error in global delivery search:', err);
      setGlobalSearchFeedback({
        type: 'not_found',
        message: 'تعذر البحث حالياً، يرجى المحاولة ثانية'
      });
    } finally {
      setIsGlobalSearching(false);
    }
  };

  // Open item-by-item delivery selection modal
  const openItemDeliveryModal = (order: DeliveryZoneOrder) => {
    setItemDeliveryModalOrder(order);
    const parsedItems = parseOrderDetailsToItems(order.items_summary || order.order_details, order.items);
    // User requested unselect by default:
    // If order was already partially delivered with specific delivered_items recorded, preserve them;
    // Otherwise start with an empty selection (unselected by default)
    if (order.delivery_status === 'partial' && order.delivered_items && Array.isArray(order.delivered_items) && order.delivered_items.length > 0) {
      setSelectedItemIndices([...order.delivered_items]);
    } else {
      setSelectedItemIndices([]);
    }
  };

  // Toggle single item selection in modal
  const handleToggleItemIndex = (index: number) => {
    setSelectedItemIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  // Save item-by-item delivery
  const handleSaveItemDelivery = async () => {
    if (!itemDeliveryModalOrder) return;

    const order = itemDeliveryModalOrder;
    const targetZoneId = order.zone_id || openedZoneId || 'general';
    const parsedItems = parseOrderDetailsToItems(order.items_summary || order.order_details, order.items);
    const totalItems = parsedItems.length;
    const selectedCount = selectedItemIndices.length;

    let newStatus: 'pending' | 'delivered' | 'partial' = 'pending';
    if (selectedCount === totalItems && totalItems > 0) {
      newStatus = 'delivered';
    } else if (selectedCount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    try {
      setIsSavingItemDelivery(true);
      setStatusUpdatingOrderId(order.order_id);

      const now = new Date().toISOString();
      const adminName = currentAdmin?.display_name || 'Admin';

      // 1. Optimistic update for openedZone (if active)
      if (openedZone && openedZone.orders) {
        setOpenedZone(prev => {
          if (!prev || !prev.orders) return prev;
          const updatedOrders = prev.orders.map(o => {
            if (o.order_id === order.order_id) {
              return {
                ...o,
                delivery_status: newStatus,
                delivered_items: newStatus === 'partial' ? selectedItemIndices : (newStatus === 'delivered' ? parsedItems.map((_, i) => i) : []),
                delivered_at: newStatus !== 'pending' ? now : null,
                delivered_by: newStatus !== 'pending' ? adminName : null
              };
            }
            return o;
          });

          const deliveredCount = updatedOrders.filter(o => o.delivery_status === 'delivered').length;
          return {
            ...prev,
            orders: updatedOrders,
            delivered_orders: deliveredCount,
            pending_orders: (prev.total_orders || updatedOrders.length) - deliveredCount
          };
        });
      }

      // 2. Optimistic update for globalSearchResult (if active)
      if (globalSearchResult && (globalSearchResult.order_id === order.order_id || globalSearchResult.order_code === order.order_code)) {
        setGlobalSearchResult((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            delivery_status: newStatus,
            delivered_items: newStatus === 'partial' ? selectedItemIndices : (newStatus === 'delivered' ? parsedItems.map((_, i) => i) : []),
            delivered_at: newStatus !== 'pending' ? now : null,
            delivered_by: newStatus !== 'pending' ? adminName : null
          };
        });
      }

      const res = await fetch(`/api/admin/zones/${targetZoneId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.order_id,
          status: newStatus,
          adminName,
          deliveredItems: selectedItemIndices
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ حالة تسليم القطع');
      }

      if (newStatus === 'delivered') {
        showToast(`تم تأكيد تسليم كامل قطع الطلب: ${order.customer_name} (#${order.order_code}) ✅`, 'success');
      } else if (newStatus === 'partial') {
        showToast(`تم حفظ تسليم (${selectedCount} من ${totalItems}) قطع للطالب: ${order.customer_name} 📦`, 'info');
      } else {
        showToast(`تم ضبط الطلب كـ قيد التسليم (لم يستلم أي قطعة) ⏳`, 'info');
      }

      setItemDeliveryModalOrder(null);
    } catch (err: any) {
      console.error('Error saving item delivery:', err);
      showToast('تعذر حفظ عناصر التسليم، يرجى المحاولة ثانية', 'error');
      if (openedZoneId) openDeliverySheet(openedZoneId);
    } finally {
      setIsSavingItemDelivery(false);
      setStatusUpdatingOrderId(null);
    }
  };

  // Mark an order as delivered
  const handleMarkAsDelivered = async (order: DeliveryZoneOrder, forceAll: boolean = false) => {
    const targetZoneId = order.zone_id || openedZoneId || 'general';
    const parsedItems = parseOrderDetailsToItems(order.items_summary || order.order_details, order.items);
    if (parsedItems.length > 1 && !forceAll) {
      openItemDeliveryModal(order);
      return;
    }

    try {
      setStatusUpdatingOrderId(order.order_id);

      // Optimistic update
      const now = new Date().toISOString();
      const adminName = currentAdmin?.display_name || 'Admin';

      if (openedZone && openedZone.orders) {
        setOpenedZone(prev => {
          if (!prev || !prev.orders) return prev;
          const updatedOrders = prev.orders.map(o => {
            if (o.order_id === order.order_id) {
              return {
                ...o,
                delivery_status: 'delivered' as const,
                delivered_items: parsedItems.map((_, i) => i),
                delivered_at: now,
                delivered_by: adminName
              };
            }
            return o;
          });

          const deliveredCount = updatedOrders.filter(o => o.delivery_status === 'delivered').length;
          return {
            ...prev,
            orders: updatedOrders,
            delivered_orders: deliveredCount,
            pending_orders: (prev.total_orders || updatedOrders.length) - deliveredCount
          };
        });
      }

      if (globalSearchResult && (globalSearchResult.order_id === order.order_id || globalSearchResult.order_code === order.order_code)) {
        setGlobalSearchResult((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            delivery_status: 'delivered',
            delivered_items: parsedItems.map((_, i) => i),
            delivered_at: now,
            delivered_by: adminName
          };
        });
      }

      // Send PATCH to API
      const res = await fetch(`/api/admin/zones/${targetZoneId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.order_id,
          status: 'delivered',
          adminName,
          deliveredItems: parsedItems.map((_, i) => i)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحديث حالة التسليم');
      }

      showToast(`تم تأكيد تسليم طلب الطالب: ${order.customer_name} (#${order.order_code}) ✅`, 'success');

      // Update in background list as well
      setZones(prev => prev.map(z => {
        if (z.id === targetZoneId) {
          const total = z.total_orders || 0;
          const delivered = (z.delivered_orders || 0) + 1;
          return { ...z, delivered_orders: delivered, pending_orders: Math.max(0, total - delivered) };
        }
        return z;
      }));
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
      showToast('تعذر حفظ حالة التسليم، يرجى المحاولة ثانية', 'error');
      if (openedZoneId) openDeliverySheet(openedZoneId);
    } finally {
      setStatusUpdatingOrderId(null);
    }
  };

  // Undo delivery
  const handleConfirmUndoDelivery = async () => {
    if (!undoModalOrder || !openedZoneId || !openedZone) return;

    const targetOrder = undoModalOrder;
    setUndoModalOrder(null);

    try {
      setStatusUpdatingOrderId(targetOrder.order_id);

      // Optimistic update
      setOpenedZone(prev => {
        if (!prev || !prev.orders) return prev;
        const updatedOrders = prev.orders.map(o => {
          if (o.order_id === targetOrder.order_id) {
            return {
              ...o,
              delivery_status: 'pending' as const,
              delivered_items: [],
              delivered_at: null,
              delivered_by: null
            };
          }
          return o;
        });

        const deliveredCount = updatedOrders.filter(o => o.delivery_status === 'delivered').length;
        return {
          ...prev,
          orders: updatedOrders,
          delivered_orders: deliveredCount,
          pending_orders: (prev.total_orders || updatedOrders.length) - deliveredCount
        };
      });

      const res = await fetch(`/api/admin/zones/${openedZoneId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: targetOrder.order_id,
          status: 'pending',
          adminName: currentAdmin?.display_name || 'Admin',
          deliveredItems: []
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إلغاء التسليم');
      }

      showToast(`تم التراجع عن تسليم طلب #${targetOrder.order_code} وإعادته لقيد الانتظار`, 'info');

      // Update in background list as well
      setZones(prev => prev.map(z => {
        if (z.id === openedZoneId) {
          const total = z.total_orders || 0;
          const delivered = Math.max(0, (z.delivered_orders || 1) - 1);
          return { ...z, delivered_orders: delivered, pending_orders: Math.max(0, total - delivered) };
        }
        return z;
      }));
    } catch (err: any) {
      console.error('Error undoing delivery:', err);
      showToast('تعذر التراجع عن التسليم', 'error');
      openDeliverySheet(openedZoneId);
    } finally {
      setStatusUpdatingOrderId(null);
    }
  };

  // Filtered orders in opened sheet
  const filteredOpenedOrders = useMemo(() => {
    if (!openedZone?.orders) return [];
    if (deliveryFilter === 'pending') {
      return openedZone.orders.filter(o => o.delivery_status === 'pending');
    }
    if (deliveryFilter === 'partial') {
      return openedZone.orders.filter(o => o.delivery_status === 'partial');
    }
    if (deliveryFilter === 'delivered') {
      return openedZone.orders.filter(o => o.delivery_status === 'delivered');
    }
    return openedZone.orders;
  }, [openedZone, deliveryFilter]);

  // -------------------------------------------------------------
  // 3. ZONES EDIT LOGIC
  // -------------------------------------------------------------
  const startEditingZone = async (zoneId: string) => {
    try {
      setIsLoadingOpenedZone(true);
      const res = await fetch(`/api/admin/zones/${zoneId}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success || !data.zone) {
        throw new Error(data.error || 'تعذر فتح الكشف للتعديل');
      }

      setEditingZoneId(zoneId);
      setEditingZone(data.zone);
      setEditZoneName(data.zone.name);
      setEditSearchQuery('');
      setEditFoundOrder(null);
    } catch (err: any) {
      showToast(err.message || 'فشل فتح الكشف للتعديل', 'error');
    } finally {
      setIsLoadingOpenedZone(false);
    }
  };

  const handleSearchOrderForEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = editSearchQuery.trim();
    if (!q) {
      showToast('يرجى إدخال رقم الطلب للبحث', 'info');
      return;
    }

    try {
      setIsEditSearching(true);
      setEditFoundOrder(null);
      const res = await fetch(`/api/admin/zones/search-order?query=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        showToast(data.error || 'لم يتم العثور على أي طلب', 'error');
        return;
      }

      setEditFoundOrder(data.order);
      setEditSearchOrderTime('10:00 ص - 11:30 ص');
    } catch (err) {
      showToast('خطأ أثناء البحث عن الطلب', 'error');
    } finally {
      setIsEditSearching(false);
    }
  };

  const handleAddFoundOrderToEditZone = () => {
    if (!editFoundOrder || !editingZone) return;

    const exists = editingZone.orders?.some(o => o.order_id === editFoundOrder.order_id);
    if (exists) {
      showToast(`الطلب #${editFoundOrder.order_code} موجود بالفعل في هذا الكشف!`, 'error');
      return;
    }

    const newOrder: DeliveryZoneOrder = {
      id: 'temp-' + Date.now(),
      zone_id: editingZone.id,
      order_id: editFoundOrder.order_id,
      order_code: editFoundOrder.order_code,
      customer_name: editFoundOrder.customer_name,
      customer_phone: editFoundOrder.customer_phone,
      order_details: editFoundOrder.items_summary,
      items_summary: editFoundOrder.items_summary,
      items: editFoundOrder.items,
      delivery_time: editSearchOrderTime.trim() || '10:00 ص - 11:30 ص',
      delivery_status: 'pending',
      sort_order: (editingZone.orders?.length || 0) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setEditingZone(prev => {
      if (!prev) return prev;
      const updatedOrders = [...(prev.orders || []), newOrder];
      return {
        ...prev,
        orders: updatedOrders,
        total_orders: updatedOrders.length,
        pending_orders: (prev.pending_orders || 0) + 1
      };
    });

    showToast(`تمت إضافة الطلب #${editFoundOrder.order_code} إلى الكشف`, 'success');
    setEditFoundOrder(null);
    setEditSearchQuery('');
  };

  const handleRemoveOrderFromEditZone = (orderId: string) => {
    if (!editingZone || !editingZone.orders) return;

    setEditingZone(prev => {
      if (!prev || !prev.orders) return prev;
      const target = prev.orders.find(o => o.order_id === orderId);
      const isDelivered = target?.delivery_status === 'delivered';
      const updatedOrders = prev.orders.filter(o => o.order_id !== orderId);

      return {
        ...prev,
        orders: updatedOrders,
        total_orders: updatedOrders.length,
        delivered_orders: isDelivered ? Math.max(0, (prev.delivered_orders || 1) - 1) : prev.delivered_orders,
        pending_orders: !isDelivered ? Math.max(0, (prev.pending_orders || 1) - 1) : prev.pending_orders
      };
    });

    showToast('تم حذف الطلب من الكشف (الطلب الأصلي محفوظ في المتجر)', 'info');
  };

  const handleMoveOrderInEdit = (index: number, direction: 'up' | 'down') => {
    if (!editingZone || !editingZone.orders) return;
    const orders = [...editingZone.orders];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orders.length) return;

    const temp = orders[index];
    orders[index] = orders[targetIdx];
    orders[targetIdx] = temp;

    setEditingZone(prev => prev ? { ...prev, orders } : prev);
  };

  const handleSaveEditZone = async () => {
    if (!editingZoneId || !editingZone) return;
    const name = editZoneName.trim();
    if (!name) {
      showToast('يرجى إدخال اسم الزون', 'error');
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/admin/zones/${editingZoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          orders: (editingZone.orders || []).map((o, idx) => ({
            order_id: o.order_id,
            order_code: o.order_code,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            items_summary: o.items_summary,
            items: o.items,
            delivery_time: o.delivery_time,
            delivery_status: o.delivery_status,
            delivered_at: o.delivered_at,
            delivered_by: o.delivered_by,
            sort_order: idx + 1
          }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ التعديلات');
      }

      showToast(`تم حفظ تعديلات كشف "${name}" بنجاح مع الحفاظ على حالات الاستلام`, 'success');
      setEditingZoneId(null);
      setEditingZone(null);
      await fetchZonesList();

      if (openedZoneId === editingZoneId) {
        openDeliverySheet(editingZoneId);
      }
    } catch (err: any) {
      console.error('Error saving edits:', err);
      showToast(err.message || 'فشل حفظ التعديلات', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteZoneConfirmed = async () => {
    if (!deleteConfirmZone) return;
    const target = deleteConfirmZone;
    setDeleteConfirmZone(null);

    try {
      const res = await fetch(`/api/admin/zones/${target.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حذف الكشف');
      }

      showToast(`تم حذف كشف "${target.name}" بنجاح، وجميع طلبات المتجر الأصلية محفوظة تماماً`, 'success');

      if (openedZoneId === target.id) {
        setOpenedZoneId(null);
        setOpenedZone(null);
      }
      if (editingZoneId === target.id) {
        setEditingZoneId(null);
        setEditingZone(null);
      }

      await fetchZonesList();
    } catch (err: any) {
      console.error('Error deleting zone:', err);
      showToast(err.message || 'تعذر حذف الكشف', 'error');
    }
  };

  // -------------------------------------------------------------
  // 5. PROFESSIONAL PRINTING SYSTEM (Browser Native Print)
  // -------------------------------------------------------------
  const handlePrintSheet = async (zone: DeliveryZone) => {
    // If orders array is not fully loaded (e.g. from summary cards), fetch it first
    let sheetToPrint = zone;
    if (!sheetToPrint.orders || sheetToPrint.orders.length === 0) {
      try {
        const res = await fetch(`/api/admin/zones/${zone.id}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.zone) {
          sheetToPrint = data.zone;
        }
      } catch (e) {
        console.error('Failed fetching zone for printing:', e);
      }
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('يرجى السماح بالنوافذ المنبثقة (Popups) في متصفحك لطباعة كشف التسليم.');
      return;
    }

    const ordersList = sheetToPrint.orders || [];
    const printDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const printTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const rowsHtml = ordersList.map((ord, idx) => {
      const isDelivered = ord.delivery_status === 'delivered';
      const statusBadge = isDelivered
        ? `<span style="display: inline-block; padding: 2px 8px; background: #ecfdf5; color: #047857; border: 1px solid #10b981; border-radius: 4px; font-weight: bold; font-size: 10px;">تم التسليم (${ord.delivered_by || 'Admin'})</span>`
        : `<span style="display: inline-block; padding: 2px 8px; background: #fff7ed; color: #c2410c; border: 1px solid #f97316; border-radius: 4px; font-weight: bold; font-size: 10px;">قيد التسليم</span>`;

      const parsedList = parseOrderDetailsToItems(ord.items_summary || ord.order_details, ord.items);
      const itemsPrintHtml = parsedList.map(it => `
        <div style="margin-bottom: 2px; padding: 2px 0; border-bottom: 1px dotted #e2e8f0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
          <span style="font-weight: 700; color: #0f172a;">&bull; ${it.title}</span>
          ${it.size ? `<span style="background: #e0e7ff; color: #3730a3; padding: 1px 5px; border-radius: 4px; font-weight: bold; font-size: 10px; font-family: monospace;" dir="ltr">مقاس: ${it.size}</span>` : ''}
          ${it.qty && it.qty > 1 ? `<span style="background: #f1f5f9; color: #0f172a; padding: 1px 4px; border-radius: 4px; font-weight: bold; font-size: 10px;">×${it.qty}</span>` : ''}
          ${it.customization ? `<span style="background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 4px; font-size: 10px;">${it.customization}</span>` : ''}
        </div>
      `).join('') || '<span style="color: #64748b;">بدون تفاصيل</span>';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 900; font-size: 13px; color: #0f172a; text-align: center;">${ord.order_code}</td>
          <td style="font-weight: 700; color: #0f172a;">${ord.customer_name}</td>
          <td style="font-family: monospace; font-size: 11px; color: #334155; text-align: center;" dir="ltr">${ord.customer_phone}</td>
          <td style="font-size: 11px; color: #1e293b; line-height: 1.4;">${itemsPrintHtml}</td>
          <td style="text-align: center; font-size: 11px; font-weight: 600; color: #4338ca;">${ord.delivery_time}</td>
          <td style="text-align: center;">${statusBadge}</td>
          <td style="width: 80px; text-align: center; border-bottom: 1px dashed #cbd5e1;"></td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف تسليم - ${sheetToPrint.name}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 15px;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .store-brand {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .sheet-title {
            font-size: 16px;
            font-weight: 800;
            color: #4338ca;
            margin-top: 4px;
          }
          .meta-info {
            font-size: 10px;
            color: #475569;
            text-align: left;
            line-height: 1.5;
          }
          .summary-bar {
            display: flex;
            gap: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .summary-item strong {
            color: #0f172a;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background: #f1f5f9;
            color: #1e293b;
            font-weight: 800;
            padding: 8px 6px;
            border: 1px solid #cbd5e1;
            text-align: right;
            font-size: 11px;
          }
          td {
            padding: 6px 6px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          .footer-note {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="store-brand">The Medix - كشف تسليم رسمي</div>
            <div class="sheet-title">📍 ${sheetToPrint.name}</div>
          </div>
          <div class="meta-info">
            <div><strong>تاريخ الطباعة:</strong> ${printDate} - ${printTime}</div>
            <div><strong>مشرف الكشف:</strong> ${sheetToPrint.created_by || 'Admin'}</div>
            <div><strong>إجمالي الطلبات:</strong> ${ordersList.length} طالب</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">إجمالي الكشف: <strong>${ordersList.length}</strong></div>
          <div class="summary-item" style="color: #047857;">تم التسليم: <strong>${ordersList.filter(o => o.delivery_status === 'delivered').length}</strong></div>
          <div class="summary-item" style="color: #c2410c;">متبقي: <strong>${ordersList.filter(o => o.delivery_status !== 'delivered').length}</strong></div>
          <div class="summary-item">النسبة المكتملة: <strong>${ordersList.length > 0 ? Math.round((ordersList.filter(o => o.delivery_status === 'delivered').length / ordersList.length) * 100) : 0}%</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">#</th>
              <th style="width: 95px; text-align: center;">كود الطلب</th>
              <th style="width: 140px;">اسم الطالب</th>
              <th style="width: 85px; text-align: center;">رقم الهاتف</th>
              <th>تفاصيل ومحتويات الكيس</th>
              <th style="width: 80px; text-align: center;">موعد التسليم</th>
              <th style="width: 85px; text-align: center;">الحالة</th>
              <th style="width: 75px; text-align: center;">توقيع الطالب</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-note">
          <div>نظام زونات التسليم الذكي &bull; The Medix Graduation Store</div>
          <div>صفحة رسمية معتمدة لتنظيم وتوثيق تسليم خريجي الدفعة</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-700/80 shadow-emerald-900/30'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-700/80 shadow-rose-900/30'
              : 'bg-indigo-950/95 text-indigo-200 border-indigo-700/80 shadow-indigo-900/30'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-indigo-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Fallback Notice Banner (if Supabase schema cache hasn't loaded tables yet) */}
      {isUsingFallback && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold">نظام الزونات يعمل حالياً بوضع التخزين الآمن المباشر (Local Safe Fallback).</p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">
                لتفعيل جداول Supabase العلائقية الرسمية، شغّل كود <code className="bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800 font-mono">supabase/delivery_zones.sql</code> داخل محرر SQL في Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={fetchZonesList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] transition flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة فحص الاتصال</span>
          </button>
        </div>
      )}

      {/* Main Delivery Zones Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white flex items-center gap-2 flex-wrap">
                  <span>إدارة زونات ومحطات التسليم</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    Delivery Zones
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  تقسيم أوردرات الدفعة على زونات ومحطات، تنظيم مواعيد التسليم، البحث السريع بالأكواد، وتوثيق استلام كل طالب لحظياً.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="w-full sm:w-auto">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 sm:px-4 sm:py-2 grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3">
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 font-bold">عدد الزونات</span>
                <span className="font-mono font-black text-sm sm:text-base text-indigo-400">{zones.length}</span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-800" />
              <div className="text-center border-x sm:border-x-0 border-slate-800/80 px-1">
                <span className="block text-[10px] text-slate-400 font-bold">إجمالي الأوردرات</span>
                <span className="font-mono font-black text-sm sm:text-base text-white">
                  {zones.reduce((acc, z) => acc + (z.total_orders || 0), 0)}
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-800" />
              <div className="text-center">
                <span className="block text-[10px] text-emerald-400 font-bold">تم التسليم</span>
                <span className="font-mono font-black text-sm sm:text-base text-emerald-400">
                  {zones.reduce((acc, z) => acc + (z.delivered_orders || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-SECTION TABS (The 3 Sub-sections required)                */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center gap-2 mt-4 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-800/80 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSubTab('delivery')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              subTab === 'delivery'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${subTab === 'delivery' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>2. محطة تسليم الزونات <span className="hidden md:inline">(Zones Delivery)</span></span>
            {zones.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-black">
                {zones.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('create')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              subTab === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <Plus className={`w-4 h-4 ${subTab === 'create' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>1. إنشاء زون جديد <span className="hidden md:inline">(Create Zones)</span></span>
          </button>

          <button
            onClick={() => setSubTab('edit')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              subTab === 'edit'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${subTab === 'edit' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>3. إدارة وتعديل الكشوفات <span className="hidden md:inline">(Zones Edit)</span></span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. SUB-SECTION ONE: CREATE ZONES                              */}
      {/* ============================================================= */}
      {subTab === 'create' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>إنشاء كشف زون تسليم جديد</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  اكتب اسم الزون، وابحث عن الطلبات بالرقم أو الكود لإضافتها إلى الكشف مباشرة، ثم احفظ الكشف.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {createSheetOrders.length > 0 && (
                  <span className="text-[10px] sm:text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-bold animate-in fade-in">
                    <Save className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>المسودة محفوظة ضد الـ Refresh</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (createSheetOrders.length > 0 && !confirm('هل أنت متأكد من رغبتك في مسح مسودة الكشف الحالي؟')) {
                      return;
                    }
                    setCreateSheetOrders([]);
                    setFoundOrder(null);
                    setCreateSearchQuery('');
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(DRAFT_STORAGE_KEY);
                    }
                    showToast('تم مسح مسودة الكشف', 'info');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  تفريغ النموذج
                </button>
              </div>
            </div>

            {/* Zone Name & Default Time Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم الزون / الكشف <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={createZoneName}
                  onChange={e => setCreateZoneName(e.target.value)}
                  placeholder="مثال: Zone A - القاعة الرئيسية (1-175)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  موعد التسليم الافتراضي (Delivery Time)
                </label>
                <input
                  type="text"
                  value={createDefaultTime}
                  onChange={e => setCreateDefaultTime(e.target.value)}
                  placeholder="مثال: 10:00 ص - 11:30 ص"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Order Search Bar */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>البحث المباشر عن الطلب في قاعدة البيانات</span>
              </h3>

              <form onSubmit={handleSearchOrderForCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={createSearchQuery}
                    onChange={e => setCreateSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchOrderForCreate();
                      }
                    }}
                    placeholder="أدخل كود الطلب (مثل 41454 أو GRAD-41454) أو الهاتف أو الاسم..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={createCustomTime}
                    onChange={e => setCreateCustomTime(e.target.value)}
                    placeholder={`موعد هذا الطلب (افتراضي: ${createDefaultTime})`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSearchingOrder}
                    className="w-full h-full min-h-[42px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                  >
                    {isSearchingOrder ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>بحث</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Found Order Card */}
              {foundOrder && (
                <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-xs sm:text-sm text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30" dir="ltr">
                          #{foundOrder.order_code.replace(/^#/, '')}
                        </span>
                        <span className="font-bold text-white text-xs sm:text-sm">{foundOrder.customer_name}</span>
                        <a
                          href={`tel:${foundOrder.customer_phone}`}
                          className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1 hover:text-indigo-300"
                          dir="ltr"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{foundOrder.customer_phone}</span>
                        </a>
                      </div>
                      <div className="pt-1.5">
                        <span className="text-[11px] font-bold text-indigo-300 block mb-1">تفاصيل ومحتويات الطلب:</span>
                        <OrderItemsList text={foundOrder.items_summary} items={foundOrder.items} />
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1">
                        <strong className="text-slate-300">موعد التسليم: </strong>
                        <span className="text-indigo-300 font-mono font-bold">{createCustomTime || createDefaultTime}</span>
                      </p>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleAddFoundOrderToSheet}
                        className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة للكشف (Add to Sheet)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sheet Preview Table (Desktop) + Cards (Mobile/Tablet) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>معاينة الكشف الحالي (Sheet Preview)</span>
                  <span className="text-indigo-400 font-mono">({createSheetOrders.length} طلب مضاف)</span>
                </h3>
              </div>

              {createSheetOrders.length === 0 ? (
                <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-6 sm:p-8 text-center text-slate-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">لم تتم إضافة أي طلبات لهذا الكشف بعد.</p>
                  <p className="text-[11px] text-slate-600 mt-1">ابحث بالأعلى عن الطلبات واضغط &quot;إضافة للكشف&quot; لتجميعها هنا.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">#</th>
                          <th className="py-3 px-4 w-32 text-center">رقم الطلب</th>
                          <th className="py-3 px-4">اسم الطالب</th>
                          <th className="py-3 px-4 text-center">الهاتف</th>
                          <th className="py-3 px-4">تفاصيل الطلب</th>
                          <th className="py-3 px-4 text-center w-36">موعد التسليم</th>
                          <th className="py-3 px-4 w-20 text-center">إجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {createSheetOrders.map((ord, idx) => (
                          <tr key={ord.order_id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-amber-300">{ord.order_code}</td>
                            <td className="py-3 px-4 font-bold text-white">{ord.customer_name}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-400" dir="ltr">{ord.customer_phone}</td>
                            <td className="py-3 px-4 max-w-md">
                              <OrderItemsList text={ord.items_summary} items={ord.items} />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="text"
                                value={ord.delivery_time}
                                onChange={e => {
                                  const val = e.target.value;
                                  setCreateSheetOrders(prev => prev.map((item, i) => i === idx ? { ...item, delivery_time: val } : item));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-center text-indigo-200 focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderFromCreateSheet(ord.order_id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="حذف من الكشف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (< md) */}
                  <div className="md:hidden space-y-3">
                    {createSheetOrders.map((ord, idx) => (
                      <div key={ord.order_id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">#{idx + 1}</span>
                            <span className="font-mono font-black text-amber-300 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md" dir="ltr">
                              #{ord.order_code.replace(/^#/, '')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOrderFromCreateSheet(ord.order_id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="حذف من الكشف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                          <span className="font-bold text-white text-sm">{ord.customer_name}</span>
                          {ord.customer_phone && (
                            <a
                              href={`tel:${ord.customer_phone}`}
                              className="font-mono text-slate-300 text-xs flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{ord.customer_phone}</span>
                            </a>
                          )}
                        </div>

                        <div>
                          <OrderItemsList text={ord.items_summary} items={ord.items} />
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">موعد التسليم:</span>
                          <input
                            type="text"
                            value={ord.delivery_time}
                            onChange={e => {
                              const val = e.target.value;
                              setCreateSheetOrders(prev => prev.map((item, i) => i === idx ? { ...item, delivery_time: val } : item));
                            }}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-center text-indigo-200 focus:outline-none focus:border-indigo-500 w-36"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Actions Footer */}
              {createSheetOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400 text-center sm:text-right">
                    إجمالي الطلبات في الكشف: <strong className="text-white font-mono">{createSheetOrders.length}</strong>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handlePrintSheet({
                        id: 'preview',
                        name: createZoneName,
                        created_by: currentAdmin?.display_name || 'Admin',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        orders: createSheetOrders.map((o, i) => ({
                          id: 'preview-' + i,
                          zone_id: 'preview',
                          order_id: o.order_id,
                          order_code: o.order_code,
                          customer_name: o.customer_name,
                          customer_phone: o.customer_phone,
                          items_summary: o.items_summary,
                          delivery_time: o.delivery_time,
                          delivery_status: 'pending',
                          sort_order: i + 1,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        }))
                      })}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition min-h-[42px]"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الكشف</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingNewSheet}
                      onClick={handleSaveNewZoneSheet}
                      className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition min-h-[42px]"
                    >
                      {isSavingNewSheet ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>حفظ الكشف</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. SUB-SECTION TWO: ZONES DELIVERY                            */}
      {/* ============================================================= */}
      {subTab === 'delivery' && (
        <div className="space-y-6">
          {/* VIEW A: LIST OF ALL SHEETS & GLOBAL SEARCH (Only when NO sheet is opened) */}
          {!openedZoneId && (
            <div className="space-y-6">
              {/* ============================================================= */}
              {/* UNIFIED GLOBAL SEARCH: ADD-ONS, KIDS & ALL ZONES             */}
              {/* ============================================================= */}
              <div className="bg-gradient-to-br from-slate-900/95 via-indigo-950/20 to-slate-900/95 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>البحث الشامل في جميع الزونات والطلبات</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          <span>💎 Add-ons & أطفال</span>
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        مخصص لتسليم الملحقات (Add-ons) وملابس الأطفال أو تسليم طلبات أي كشف فوراً من مكان واحد وبأقل استهلاك للسيرفر.
                      </p>
                    </div>
                  </div>

                  {globalSearchResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalSearchResult(null);
                        setGlobalSearchFeedback(null);
                        setGlobalSearchInput('');
                      }}
                      className="self-end sm:self-auto text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>مسح النتيجة</span>
                    </button>
                  )}
                </div>

                {/* Search Input Form */}
                <form onSubmit={handleGlobalDeliverySearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={globalSearchInput}
                      onChange={e => setGlobalSearchInput(e.target.value)}
                      placeholder="أدخل كود الطلب (مثلاً 13357 أو GRAD-13357) أو رقم الهاتف أو اسم الطالب..."
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition shadow-inner font-mono"
                      dir="auto"
                    />
                    {globalSearchInput && (
                      <button
                        type="button"
                        onClick={() => setGlobalSearchInput('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isGlobalSearching}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition min-h-[44px]"
                  >
                    {isGlobalSearching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ البحث...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>بحث شامل</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Search Feedback Message */}
                {globalSearchFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                      globalSearchFeedback.type === 'found'
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                        : globalSearchFeedback.type === 'not_found'
                        ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                        : 'bg-indigo-950/40 border border-indigo-500/30 text-indigo-300'
                    }`}
                  >
                    {globalSearchFeedback.type === 'found' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : globalSearchFeedback.type === 'not_found' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                    <span>{globalSearchFeedback.message}</span>
                  </div>
                )}

                {/* Global Search Result Card */}
                {globalSearchResult && (
                  <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-4 space-y-3 shadow-xl animate-in zoom-in-95">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-black text-amber-300 text-sm bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
                          #{globalSearchResult.order_code?.replace(/^#/, '')}
                        </span>
                        <span className="font-bold text-white text-sm">
                          {globalSearchResult.customer_name}
                        </span>
                        {globalSearchResult.customer_phone && (
                          <a
                            href={`tel:${globalSearchResult.customer_phone}`}
                            className="font-mono text-slate-300 text-xs flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                            dir="ltr"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{globalSearchResult.customer_phone}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Zone Badge */}
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{globalSearchResult.zone_name || 'غير مضاف لكشف'}</span>
                        </span>

                        {/* Delivery Status Badge */}
                        {globalSearchResult.delivery_status === 'delivered' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم التسليم</span>
                          </span>
                        ) : globalSearchResult.delivery_status === 'partial' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            <span>تسليم جزئي</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>قيد التسليم</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items Breakdown */}
                    <div>
                      <OrderItemsList
                        text={globalSearchResult.items_summary}
                        items={globalSearchResult.items}
                        deliveredIndices={globalSearchResult.delivered_items}
                        orderStatus={globalSearchResult.delivery_status}
                      />
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400">
                        {globalSearchResult.delivered_at && (
                          <span>آخر تسليم: {new Date(globalSearchResult.delivered_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} ({globalSearchResult.delivered_by || 'Admin'})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const targetOrder: DeliveryZoneOrder = {
                              id: globalSearchResult.zone_order_id || globalSearchResult.order_id,
                              zone_id: globalSearchResult.zone_id || 'general',
                              zone_name: globalSearchResult.zone_name,
                              order_id: globalSearchResult.order_id,
                              order_code: globalSearchResult.order_code,
                              customer_name: globalSearchResult.customer_name,
                              customer_phone: globalSearchResult.customer_phone,
                              order_details: globalSearchResult.items_summary,
                              items_summary: globalSearchResult.items_summary,
                              items: globalSearchResult.items,
                              delivery_time: globalSearchResult.delivery_time || 'غير محدد',
                              delivery_status: globalSearchResult.delivery_status || 'pending',
                              delivered_items: globalSearchResult.delivered_items || [],
                              delivered_at: globalSearchResult.delivered_at,
                              delivered_by: globalSearchResult.delivered_by,
                              sort_order: 1,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            };
                            openItemDeliveryModal(targetOrder);
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تسليم / تحديد القطع</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* LIST OF ALL SHEETS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-400" />
                      <span>كشوفات التسليم المتاحة لجميع المشرفين</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      اختر كشف الزون الخاص بك لبدء تسليم أوردرات الطلاب ومتابعة نسبة الإنجاز لحظياً.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchZonesList}
                    disabled={isLoadingZones}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                    title="تحديث القائمة"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingZones ? 'animate-spin' : ''}`} />
                  </button>
                </div>

              {isLoadingZones && zones.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-400" />
                  <p className="text-xs">جارٍ تحميل كشوفات الزونات...</p>
                </div>
              ) : zones.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
                  <Layers className="w-10 h-10 mx-auto text-slate-600" />
                  <h3 className="text-sm font-bold text-white">لا توجد كشوفات تسليم منشأة بعد</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    ابدأ بإنشاء أول كشف زون لتوزيع أوردرات الخريجين وتسهيل عملية التسليم.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubTab('create')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء أول كشف زون الآن</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {zones.map(z => {
                    const total = z.total_orders || 0;
                    const delivered = z.delivered_orders || 0;
                    const pending = z.pending_orders !== undefined ? z.pending_orders : total - delivered;
                    const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

                    return (
                      <div
                        key={z.id}
                        className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-4 sm:p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm sm:text-base font-black text-white group-hover:text-indigo-300 transition">
                                {z.name}
                              </h3>
                              <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-slate-500" />
                                <span>أنشئ بواسطة: {z.created_by || 'Admin'}</span>
                              </p>
                            </div>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {progress}%
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
                              <span className="text-emerald-400 font-bold">{delivered} مستلم</span>
                              <span className="text-amber-400 font-bold">{pending} متبقي</span>
                              <span className="text-slate-400">إجمالي: {total}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3.5 mt-3.5 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDeliverySheet(z.id)}
                            className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition min-h-[42px]"
                          >
                            <span>فتح الكشف للتسليم</span>
                            <ArrowRight className="w-4 h-4 rotate-180" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSheet(z)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition min-h-[42px] min-w-[42px] flex items-center justify-center"
                            title="طباعة الكشف"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )}

          {/* VIEW B: INSIDE THE OPENED DELIVERY SHEET */}
          {openedZoneId && openedZone && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in">
              {/* Top Navigation & Sheet Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenedZoneId(null);
                        setOpenedZone(null);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex-shrink-0"
                      title="العودة لجميع الكشوفات"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                        <span>{openedZone.name}</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                          محطة التسليم الميداني
                        </span>
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        مشرف الكشف: <strong>{openedZone.created_by}</strong> &bull; تاريخ الإنشاء: {new Date(openedZone.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handlePrintSheet(openedZone)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition min-h-[40px]"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الكشف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeliverySheet(openedZone.id)}
                      disabled={isLoadingOpenedZone}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="تحديث البيانات"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingOpenedZone ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Sleek Horizontal Progress KPIs */}
                <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap font-bold">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-slate-500">إجمالي الطلبات:</span>
                      <span className="font-mono text-white font-black text-sm">{openedZone.total_orders || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span>تم التسليم:</span>
                      <span className="font-mono font-black text-sm">{openedZone.delivered_orders || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <span>قيد التسليم:</span>
                      <span className="font-mono font-black text-sm">{openedZone.pending_orders || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-400 text-[11px] font-bold">الإنجاز:</span>
                    <span className="font-mono font-black text-indigo-300 text-xs">
                      {openedZone.total_orders && openedZone.total_orders > 0
                        ? Math.round(((openedZone.delivered_orders || 0) / openedZone.total_orders) * 100)
                        : 0}%
                    </span>
                    <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${openedZone.total_orders && openedZone.total_orders > 0
                            ? Math.round(((openedZone.delivered_orders || 0) / openedZone.total_orders) * 100)
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEARCH ORDERS BY CODE (Critical Requirement) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 sm:space-y-4">
                <form onSubmit={handleDeliverySearchByCode} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={deliveryCodeSearch}
                      onChange={e => {
                        setDeliveryCodeSearch(e.target.value);
                        if (!e.target.value.trim()) {
                          setDeliverySearchFeedback(null);
                          setHighlightedOrderId(null);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleDeliverySearchByCode();
                        }
                      }}
                      placeholder="امسح الباركود أو اكتب الكود أو الاسم أو الموبايل واضغط Enter..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-12 pl-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 sm:px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition flex-shrink-0 min-h-[46px]"
                  >
                    <Search className="w-4 h-4" />
                    <span>بحث وتحديد الطلب</span>
                  </button>
                </form>

                {/* Search Feedback Message */}
                {deliverySearchFeedback && (
                  <div
                    className={`p-3 rounded-2xl border text-xs font-bold animate-in fade-in ${
                      deliverySearchFeedback.type === 'found'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 flex items-center gap-2.5'
                        : deliverySearchFeedback.type === 'external'
                        ? 'bg-indigo-950/60 text-white border-indigo-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/40 flex items-center gap-2.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {deliverySearchFeedback.type === 'found' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : deliverySearchFeedback.type === 'external' ? (
                        <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span>
                        {deliverySearchFeedback.message}
                        {deliverySearchFeedback.externalOrder && (
                          <span className="mr-1.5 font-bold text-amber-300">
                            - الطالب: {deliverySearchFeedback.externalOrder.customer_name} (#{deliverySearchFeedback.externalOrder.order_code})
                          </span>
                        )}
                      </span>
                    </div>

                    {deliverySearchFeedback.type === 'external' && deliverySearchFeedback.externalOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          const ord = deliverySearchFeedback.externalOrder;
                          const targetOrder: DeliveryZoneOrder = {
                            id: ord.zone_order_id || ord.order_id,
                            zone_id: ord.zone_id || 'general',
                            zone_name: ord.zone_name,
                            order_id: ord.order_id,
                            order_code: ord.order_code,
                            customer_name: ord.customer_name,
                            customer_phone: ord.customer_phone,
                            order_details: ord.items_summary,
                            items_summary: ord.items_summary,
                            items: ord.items,
                            delivery_time: ord.delivery_time || 'غير محدد',
                            delivery_status: ord.delivery_status || 'pending',
                            delivered_items: ord.delivered_items || [],
                            delivered_at: ord.delivered_at,
                            delivered_by: ord.delivered_by,
                            sort_order: 1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                          };
                          openItemDeliveryModal(targetOrder);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 shadow-md shadow-emerald-600/30"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تسليم القطع والملحقات الآن</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Filters */}
                {(() => {
                  const pendingCount = openedZone.orders?.filter(o => o.delivery_status === 'pending').length || 0;
                  const partialCount = openedZone.orders?.filter(o => o.delivery_status === 'partial').length || 0;
                  const deliveredCount = openedZone.orders?.filter(o => o.delivery_status === 'delivered').length || 0;

                  return (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
                      <span className="text-xs text-slate-400 font-bold ml-1 whitespace-nowrap">فلترة:</span>
                      <button
                        type="button"
                        onClick={() => setDeliveryFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-1 sm:flex-initial text-center ${
                          deliveryFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        الكل ({openedZone.orders?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryFilter('pending')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-1 sm:flex-initial text-center ${
                          deliveryFilter === 'pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        قيد التسليم ({pendingCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryFilter('partial')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-1 sm:flex-initial text-center ${
                          deliveryFilter === 'partial'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-950 text-amber-400/80 hover:text-amber-300 border border-slate-800'
                        }`}
                      >
                        تسليم جزئي ({partialCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryFilter('delivered')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex-1 sm:flex-initial text-center ${
                          deliveryFilter === 'delivered'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        تم التسليم ({deliveredCount})
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Orders Container (Desktop Table + Mobile Cards) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                {/* Desktop View Table (hidden on mobile, visible on md+) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950/90 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">#</th>
                        <th className="py-3.5 px-4 w-32 text-center">رقم الطلب</th>
                        <th className="py-3.5 px-4">اسم الطالب</th>
                        <th className="py-3.5 px-4 text-center">الهاتف</th>
                        <th className="py-3.5 px-4">تفاصيل الطلب</th>
                        <th className="py-3.5 px-4 text-center w-32">موعد التسليم</th>
                        <th className="py-3.5 px-4 text-center w-36">حالة التسليم</th>
                        <th className="py-3.5 px-4 text-center w-36">إجراء التسليم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {filteredOpenedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            لا توجد طلبات تطابق الفلتر الحالي في هذا الكشف.
                          </td>
                        </tr>
                      ) : (
                        filteredOpenedOrders.map((ord, idx) => {
                          const isDelivered = ord.delivery_status === 'delivered';
                          const isPartial = ord.delivery_status === 'partial';
                          const isPending = ord.delivery_status === 'pending';
                          const isHighlighted = highlightedOrderId === ord.order_id;
                          const isUpdating = statusUpdatingOrderId === ord.order_id;
                          const parsedItems = parseOrderDetailsToItems(ord.items_summary || ord.order_details, ord.items);
                          const totalItemsCount = parsedItems.length;
                          const deliveredItemsCount = isDelivered 
                            ? totalItemsCount 
                            : isPartial && ord.delivered_items 
                            ? ord.delivered_items.length 
                            : 0;

                          return (
                            <tr
                              key={ord.order_id}
                              ref={el => { orderRowRefs.current[ord.order_id] = el; }}
                              className={`transition-all duration-300 ${
                                isHighlighted
                                  ? 'bg-amber-500/20 ring-2 ring-amber-400 ring-inset'
                                  : isDelivered
                                  ? 'bg-emerald-950/15 hover:bg-emerald-950/30'
                                  : isPartial
                                  ? 'bg-amber-950/15 hover:bg-amber-950/30'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 px-4 text-center font-mono font-black text-amber-300">
                                #{ord.order_code.replace(/^#/, '')}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-white">
                                {ord.customer_name}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400" dir="ltr">
                                {ord.customer_phone}
                              </td>
                              <td className="py-3.5 px-4 max-w-md">
                                <OrderItemsList
                                  text={ord.items_summary || ord.order_details}
                                  items={ord.items}
                                  deliveredIndices={ord.delivered_items}
                                  orderStatus={ord.delivery_status}
                                />
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-indigo-300 font-bold">
                                {ord.delivery_time}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isDelivered ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>تم التسليم ({totalItemsCount}/{totalItemsCount})</span>
                                    </span>
                                    {ord.delivered_by && (
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        بواسطة: {ord.delivered_by}
                                      </span>
                                    )}
                                  </div>
                                ) : isPartial ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                      <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                                      <span>تسليم جزئي ({deliveredItemsCount}/{totalItemsCount})</span>
                                    </span>
                                    {ord.delivered_by && (
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        بواسطة: {ord.delivered_by}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 justify-center">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>قيد التسليم (0/{totalItemsCount})</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isDelivered ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {totalItemsCount > 1 && (
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => openItemDeliveryModal(ord)}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 transition"
                                        title="تعديل القطع المسلمة"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        <span>تعديل</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => setUndoModalOrder(ord)}
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-[11px] inline-flex items-center gap-1 transition"
                                      title="تراجع عن التسليم"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>تراجع</span>
                                    </button>
                                  </div>
                                ) : isPartial ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => openItemDeliveryModal(ord)}
                                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition"
                                      title="استكمال أو تعديل تسليم باقي القطع"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>تسليم الباقي</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => setUndoModalOrder(ord)}
                                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                                      title="إلغاء وإعادة للانتظار"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {totalItemsCount > 1 ? (
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => openItemDeliveryModal(ord)}
                                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                                      >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                        <span>اختيار القطع ({totalItemsCount})</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleMarkAsDelivered(ord, true)}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
                                      >
                                        {isUpdating ? (
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>تسليم الطلب</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards (md:hidden) - Optimized for smartphones & touch */}
                <div className="md:hidden divide-y divide-slate-800/80">
                  {filteredOpenedOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      لا توجد طلبات تطابق الفلتر الحالي في هذا الكشف.
                    </div>
                  ) : (
                    filteredOpenedOrders.map((ord, idx) => {
                      const isDelivered = ord.delivery_status === 'delivered';
                      const isPartial = ord.delivery_status === 'partial';
                      const isPending = ord.delivery_status === 'pending';
                      const isHighlighted = highlightedOrderId === ord.order_id;
                      const isUpdating = statusUpdatingOrderId === ord.order_id;
                      const parsedItems = parseOrderDetailsToItems(ord.items_summary || ord.order_details, ord.items);
                      const totalItemsCount = parsedItems.length;
                      const deliveredItemsCount = isDelivered 
                        ? totalItemsCount 
                        : isPartial && ord.delivered_items 
                        ? ord.delivered_items.length 
                        : 0;

                      return (
                        <div
                          key={ord.order_id}
                          ref={el => {
                            if (el) orderRowRefs.current[ord.order_id] = el;
                          }}
                          className={`p-4 space-y-3 transition-all duration-300 ${
                            isHighlighted
                              ? 'bg-amber-500/20 ring-2 ring-amber-400'
                              : isDelivered
                              ? 'bg-emerald-950/20'
                              : isPartial
                              ? 'bg-amber-950/20'
                              : 'bg-slate-900/50 hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Card Header: Order Code, Index, Status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                              <span className="font-mono font-black text-xs sm:text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg" dir="ltr">
                                #{ord.order_code.replace(/^#/, '')}
                              </span>
                            </div>

                            {isDelivered ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>تم التسليم بالكامل ({totalItemsCount}/{totalItemsCount})</span>
                              </span>
                            ) : isPartial ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                                <span>تسليم جزئي ({deliveredItemsCount}/{totalItemsCount})</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>قيد التسليم (0/{totalItemsCount})</span>
                              </span>
                            )}
                          </div>

                          {/* Student Info & Phone Call Link */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">اسم الطالب:</span>
                              <span className="font-bold text-white text-sm">{ord.customer_name}</span>
                            </div>
                            {ord.customer_phone && (
                              <a
                                href={`tel:${ord.customer_phone}`}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 hover:text-white text-xs font-mono font-bold transition active:bg-indigo-600/20"
                                dir="ltr"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{ord.customer_phone}</span>
                              </a>
                            )}
                          </div>

                          {/* Order Details / Items */}
                          <div className="pt-0.5">
                            <span className="text-[10px] text-slate-400 block font-medium mb-1">المحتويات:</span>
                            <OrderItemsList
                              text={ord.items_summary || ord.order_details}
                              items={ord.items}
                              deliveredIndices={ord.delivered_items}
                              orderStatus={ord.delivery_status}
                            />
                          </div>

                          {/* Delivery Time & Admin Meta */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                            <span className="text-[11px] text-slate-400">
                              موعد التسليم: <strong className="text-indigo-300 font-mono">{ord.delivery_time}</strong>
                            </span>
                            {ord.delivered_by && (
                              <span className="text-[10px] text-slate-400">
                                بواسطة: <span className="text-slate-200 font-bold">{ord.delivered_by}</span>
                              </span>
                            )}
                          </div>

                          {/* Action Button: Touch-optimized */}
                          <div className="pt-1">
                            {isDelivered ? (
                              <div className="flex items-center gap-2">
                                {totalItemsCount > 1 && (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => openItemDeliveryModal(ord)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>تعديل القطع المسلمة</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => setUndoModalOrder(ord)}
                                  className="flex-1 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span>تراجع عن التسليم</span>
                                </button>
                              </div>
                            ) : isPartial ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => openItemDeliveryModal(ord)}
                                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 transition active:scale-[0.99]"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>تسليم باقي القطع</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => setUndoModalOrder(ord)}
                                  className="py-3 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center transition active:scale-[0.99]"
                                  title="إلغاء وإعادة للانتظار"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                            ) : totalItemsCount > 1 ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => openItemDeliveryModal(ord)}
                                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-[0.98] min-h-[48px]"
                              >
                                <SlidersHorizontal className="w-5 h-5" />
                                <span>اختيار القطع المسلمة ({totalItemsCount} قطع)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleMarkAsDelivered(ord, true)}
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-[0.98] min-h-[48px]"
                              >
                                {isUpdating ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-5 h-5" />
                                    <span>تسليم الطلب للطالب الآن</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. SUB-SECTION THREE: ZONES EDIT                              */}
      {/* ============================================================= */}
      {subTab === 'edit' && (
        <div className="space-y-6">
          {!editingZoneId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                    <span>إدارة وتعديل كشوفات التسليم</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تعديل أسماء الكشوفات، إضافة أو حذف طلبات، إعادة ترتيب الأوردرات، والطباعة وإعادة التوليد.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchZonesList}
                  disabled={isLoadingZones}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingZones ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {zones.length === 0 ? (
                <div className="bg-slate-900 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                  <p className="text-xs">لا توجد كشوفات للتعديل. أنشئ كشفاً أولاً من تبويب إنشاء زون جديد.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {zones.map(z => {
                    const total = z.total_orders || 0;
                    const delivered = z.delivered_orders || 0;
                    const pending = z.pending_orders !== undefined ? z.pending_orders : total - delivered;

                    return (
                      <div
                        key={z.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <h3 className="text-sm sm:text-base font-black text-white">{z.name}</h3>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 space-y-0.5">
                            <p>أنشئ بواسطة: <strong className="text-slate-300">{z.created_by}</strong></p>
                            <p>تاريخ الإنشاء: <span className="font-mono">{new Date(z.created_at).toLocaleDateString('ar-EG')}</span></p>
                            <p>آخر تحديث: <span className="font-mono">{new Date(z.updated_at).toLocaleDateString('ar-EG')}</span></p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 text-[10px] sm:text-[11px] font-mono flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                              إجمالي: {total}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                              مستلم: {delivered}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                              متبقي: {pending}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: View, Edit, Print, Delete */}
                        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingZone(z.id)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition min-h-[42px]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل الكشف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSheet(z)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition min-h-[42px] min-w-[42px] flex items-center justify-center"
                            title="طباعة الكشف"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmZone(z)}
                            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition min-h-[42px] min-w-[42px] flex items-center justify-center"
                            title="حذف الكشف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EDITING INTERFACE FOR SELECTED ZONE */}
          {editingZoneId && editingZone && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 sm:space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingZoneId(null);
                      setEditingZone(null);
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex-shrink-0"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">تعديل كشف: {editingZone.name}</h2>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                      تعديل الاسم وإضافة/حذف طلبات. يحافظ التعديل على حالات التسليم السابقة.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleSaveEditZone}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition min-h-[42px]"
                  >
                    {isSavingEdit ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Edit Zone Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم الزون / الكشف
                </label>
                <input
                  type="text"
                  value={editZoneName}
                  onChange={e => setEditZoneName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Add Order to this Zone */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>إضافة طلب جديد إلى هذا الكشف</span>
                </h3>

                <form onSubmit={handleSearchOrderForEdit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={editSearchQuery}
                      onChange={e => setEditSearchQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchOrderForEdit();
                        }
                      }}
                      placeholder="رقم أو كود الطلب أو اسم الطالب أو الموبايل واضغط Enter..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={editSearchOrderTime}
                      onChange={e => setEditSearchOrderTime(e.target.value)}
                      placeholder="موعد التسليم (مثل: 10:00 ص - 11:30 ص)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isEditSearching}
                      className="w-full h-full min-h-[40px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      {isEditSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'بحث'}
                    </button>
                  </div>
                </form>

                {editFoundOrder && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-mono font-bold text-amber-300 ml-2" dir="ltr">#{editFoundOrder.order_code.replace(/^#/, '')}</span>
                      <span className="font-bold text-white ml-2">{editFoundOrder.customer_name}</span>
                      <span className="text-slate-400 font-mono" dir="ltr">{editFoundOrder.customer_phone}</span>
                      <div className="pt-1">
                        <OrderItemsList text={editFoundOrder.items_summary} items={editFoundOrder.items} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFoundOrderToEditZone}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex-shrink-0"
                    >
                      إضافة للكشف
                    </button>
                  </div>
                )}
              </div>

              {/* Orders in this Zone */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300">
                  الطلبات المدرجة في الكشف ({editingZone.orders?.length || 0} طلب)
                </h3>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">#</th>
                        <th className="py-3 px-3 w-32 text-center">رقم الطلب</th>
                        <th className="py-3 px-3">اسم الطالب</th>
                        <th className="py-3 px-3 text-center">الهاتف</th>
                        <th className="py-3 px-3">المحتويات</th>
                        <th className="py-3 px-3 text-center w-32">موعد التسليم</th>
                        <th className="py-3 px-3 text-center w-28">حالة الاستلام</th>
                        <th className="py-3 px-3 text-center w-24">ترتيب</th>
                        <th className="py-3 px-3 text-center w-16">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {editingZone.orders?.map((ord, idx) => {
                        const isDelivered = ord.delivery_status === 'delivered';
                        return (
                          <tr key={ord.order_id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">#{ord.order_code}</td>
                            <td className="py-3 px-3 font-bold text-white">{ord.customer_name}</td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400" dir="ltr">{ord.customer_phone}</td>
                            <td className="py-3 px-3 max-w-md">
                              <OrderItemsList text={ord.items_summary || ord.order_details} items={ord.items} />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="text"
                                value={ord.delivery_time}
                                onChange={e => {
                                  const val = e.target.value;
                                  setEditingZone(prev => {
                                    if (!prev || !prev.orders) return prev;
                                    const updated = prev.orders.map((o, i) => i === idx ? { ...o, delivery_time: val } : o);
                                    return { ...prev, orders: updated };
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-center text-indigo-200 focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isDelivered ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  مستلم ✅
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  قيد التسليم
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrderInEdit(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveOrderInEdit(idx, 'down')}
                                  disabled={idx === (editingZone.orders?.length || 1) - 1}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderFromEditZone(ord.order_id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="إزالة من الكشف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards (md:hidden) */}
                <div className="md:hidden space-y-3">
                  {editingZone.orders?.map((ord, idx) => {
                    const isDelivered = ord.delivery_status === 'delivered';
                    return (
                      <div key={ord.order_id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">#{idx + 1}</span>
                            <span className="font-mono font-black text-amber-300 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md" dir="ltr">
                              #{ord.order_code.replace(/^#/, '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDelivered ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                مستلم ✅
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                قيد التسليم
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderFromEditZone(ord.order_id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                              title="إزالة من الكشف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                          <span className="font-bold text-white text-sm">{ord.customer_name}</span>
                          {ord.customer_phone && (
                            <a
                              href={`tel:${ord.customer_phone}`}
                              className="font-mono text-slate-300 text-xs flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                              dir="ltr"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{ord.customer_phone}</span>
                            </a>
                          )}
                        </div>

                        <div>
                          <OrderItemsList text={ord.items_summary || ord.order_details} items={ord.items} />
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">الموعد:</span>
                            <input
                              type="text"
                              value={ord.delivery_time}
                              onChange={e => {
                                const val = e.target.value;
                                setEditingZone(prev => {
                                  if (!prev || !prev.orders) return prev;
                                  const updated = prev.orders.map((o, i) => i === idx ? { ...o, delivery_time: val } : o);
                                  return { ...prev, orders: updated };
                                });
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-center text-indigo-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {/* Touch-friendly reorder controls */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOrderInEdit(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="تحريك لأعلى"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOrderInEdit(idx, 'down')}
                              disabled={idx === (editingZone.orders?.length || 1) - 1}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="تحريك لأسفل"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ITEM-BY-ITEM DELIVERY MODAL */}
      {itemDeliveryModalOrder && (() => {
        const parsedItems = parseOrderDetailsToItems(
          itemDeliveryModalOrder.items_summary || itemDeliveryModalOrder.order_details,
          itemDeliveryModalOrder.items
        );
        const totalItems = parsedItems.length;
        const selectedCount = selectedItemIndices.length;
        const isAllSelected = totalItems > 0 && selectedCount === totalItems;
        const isNoneSelected = selectedCount === 0;

        // Group items for high visual order & speed
        const itemsWithIndex = parsedItems.map((item, index) => ({ item, index }));

        const garmentItems = itemsWithIndex.filter(({ item }) => {
          const isAddon = item.title.startsWith('ملحق:') || item.title.startsWith('إضافة:') || item.title.toLowerCase().includes('ملحق');
          const isKids = item.title.includes('اطفال') || item.title.includes('أطفال');
          return !isAddon && !isKids;
        });

        const kidsItems = itemsWithIndex.filter(({ item }) => {
          return item.title.includes('اطفال') || item.title.includes('أطفال');
        });

        const addonItems = itemsWithIndex.filter(({ item }) => {
          const isAddon = item.title.startsWith('ملحق:') || item.title.startsWith('إضافة:') || item.title.toLowerCase().includes('ملحق');
          const isKids = item.title.includes('اطفال') || item.title.includes('أطفال');
          return isAddon && !isKids;
        });

        // Any leftover goes with garments
        const classifiedIndices = new Set([
          ...garmentItems.map(x => x.index),
          ...kidsItems.map(x => x.index),
          ...addonItems.map(x => x.index)
        ]);
        const otherItems = itemsWithIndex.filter(x => !classifiedIndices.has(x.index));
        const allGarments = [...garmentItems, ...otherItems];

        // Item Card Renderer
        const renderItemCard = ({ item, index }: { item: ParsedOrderItem; index: number }, isCompactAddon = false) => {
          const isChecked = selectedItemIndices.includes(index);
          const cleanTitle = item.title.replace(/^(?:ملحق|إضافة):\s*/i, '').trim();

          return (
            <div
              key={index}
              onClick={() => handleToggleItemIndex(index)}
              className={`group select-none rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isCompactAddon ? 'p-2.5 sm:p-3' : 'p-3'
              } ${
                isChecked
                  ? 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-950/40 shadow-sm shadow-emerald-950/20'
                  : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/30 scale-105'
                      : 'border-slate-600 bg-slate-900/70 text-transparent group-hover:border-slate-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs sm:text-sm font-bold truncate ${isChecked ? 'text-white' : 'text-slate-200'}`}>
                      {cleanTitle}
                    </span>
                    {item.qty && item.qty > 1 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold text-[10px]">
                        ×{item.qty}
                      </span>
                    )}
                  </div>
                  {(item.size || item.customization) && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {item.size && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold text-[10px]" dir="ltr">
                          مقاس: {item.size}
                        </span>
                      )}
                      {item.customization && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30 text-[10px] font-medium truncate max-w-[220px]" title={item.customization}>
                          {item.customization}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0">
                {isChecked ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>مستلم</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
                    معلق
                  </span>
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-xl w-full shadow-2xl space-y-3.5 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      تحديد عناصر التسليم للطلب
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span className="font-mono font-bold text-amber-400">#{itemDeliveryModalOrder.order_code}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-200">{itemDeliveryModalOrder.customer_name}</span>
                      {itemDeliveryModalOrder.customer_phone && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 font-mono" dir="ltr">{itemDeliveryModalOrder.customer_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setItemDeliveryModalOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 text-xs">
                <div className="text-slate-400 text-xs flex items-center gap-1.5">
                  <span>اختر القطع المسلّمة:</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-mono font-bold text-[11px]">
                    {selectedCount} / {totalItems}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedItemIndices(parsedItems.map((_, i) => i))}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-[11px] transition"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItemIndices([])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-[11px] transition"
                  >
                    إلغاء التحديد
                  </button>
                  {allGarments.length > 0 && addonItems.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIndices(allGarments.map(x => x.index))}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border border-blue-500/30 font-bold text-[11px] transition"
                        title="تحديد قطع الملابس فقط"
                      >
                        الملابس فقط
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIndices(addonItems.map(x => x.index))}
                        className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 font-bold text-[11px] transition"
                        title="تحديد الملحقات فقط"
                      >
                        الملحقات فقط
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items Checklist Grouped (Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
                {/* 1. Main Garments */}
                {allGarments.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-indigo-300">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-400" />
                        <span>الملابس والقطع الرئيسية ({allGarments.length})</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {allGarments.map(entry => renderItemCard(entry, false))}
                    </div>
                  </div>
                )}

                {/* 2. Kids Garments */}
                {kidsItems.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-sky-300">
                      <div className="flex items-center gap-1.5">
                        <span>👶</span>
                        <span>ملابس الأطفال ({kidsItems.length})</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {kidsItems.map(entry => renderItemCard(entry, false))}
                    </div>
                  </div>
                )}

                {/* 3. Add-ons & Accessories (Grid) */}
                {addonItems.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-purple-300">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>الملحقات والإضافات ({addonItems.length})</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {addonItems.map(entry => renderItemCard(entry, true))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Outcome & Progress Bar */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="text-slate-400 font-medium">حالة الطلب بعد الحفظ:</span>
                  {isAllSelected ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تسليم كامل (جميع القطع مستلمة {selectedCount}/{totalItems})</span>
                    </span>
                  ) : isNoneSelected ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[11px] inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>قيد التسليم (لم يستلم أي قطعة بعد 0/{totalItems})</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[11px] inline-flex items-center gap-1">
                      <Package className="w-3.5 h-3.5" />
                      <span>تسليم جزئي ({selectedCount} من {totalItems} قطع)</span>
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isAllSelected ? 'bg-emerald-500' : isNoneSelected ? 'bg-slate-700' : 'bg-amber-500'
                    }`}
                    style={{ width: `${totalItems > 0 ? (selectedCount / totalItems) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setItemDeliveryModalOrder(null)}
                  disabled={isSavingItemDelivery}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveItemDelivery}
                  disabled={isSavingItemDelivery}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isSavingItemDelivery ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        {isAllSelected
                          ? 'تأكيد التسليم الكامل'
                          : isNoneSelected
                          ? 'حفظ كمعلق (0 قطع)'
                          : `تأكيد تسليم (${selectedCount}) قطع`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM UNDO DELIVERY MODAL */}
      {undoModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد التراجع عن تسليم الطلب</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في التراجع عن تسليم طلب الطالب{' '}
              <strong className="text-white font-bold">{undoModalOrder.customer_name}</strong> (#{undoModalOrder.order_code})
              وإعادة حالته إلى <span className="text-amber-400 font-bold">&quot;قيد التسليم&quot;</span>؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUndoModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmUndoDelivery}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
              >
                تأكيد التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SHEET MODAL */}
      {deleteConfirmZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-white">تأكيد حذف كشف التسليم</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف كشف التسليم{' '}
              <strong className="text-white font-bold">&quot;{deleteConfirmZone.name}&quot;</strong>؟
            </p>
            <p className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-2.5">
              🛡️ <strong>ملاحظة أمان:</strong> حذف هذا الكشف لن يؤثر إطلاقاً على طلبات المتجر الأصلية ولن يحذف أي بيانات طلاب من قاعدة البيانات.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmZone(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteZoneConfirmed}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
              >
                حذف الكشف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

