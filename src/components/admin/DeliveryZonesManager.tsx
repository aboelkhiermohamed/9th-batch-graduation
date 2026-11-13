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

  // -------------------------------------------------------------
  // SUB-SECTION 2: ZONES DELIVERY STATE
  // -------------------------------------------------------------
  const [openedZoneId, setOpenedZoneId] = useState<string | null>(null);
  const [openedZone, setOpenedZone] = useState<DeliveryZone | null>(null);
  const [isLoadingOpenedZone, setIsLoadingOpenedZone] = useState(false);
  const [deliveryCodeSearch, setDeliveryCodeSearch] = useState('');
  const [deliverySearchFeedback, setDeliverySearchFeedback] = useState<{ type: 'found' | 'not_found'; message: string } | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'pending' | 'delivered'>('all');
  const [statusUpdatingOrderId, setStatusUpdatingOrderId] = useState<string | null>(null);
  const [undoModalOrder, setUndoModalOrder] = useState<DeliveryZoneOrder | null>(null);

  // Ref for table rows scrolling
  const orderRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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

      // Reset form
      setCreateSheetOrders([]);
      setCreateZoneName('Zone B - كشف جديد');
      setFoundOrder(null);

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

  const handleDeliverySearchByCode = (e?: React.FormEvent) => {
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
      setDeliverySearchFeedback({
        type: 'not_found',
        message: `⚠️ الطلب أو العميل "${deliveryCodeSearch}" غير موجود في هذا الزون! تأكد من رقم الزون أو راجع شيت المشاكل.`
      });
    }
  };

  // Mark an order as delivered
  const handleMarkAsDelivered = async (order: DeliveryZoneOrder) => {
    if (!openedZoneId || !openedZone) return;

    try {
      setStatusUpdatingOrderId(order.order_id);

      // Optimistic update
      const now = new Date().toISOString();
      const adminName = currentAdmin?.display_name || 'Admin';

      setOpenedZone(prev => {
        if (!prev || !prev.orders) return prev;
        const updatedOrders = prev.orders.map(o => {
          if (o.order_id === order.order_id) {
            return {
              ...o,
              delivery_status: 'delivered' as const,
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

      // Send PATCH to API
      const res = await fetch(`/api/admin/zones/${openedZoneId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.order_id,
          status: 'delivered',
          adminName
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحديث حالة التسليم');
      }

      showToast(`تم تأكيد تسليم طلب الطالب: ${order.customer_name} (#${order.order_code}) ✅`, 'success');

      // Update in background list as well
      setZones(prev => prev.map(z => {
        if (z.id === openedZoneId) {
          const total = z.total_orders || 0;
          const delivered = (z.delivered_orders || 0) + 1;
          return { ...z, delivered_orders: delivered, pending_orders: Math.max(0, total - delivered) };
        }
        return z;
      }));
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
      showToast('تعذر حفظ حالة التسليم، يرجى المحاولة ثانية', 'error');
      // Rollback: reload zone
      openDeliverySheet(openedZoneId);
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
          adminName: currentAdmin?.display_name || 'Admin'
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

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #64748b;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: 900; font-size: 13px; color: #0f172a; text-align: center;">${ord.order_code}</td>
          <td style="font-weight: 700; color: #0f172a;">${ord.customer_name}</td>
          <td style="font-family: monospace; font-size: 11px; color: #334155; text-align: center;" dir="ltr">${ord.customer_phone}</td>
          <td style="font-size: 11px; color: #1e293b; line-height: 1.4;">${ord.items_summary || ord.order_details || 'بدون تفاصيل'}</td>
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <span>إدارة زونات ومحطات التسليم</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    Delivery Zones
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  تقسيم أوردرات الدفعة على زونات ومحطات، تنظيم مواعيد التسليم، البحث السريع بالأكواد، وتوثيق استلام كل طالب لحظياً.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3">
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 font-bold">عدد الزونات</span>
                <span className="font-mono font-black text-sm text-indigo-400">{zones.length}</span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 font-bold">إجمالي الأوردرات</span>
                <span className="font-mono font-black text-sm text-white">
                  {zones.reduce((acc, z) => acc + (z.total_orders || 0), 0)}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div className="text-center">
                <span className="block text-[10px] text-emerald-400 font-bold">تم التسليم</span>
                <span className="font-mono font-black text-sm text-emerald-400">
                  {zones.reduce((acc, z) => acc + (z.delivered_orders || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-SECTION TABS (The 3 Sub-sections required)                */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto pb-1">
          <button
            onClick={() => setSubTab('delivery')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
              subTab === 'delivery'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${subTab === 'delivery' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>2. محطة تسليم الزونات (Zones Delivery)</span>
            {zones.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-black">
                {zones.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('create')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
              subTab === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <Plus className={`w-4 h-4 ${subTab === 'create' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>1. إنشاء زون جديد (Create Zones)</span>
          </button>

          <button
            onClick={() => setSubTab('edit')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
              subTab === 'edit'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${subTab === 'edit' ? 'text-amber-300' : 'text-slate-400'}`} />
            <span>3. إدارة وتعديل الكشوفات (Zones Edit)</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. SUB-SECTION ONE: CREATE ZONES                              */}
      {/* ============================================================= */}
      {subTab === 'create' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>إنشاء كشف زون تسليم جديد</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  اكتب اسم الزون، وابحث عن الطلبات بالرقم أو الكود لإضافتها إلى الكشف مباشرة، ثم احفظ الكشف.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateSheetOrders([]);
                    setFoundOrder(null);
                    setCreateSearchQuery('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  تفريغ النموذج
                </button>
              </div>
            </div>

            {/* Zone Name & Default Time Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>البحث المباشر عن الطلب في قاعدة البيانات</span>
              </h3>

              <form onSubmit={handleSearchOrderForCreate} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-6">
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
                    placeholder="أدخل كود الطلب (مثل 41454 أو GRAD-41454) أو رقم الهاتف أو اسم الطالب واضغط Enter..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={createCustomTime}
                    onChange={e => setCreateCustomTime(e.target.value)}
                    placeholder={`موعد هذا الطلب (افتراضي: ${createDefaultTime})`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="md:col-span-2">
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
                <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                          #{foundOrder.order_code}
                        </span>
                        <span className="font-bold text-white text-sm">{foundOrder.customer_name}</span>
                        <span className="text-xs font-mono text-slate-400" dir="ltr">{foundOrder.customer_phone}</span>
                      </div>
                      <p className="text-xs text-indigo-200">
                        <strong className="text-indigo-300 font-bold">المحتويات: </strong>
                        {foundOrder.items_summary}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">موعد التسليم: </strong>
                        {createCustomTime || createDefaultTime}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleAddFoundOrderToSheet}
                        className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة للكشف (Add to Sheet)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sheet Preview Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>معاينة الكشف الحالي (Sheet Preview)</span>
                  <span className="text-indigo-400 font-mono">({createSheetOrders.length} طلب مضاف)</span>
                </h3>
              </div>

              {createSheetOrders.length === 0 ? (
                <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">لم تتم إضافة أي طلبات لهذا الكشف بعد.</p>
                  <p className="text-[11px] text-slate-600 mt-1">ابحث بالأعلى عن الطلبات واضغط &quot;إضافة للكشف&quot; لتجميعها هنا.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
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
                          <td className="py-3 px-4 text-[11px] text-slate-300 max-w-xs">{ord.items_summary}</td>
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
              )}

              {/* Actions Footer */}
              {createSheetOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    إجمالي الطلبات في الكشف: <strong className="text-white font-mono">{createSheetOrders.length}</strong>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
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
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الكشف</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSavingNewSheet}
                      onClick={handleSaveNewZoneSheet}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition flex-1 sm:flex-initial"
                    >
                      {isSavingNewSheet ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>حفظ كشف التسليم (Save Sheet)</span>
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
          {/* VIEW A: LIST OF ALL SHEETS */}
          {!openedZoneId && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones.map(z => {
                    const total = z.total_orders || 0;
                    const delivered = z.delivered_orders || 0;
                    const pending = z.pending_orders !== undefined ? z.pending_orders : total - delivered;
                    const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

                    return (
                      <div
                        key={z.id}
                        className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition">
                                {z.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <User className="w-3.5 h-3.5 text-slate-500" />
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
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-emerald-400 font-bold">{delivered} مستلم</span>
                              <span className="text-amber-400 font-bold">{pending} متبقي</span>
                              <span className="text-slate-400">إجمالي: {total}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDeliverySheet(z.id)}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition"
                          >
                            <span>فتح الكشف للتسليم</span>
                            <ArrowRight className="w-4 h-4 rotate-180" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSheet(z)}
                            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
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
          )}

          {/* VIEW B: INSIDE THE OPENED DELIVERY SHEET */}
          {openedZoneId && openedZone && (
            <div className="space-y-6 animate-in fade-in">
              {/* Top Navigation & Sheet Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenedZoneId(null);
                        setOpenedZone(null);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title="العودة لجميع الكشوفات"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <span>{openedZone.name}</span>
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold">
                          محطة التسليم الميداني
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        مشرف الكشف: <strong>{openedZone.created_by}</strong> &bull; تاريخ الإنشاء: {new Date(openedZone.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintSheet(openedZone)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الكشف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeliverySheet(openedZone.id)}
                      disabled={isLoadingOpenedZone}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="تحديث البيانات"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingOpenedZone ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Progress KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                    <span className="block text-[11px] text-slate-400 font-bold">إجمالي الطلبات</span>
                    <span className="font-mono font-black text-lg text-white">{openedZone.total_orders || 0}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-emerald-900/40 rounded-2xl p-3 text-center">
                    <span className="block text-[11px] text-emerald-400 font-bold">تم التسليم ✅</span>
                    <span className="font-mono font-black text-lg text-emerald-400">{openedZone.delivered_orders || 0}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-amber-900/40 rounded-2xl p-3 text-center">
                    <span className="block text-[11px] text-amber-400 font-bold">قيد التسليم ⏳</span>
                    <span className="font-mono font-black text-lg text-amber-400">{openedZone.pending_orders || 0}</span>
                  </div>
                  <div className="bg-slate-950/80 border border-indigo-900/40 rounded-2xl p-3 text-center">
                    <span className="block text-[11px] text-indigo-400 font-bold">نسبة الإنجاز</span>
                    <span className="font-mono font-black text-lg text-indigo-300">
                      {openedZone.total_orders && openedZone.total_orders > 0
                        ? Math.round(((openedZone.delivered_orders || 0) / openedZone.total_orders) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* SEARCH ORDERS BY CODE (Critical Requirement) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <form onSubmit={handleDeliverySearchByCode} className="flex flex-col sm:flex-row gap-3">
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
                      placeholder="امسح الباركود بالكاميرا أو اكتب كود الطلب أو اسم الطالب أو الموبايل واضغط Enter..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-12 pl-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition flex-shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    <span>بحث وتحديد الطلب</span>
                  </button>
                </form>

                {/* Search Feedback Message */}
                {deliverySearchFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in ${
                      deliverySearchFeedback.type === 'found'
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {deliverySearchFeedback.type === 'found' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span>{deliverySearchFeedback.message}</span>
                  </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 font-bold ml-2">فلترة الكشف:</span>
                  <button
                    type="button"
                    onClick={() => setDeliveryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      deliveryFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    الكل ({openedZone.total_orders || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      deliveryFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    قيد التسليم ({openedZone.pending_orders || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryFilter('delivered')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      deliveryFilter === 'delivered'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    تم التسليم ({openedZone.delivered_orders || 0})
                  </button>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
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
                          const isHighlighted = highlightedOrderId === ord.order_id;
                          const isUpdating = statusUpdatingOrderId === ord.order_id;

                          return (
                            <tr
                              key={ord.order_id}
                              ref={el => { orderRowRefs.current[ord.order_id] = el; }}
                              className={`transition-all duration-300 ${
                                isHighlighted
                                  ? 'bg-amber-500/20 ring-2 ring-amber-400 ring-inset'
                                  : isDelivered
                                  ? 'bg-emerald-950/15 hover:bg-emerald-950/30'
                                  : 'hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 px-4 text-center font-mono font-black text-amber-300">
                                #{ord.order_code}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-white">
                                {ord.customer_name}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400" dir="ltr">
                                {ord.customer_phone}
                              </td>
                              <td className="py-3.5 px-4 text-[11px] text-slate-300 max-w-xs leading-relaxed">
                                {ord.items_summary || ord.order_details}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-indigo-300 font-bold">
                                {ord.delivery_time}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isDelivered ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>تم التسليم</span>
                                    </span>
                                    {ord.delivered_by && (
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        بواسطة: {ord.delivered_by}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 justify-center">
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>قيد التسليم</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isDelivered ? (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => setUndoModalOrder(ord)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] inline-flex items-center gap-1 transition"
                                    title="تراجع عن التسليم"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>تراجع</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleMarkAsDelivered(ord)}
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
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones.map(z => {
                    const total = z.total_orders || 0;
                    const delivered = z.delivered_orders || 0;
                    const pending = z.pending_orders !== undefined ? z.pending_orders : total - delivered;

                    return (
                      <div
                        key={z.id}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <h3 className="text-base font-black text-white">{z.name}</h3>
                          <div className="text-[11px] text-slate-400 space-y-1">
                            <p>أنشئ بواسطة: <strong className="text-slate-300">{z.created_by}</strong></p>
                            <p>تاريخ الإنشاء: <span className="font-mono">{new Date(z.created_at).toLocaleDateString('ar-EG')}</span></p>
                            <p>آخر تحديث: <span className="font-mono">{new Date(z.updated_at).toLocaleDateString('ar-EG')}</span></p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 text-[11px] font-mono">
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
                            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل الكشف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSheet(z)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="طباعة الكشف"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmZone(z)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingZoneId(null);
                      setEditingZone(null);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-white">تعديل كشف: {editingZone.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تعديل الاسم وإضافة/حذف طلبات. لاحظ أن التعديل يحافظ على حالات التسليم السابقة ولا يحذف أي طلب من المتجر.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={handleSaveEditZone}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
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
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>إضافة طلب جديد إلى هذا الكشف</span>
                </h3>

                <form onSubmit={handleSearchOrderForEdit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={editSearchOrderTime}
                      onChange={e => setEditSearchOrderTime(e.target.value)}
                      placeholder="موعد التسليم (مثل: 10:00 ص - 11:30 ص)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={isEditSearching}
                      className="w-full h-full min-h-[36px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      {isEditSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'بحث'}
                    </button>
                  </div>
                </form>

                {editFoundOrder && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-mono font-bold text-amber-300 ml-2">#{editFoundOrder.order_code}</span>
                      <span className="font-bold text-white ml-2">{editFoundOrder.customer_name}</span>
                      <span className="text-slate-400 font-mono" dir="ltr">{editFoundOrder.customer_phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFoundOrderToEditZone}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
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

                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
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
                            <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs">{ord.items_summary}</td>
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
              </div>
            </div>
          )}
        </div>
      )}

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

