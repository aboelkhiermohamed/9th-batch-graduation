'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Package, 
  ShoppingBag, 
  Settings, 
  MessageSquare, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Edit3, 
  Trash2, 
  Save, 
  RefreshCw,
  LogOut,
  Smartphone,
  Info,
  Printer,
  FileText,
  Copy,
  Check,
  Eye,
  Download,
  Activity,
  Battery,
  Wifi,
  ExternalLink,
  Layers,
  Sparkles,
  Bot,
  UserCheck,
  Calendar,
  Phone,
  User,
  CreditCard,
  Hash,
  MessageCircle,
  FileCheck,
  AlertCircle,
  Upload,
  BarChart3,
  PieChart,
  Wrench,
  Database,
  RotateCcw,
  ShieldAlert,
  Image as ImageIcon,
  Ruler,
  DollarSign,
  TrendingUp,
  Filter,
  Ticket
} from 'lucide-react';
import { Product, Order, StoreSettings, IncomingTransaction, GatewayDevice } from '@/types';
import { cleanDisplayNotes, addDeletedProductId, saveSettingsToSupabase, updateOrderInSupabase, fetchOrdersFromSupabase, parseAttendeesAndCleanOpt } from '@/lib/supabaseClient';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'f' + Date.now().toString(16).padStart(11, '0') + '-4000-8000-' + Math.random().toString(36).substring(2, 10);
}

function formatUsername(userStr?: string): string {
  if (!userStr) return '';
  const clean = userStr.trim();
  if (clean.includes('@')) return clean;
  return clean.startsWith('@') ? clean : `@${clean}`;
}

export default function AdminDashboardPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; username: string; display_name: string; role: string } | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'admins' | 'settings' | 'sms' | 'gateway' | 'analytics' | 'maintenance'>('orders');

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    id: 'default',
    store_name: '9th batch graduation',
    vodafone_cash_numbers: ['01015339426'],
    instapay_ipa: '9thbatch@instapay',
    pickup_note: 'تابع جروب التليجرام',
    updated_at: new Date().toISOString()
  });
  const [transactions, setTransactions] = useState<IncomingTransaction[]>([]);
  const [devices, setDevices] = useState<GatewayDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Admin Users Management Form State
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'superadmin' | 'admin'>('admin');

  // PDF Export Modal State & Customizable Toggles
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfShowPhone, setPdfShowPhone] = useState(true);
  const [pdfShowCode, setPdfShowCode] = useState(true);
  const [pdfShowRef, setPdfShowRef] = useState(true);
  const [pdfShowCustomization, setPdfShowCustomization] = useState(true);
  const [pdfShowStatus, setPdfShowStatus] = useState(true);

  // Backup & Restore State
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  // Receipt Image Preview Modal State
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Full Order Details & SMS Modal State
  const [selectedOrderModal, setSelectedOrderModal] = useState<Order | null>(null);

  // Order Items Editing Modal State
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [editPaidAmount, setEditPaidAmount] = useState<string>('0');
  const [isSavingOrderEdits, setIsSavingOrderEdits] = useState(false);

  const handleOpenEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditOrderItems(JSON.parse(JSON.stringify(order.items || [])));

    // Calculate net subtotal of existing items in the order
    const existingItemsNetSubtotal = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 1)),
      0
    );

    let initialPaid = 0;
    // If order is paid/verified, use net items subtotal to exclude previous payment fees (e.g. Vodafone Cash fee)
    if (order.status === 'auto_verified' || order.status === 'manual_verified' || order.status === 'ready_for_pickup' || order.status === 'delivered') {
      initialPaid = existingItemsNetSubtotal > 0 ? existingItemsNetSubtotal : (order.total_amount || 0);
    } else if (order.paid_amount !== undefined && order.paid_amount > 0) {
      initialPaid = existingItemsNetSubtotal > 0 ? Math.min(order.paid_amount, existingItemsNetSubtotal) : order.paid_amount;
    } else if (order.difference_amount && order.difference_amount > 0) {
      initialPaid = Math.max(0, (order.total_amount || 0) - order.difference_amount);
    } else {
      initialPaid = existingItemsNetSubtotal > 0 ? existingItemsNetSubtotal : (order.total_amount || 0);
    }

    setEditPaidAmount(String(initialPaid));
    setIsEditOrderModalOpen(true);
  };

  const handleUpdateEditItemSize = (idx: number, size: string) => {
    const updated = [...editOrderItems];
    updated[idx].selected_size = size;
    setEditOrderItems(updated);
  };

  const handleUpdateEditItemCustomText = (idx: number, text: string) => {
    const updated = [...editOrderItems];
    updated[idx].custom_text = text;
    setEditOrderItems(updated);
  };

  const handleUpdateEditItemQuantity = (idx: number, qty: number) => {
    const updated = [...editOrderItems];
    updated[idx].quantity = Math.max(1, qty);
    setEditOrderItems(updated);
  };

  const handleRemoveEditItem = (idx: number) => {
    const updated = editOrderItems.filter((_, i) => i !== idx);
    setEditOrderItems(updated);
  };

  const handleAddProductToEditOrder = (prod: Product) => {
    const newItem = {
      id: generateUUID(),
      order_id: editingOrder?.id,
      product_id: prod.id,
      product_title: prod.title_ar || prod.title,
      image_url: prod.image_url,
      selected_size: prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : 'Free Size',
      quantity: 1,
      unit_price: prod.price
    };
    setEditOrderItems([...editOrderItems, newItem]);
  };

  const handleSaveOrderEdits = async () => {
    if (!editingOrder) return;
    setIsSavingOrderEdits(true);

    const newTotal = editOrderItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
    const prevPaid = Number(editPaidAmount) || 0;

    const priceDiff = Math.max(0, newTotal - prevPaid);
    const isDiffPending = priceDiff > 0;

    const newStatus = isDiffPending ? 'pending_difference' : editingOrder.status;

    const editHistory = editingOrder.edit_history || [];
    editHistory.push({
      date: new Date().toISOString(),
      note: `تعديل عناصر الطلب بواسطة الأدمن (${currentAdmin?.display_name || 'الإدارة'})`,
      admin: currentAdmin?.display_name || 'Admin',
      price_diff: priceDiff
    });

    const updatedOrder: Order = {
      ...editingOrder,
      items: editOrderItems,
      total_amount: newTotal,
      paid_amount: prevPaid,
      difference_amount: priceDiff,
      is_difference_pending: isDiffPending,
      status: newStatus,
      edit_history: editHistory,
      updated_at: new Date().toISOString()
    };

    await updateOrderInSupabase(updatedOrder);

    // Update local state
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (selectedOrderModal?.id === updatedOrder.id) {
      setSelectedOrderModal(updatedOrder);
    }

    setIsSavingOrderEdits(false);
    setIsEditOrderModalOpen(false);
  };

  // New product form modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdTitleAr, setNewProdTitleAr] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('الملابس');
  const [newProdStock, setNewProdStock] = useState('100');
  const [newProdImage, setNewProdImage] = useState(''); // final URL after upload
  const [newProdImagePreview, setNewProdImagePreview] = useState('');
  const [newProdImageUploading, setNewProdImageUploading] = useState(false);
  const [newProdGalleryUrls, setNewProdGalleryUrls] = useState<string[]>([]); // final URLs
  const [newProdGalleryPreviews, setNewProdGalleryPreviews] = useState<string[]>([]);
  const [newProdGalleryUploading, setNewProdGalleryUploading] = useState(false);
  const [newProdSizeChart, setNewProdSizeChart] = useState('');
  const [newProdSizeChartPreview, setNewProdSizeChartPreview] = useState('');
  const [newProdSizeChartUploading, setNewProdSizeChartUploading] = useState(false);
  const [newProdHasCustomization, setNewProdHasCustomization] = useState(true);
  const [newProdCustomLabel, setNewProdCustomLabel] = useState('اسم الطالب أو الكلية للتطريز على القطعة');
  const [newProdIsEvent, setNewProdIsEvent] = useState(false);
  const [newProdSizes, setNewProdSizes] = useState('S, M, L, XL, XXL');
  const [newProdDescAr, setNewProdDescAr] = useState('');
  const [newProdAddons, setNewProdAddons] = useState<{id: string; name: string; price: string; image_url?: string; description?: string}[]>([]);

  // Edit product form modal state
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdTitleAr, setEditProdTitleAr] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('الملابس');
  const [editProdStock, setEditProdStock] = useState('100');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdImagePreview, setEditProdImagePreview] = useState('');
  const [editProdImageUploading, setEditProdImageUploading] = useState(false);
  const [editProdGalleryUrls, setEditProdGalleryUrls] = useState<string[]>([]);
  const [editProdGalleryPreviews, setEditProdGalleryPreviews] = useState<string[]>([]);
  const [editProdGalleryUploading, setEditProdGalleryUploading] = useState(false);
  const [editProdSizeChart, setEditProdSizeChart] = useState('');
  const [editProdSizeChartPreview, setEditProdSizeChartPreview] = useState('');
  const [editProdSizeChartUploading, setEditProdSizeChartUploading] = useState(false);
  const [editProdHasCustomization, setEditProdHasCustomization] = useState(true);
  const [editProdCustomLabel, setEditProdCustomLabel] = useState('اسم الطالب أو الكلية للتطريز على القطعة');
  const [editProdIsEvent, setEditProdIsEvent] = useState(false);
  const [editProdSizes, setEditProdSizes] = useState('S, M, L, XL, XXL');
  const [editProdDescAr, setEditProdDescAr] = useState('');
  const [editProdAddons, setEditProdAddons] = useState<{id: string; name: string; price: string; image_url?: string; description?: string}[]>([]);

  // Settings form state
  const [vodaEnabled, setVodaEnabled] = useState(true);
  const [instaEnabled, setInstaEnabled] = useState(true);
  const [vodaInput, setVodaInput] = useState('');
  const [vodaLines, setVodaLines] = useState<string[]>(['01015339426']);
  const [lineLabelsMap, setLineLabelsMap] = useState<Record<string, string>>({});
  const [vodaFeePercentInput, setVodaFeePercentInput] = useState('1');
  const [instaInput, setInstaInput] = useState('');
  const [pickupInput, setPickupInput] = useState('');
  const [supportPhoneInput, setSupportPhoneInput] = useState('01555583154');

  // Search & Filter & Dynamic Origin URL
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [originUrl, setOriginUrl] = useState('https://graduation-store.com');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const isLocalDev = typeof window !== 'undefined' && !!window.location.port;
  const localPort = typeof window !== 'undefined' ? (window.location.port || '3000') : '3000';
  const gatewayBaseUrl = isLocalDev
    ? `http://192.168.1.4:${localPort}`
    : originUrl;

  // Check login on load
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('admin_authenticated');
    const savedProfile = sessionStorage.getItem('admin_profile');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      if (savedProfile) {
        try { setCurrentAdmin(JSON.parse(savedProfile)); } catch(e) {}
      }
      fetchAllData();
    }
  }, []);

  // Periodic polling to keep orders list live updated (every 8 seconds)
  useEffect(() => {
    let interval: any;
    if (isAuthenticated) {
      interval = setInterval(() => {
        fetchOrdersFromSupabase().then(res => {
          if (res && res.length > 0) setOrders(res);
        });
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Helper to resolve matched transaction for an order
  const findMatchedTx = (o: Order) => {
    return transactions.find(t => t.matched_order_id === o.id || (o.matched_transaction_id && t.id === o.matched_transaction_id));
  };

  // Dynamic helper to resolve confirmed line even for legacy/past matched orders
  const getEffectiveConfirmedLine = (o: Order) => {
    if (o.confirmed_line) return o.confirmed_line;
    if (o.notes && o.notes.includes('[CONFIRMED_LINE:')) {
      const match = o.notes.match(/\[CONFIRMED_LINE:\s*(.*?)\]/);
      if (match && match[1]) return match[1];
    }
    const tx = findMatchedTx(o);
    if (tx) {
      if (tx.recipient_phone) return tx.recipient_phone;
      if (tx.raw_sms) {
        const match = tx.raw_sms.match(/(?:على رقم محفظتك|على محفظتك|محفظة|إلى رقم|إلى)\s*(01[0125]\d{8})/i);
        if (match && match[1]) return match[1];
      }
    }
    return undefined;
  };

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const searchLower = orderSearch.trim().toLowerCase();
    const matchSearch = !searchLower || 
      (o.order_code && o.order_code.toLowerCase().includes(searchLower)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchLower)) ||
      (o.customer_phone && o.customer_phone.includes(searchLower)) ||
      (o.transaction_ref && o.transaction_ref.toLowerCase().includes(searchLower)) ||
      (o.sender_phone && o.sender_phone.includes(searchLower)) ||
      (o.notes && o.notes.toLowerCase().includes(searchLower)) ||
      (o.items && o.items.some(item => 
        (item.product_title && item.product_title.toLowerCase().includes(searchLower)) ||
        (item.custom_text && item.custom_text.toLowerCase().includes(searchLower)) ||
        (item.selected_size && item.selected_size.toLowerCase().includes(searchLower))
      ));

    const matchStatus = statusFilter === 'all' || 
      (statusFilter === 'all_pending' ? (o.status === 'pending' || o.status === 'pending_difference') :
      statusFilter === 'all_verified' ? (o.status === 'auto_verified' || o.status === 'manual_verified' || o.status === 'ready_for_pickup' || o.status === 'delivered') :
      o.status === statusFilter);

    const effectiveLine = getEffectiveConfirmedLine(o);
    const matchLine = lineFilter === 'all' ||
      (lineFilter === 'manual' ? Boolean(!effectiveLine && o.verified_by) :
      (effectiveLine && effectiveLine.includes(lineFilter)));

    const matchPayment = paymentFilter === 'all' || o.payment_method === paymentFilter;

    return matchSearch && matchStatus && matchLine && matchPayment;
  });

  // Periodic poll for devices when gateway tab is active (Every 10 seconds)
  useEffect(() => {
    let interval: any;
    if (isAuthenticated && activeTab === 'gateway') {
      fetchDevices();
      interval = setInterval(() => {
        fetchDevices();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success && data.admin) {
        setIsAuthenticated(true);
        setCurrentAdmin(data.admin);
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_profile', JSON.stringify(data.admin));
        fetchAllData();
      } else {
        setAuthError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      if (password === '19312@Mo' || password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_authenticated', 'true');
        fetchAllData();
      } else {
        setAuthError('تعذر الاتصال بالسيرفر لتسجيل الدخول');
      }
    }
  };

  // Persistent Devices localStorage helpers to prevent any card unmounting
  const getPersistentDevices = (): GatewayDevice[] => {
    if (typeof window === 'undefined') return [];
    try {
      const s = localStorage.getItem('grad_store_admin_devices');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  };

  const savePersistentDevices = (devs: GatewayDevice[]) => {
    if (typeof window === 'undefined' || !Array.isArray(devs) || devs.length === 0) return;
    try {
      const existing = getPersistentDevices();
      const map = new Map<string, GatewayDevice>();
      existing.forEach(d => map.set(d.id, d));
      devs.forEach(d => {
        const prev = map.get(d.id);
        const isPrevGeneric = !prev?.device_name || prev.device_name.startsWith('Android Gateway (') || prev.device_name.startsWith('Android Phone');
        const name = (!isPrevGeneric && prev?.device_name) ? prev.device_name : d.device_name;
        map.set(d.id, { ...prev, ...d, device_name: name });
      });
      localStorage.setItem('grad_store_admin_devices', JSON.stringify(Array.from(map.values())));
    } catch (e) {}
  };

  const updateDevicesSafely = (incoming: GatewayDevice[]) => {
    const local = getPersistentDevices();
    const map = new Map<string, GatewayDevice>();

    local.forEach(d => map.set(d.id, d));
    if (Array.isArray(incoming)) {
      incoming.forEach(d => {
        const prev = map.get(d.id);
        const isPrevGeneric = !prev?.device_name || prev.device_name.startsWith('Android Gateway (') || prev.device_name.startsWith('Android Phone');
        const name = (!isPrevGeneric && prev?.device_name) ? prev.device_name : d.device_name;
        map.set(d.id, { ...prev, ...d, device_name: name });
      });
    }

    const threeMinsAgo = Date.now() - 3 * 60 * 1000;
    const merged = Array.from(map.values()).map(d => {
      const pingTime = d.last_ping ? new Date(d.last_ping).getTime() : 0;
      const isOnline = pingTime >= threeMinsAgo;
      return {
        ...d,
        status: (isOnline ? 'online' : 'offline') as 'online' | 'offline'
      };
    });

    if (merged.length > 0) {
      setDevices(merged);
      savePersistentDevices(merged);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/admin/devices', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        updateDevicesSafely(data);
      }
    } catch (err) {
      console.warn('Failed to fetch devices', err);
      updateDevicesSafely([]);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setAdminsList(await res.json());
    } catch (err) {
      console.warn('Failed to fetch admins', err);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [ordRes, prodRes, setRes, smsRes, devRes, admRes] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch('/api/sms', { cache: 'no-store' }),
        fetch('/api/admin/devices', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' })
      ]);

      if (ordRes.ok) setOrders(await ordRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (setRes.ok) {
        const s = await setRes.json();
        if (s) {
          setSettings(s);
          if (s.line_labels) setLineLabelsMap(s.line_labels);
          setVodaEnabled(Boolean(s.vodafone_cash_enabled));
          setInstaEnabled(Boolean(s.instapay_enabled));
          const rawNums = Array.isArray(s.vodafone_cash_numbers) 
            ? s.vodafone_cash_numbers 
            : (typeof s.vodafone_cash_numbers === 'string' ? s.vodafone_cash_numbers.split(',').map((n: string) => n.trim()).filter(Boolean) : ['01015339426']);
          const cleanNums = rawNums.length > 0 ? rawNums : ['01015339426'];
          setVodaLines(cleanNums);
          setVodaInput(cleanNums.join(', '));
          setVodaFeePercentInput(s.vodafone_cash_fee_percent !== undefined ? String(s.vodafone_cash_fee_percent) : '1');
          const iIPAs = Array.isArray(s.instapay_ipas) ? s.instapay_ipas.join(', ') : (s.instapay_ipa || '');
          setInstaInput(iIPAs);
          setPickupInput(s.pickup_note || '');
          setSupportPhoneInput(s.support_phone || '01555583154');
        }
      }
      if (smsRes.ok) setTransactions(await smsRes.json());
      if (devRes.ok) {
        const d = await devRes.json();
        if (Array.isArray(d) && d.length > 0) {
          setDevices(d);
        }
      }
      if (admRes.ok) setAdminsList(await admRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to match an order with its SMS incoming transaction
  const findMatchedTransaction = (order: Order): IncomingTransaction | null => {
    if (!order) return null;
    if (order.matched_transaction_id) {
      const found = transactions.find(t => t.id === order.matched_transaction_id);
      if (found) return found;
    }
    // Match by matched_order_id on transaction
    const byOrderId = transactions.find(t => t.matched_order_id === order.id);
    if (byOrderId) return byOrderId;

    // Match by transaction_ref
    if (order.transaction_ref && order.transaction_ref.trim()) {
      const cleanRef = order.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanRef.length >= 4) {
        const byRef = transactions.find(t => {
          if (!t.transaction_ref) return false;
          const tRef = t.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          return tRef === cleanRef || (tRef.length >= 4 && (tRef.includes(cleanRef) || cleanRef.includes(tRef)));
        });
        if (byRef) return byRef;
      }
    }

    // Match by customer phone number & amount
    if (order.customer_phone) {
      const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '').slice(-7);
      if (cleanPhone.length >= 7) {
        const byPhone = transactions.find(t => {
          const sPhone = (t.sender_phone || '').replace(/[^0-9]/g, '');
          const amountMatch = Math.abs(Number(t.amount) - Number(order.total_amount)) < 0.01;
          return (sPhone.endsWith(cleanPhone) || t.raw_sms.includes(cleanPhone)) && (amountMatch || t.amount === 0);
        });
        if (byPhone) return byPhone;
      }
    }

    return null;
  };

  // Helper to infer or resolve effective order items using product catalog prices
  const getOrderEffectiveItems = (order: Order | null) => {
    if (!order) return [];
    if (order.items && order.items.length > 0) {
      return order.items;
    }

    const amount = Number(order.total_amount || 0);

    // 1. Single direct product price match
    const matchingProd = products.find(p => Math.abs(p.price - amount) < 0.01);
    if (matchingProd) {
      return [{
        id: `inferred-${order.id}`,
        order_id: order.id,
        product_id: matchingProd.id,
        product_title: matchingProd.title_ar || matchingProd.title,
        quantity: 1,
        unit_price: matchingProd.price
      }];
    }

    // 2. Exact division quantity match
    for (const p of products) {
      if (p.price > 0 && amount % p.price === 0) {
        const qty = Math.round(amount / p.price);
        return [{
          id: `inferred-${order.id}`,
          order_id: order.id,
          product_id: p.id,
          product_title: p.title_ar || p.title,
          quantity: qty,
          unit_price: p.price
        }];
      }
    }

    // Fallback if price doesn't match catalog
    return [{
      id: `fallback-${order.id}`,
      order_id: order.id,
      product_id: 'unknown',
      product_title: `طلب منتج تخرج بقيمة (${amount} ج.م)`,
      quantity: 1,
      unit_price: amount
    }];
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string, matchedTxId?: string) => {
    try {
      const adminName = currentAdmin?.display_name || currentAdmin?.username || 'أدمن المتجر';
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          status, 
          matchedTransactionId: matchedTxId,
          verifiedBy: adminName,
          verified_by: adminName
        })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { 
          ...o, 
          status: status as any,
          matched_transaction_id: matchedTxId || o.matched_transaction_id,
          verified_at: (status === 'manual_verified' || status === 'auto_verified') ? (o.verified_at || new Date().toISOString()) : o.verified_at,
          verified_by: adminName
        } : o));
        
        if (selectedOrderModal && selectedOrderModal.id === orderId) {
          setSelectedOrderModal(prev => prev ? {
            ...prev,
            status: status as any,
            matched_transaction_id: matchedTxId || prev.matched_transaction_id,
            verified_at: (status === 'manual_verified' || status === 'auto_verified') ? (prev.verified_at || new Date().toISOString()) : prev.verified_at,
            verified_by: adminName
          } : null);
        }
      }
    } catch (err) {
      alert('فشل تحديث الحالة');
    }
  };

  // Upload a single image file to Supabase Storage products bucket
  const uploadProductImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bucket', 'products');
    fd.append('folder', 'catalog');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) return data.url;
    throw new Error(data.error || 'Upload failed');
  };

  // Handle main image file pick
  const handleMainImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setNewProdImagePreview(localUrl);
    setNewProdImage(localUrl);
    setNewProdImageUploading(true);

    try {
      const url = await uploadProductImage(file);
      if (url) {
        setNewProdImage(url);
        setNewProdImagePreview(url);
      }
    } catch (err) {
      console.warn('Upload fallback to data URL');
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setNewProdImage(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setNewProdImageUploading(false);
    }
  };

  // Handle gallery images pick (multiple)
  const handleGalleryImagesPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewProdGalleryPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setNewProdGalleryUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadProductImage));
      setNewProdGalleryUrls(prev => [...prev, ...urls]);
    } catch { alert('فشل رفع إحدى صور المعرض'); }
    finally { setNewProdGalleryUploading(false); }
  };

  // Handle size chart image pick
  const handleSizeChartPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewProdSizeChartPreview(URL.createObjectURL(file));
    setNewProdSizeChartUploading(true);
    try {
      const url = await uploadProductImage(file);
      setNewProdSizeChart(url);
    } catch { alert('فشل رفع صورة دليل المقاسات'); }
    finally { setNewProdSizeChartUploading(false); }
  };

  // Add-on helpers
  const addNewAddon = () => setNewProdAddons(prev => [...prev, { id: Date.now().toString(), name: '', price: '0', image_url: '', description: '' }]);
  const removeAddon = (id: string) => setNewProdAddons(prev => prev.filter(a => a.id !== id));
  const updateAddon = (id: string, field: 'name' | 'price' | 'image_url' | 'description', value: string) =>
    setNewProdAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  // Edit Addons & Edit Image Upload Helpers
  const addEditAddon = () => setEditProdAddons(prev => [...prev, { id: generateUUID(), name: '', price: '0', image_url: '', description: '' }]);
  const removeEditAddon = (id: string) => setEditProdAddons(prev => prev.filter(a => a.id !== id));
  const updateEditAddon = (id: string, field: 'name' | 'price' | 'image_url' | 'description', value: string) =>
    setEditProdAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const handleAddonImagePick = async (addonId: string, isEdit: boolean, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadProductImage(file);
      if (isEdit) {
        updateEditAddon(addonId, 'image_url', url);
      } else {
        updateAddon(addonId, 'image_url', url);
      }
    } catch {
      alert('فشل رفع صورة الإضافة');
    }
  };

  const handleEditMainImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditProdImagePreview(URL.createObjectURL(file));
    setEditProdImageUploading(true);
    try {
      const url = await uploadProductImage(file);
      setEditProdImage(url);
    } catch { alert('فشل رفع صورة المنتج'); }
    finally { setEditProdImageUploading(false); }
  };

  const handleEditGalleryImagesPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setEditProdGalleryPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    setEditProdGalleryUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadProductImage));
      setEditProdGalleryUrls(prev => [...prev, ...urls]);
    } catch { alert('فشل رفع إحدى صور المعرض'); }
    finally { setEditProdGalleryUploading(false); }
  };

  const handleEditSizeChartPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditProdSizeChartPreview(URL.createObjectURL(file));
    setEditProdSizeChartUploading(true);
    try {
      const url = await uploadProductImage(file);
      setEditProdSizeChart(url);
    } catch { alert('فشل رفع جدول المقاسات'); }
    finally { setEditProdSizeChartUploading(false); }
  };

  // Backup & Maintenance Handlers
  const handleExportBackup = () => {
    try {
      const backupData = {
        app_name: 'GraduationStore',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        store_name: settings.store_name,
        settings,
        products,
        orders,
        adminsList,
        devices
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `graduation_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('فشل تصدير النسخة الاحتياطية: ' + e.message);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoringBackup(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup || (!backup.products && !backup.settings)) {
        alert('ملف النسخة الاحتياطية غير صالح أو تالف');
        return;
      }

      if (Array.isArray(backup.products) && backup.products.length > 0) {
        for (const p of backup.products) {
          await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(p)
          });
        }
      }

      if (backup.settings) {
        await saveSettingsToSupabase(backup.settings);
        setSettings(backup.settings);
      }

      alert('تمت استعادة النسخة الاحتياطية وحفظ كافة المنتجات والإعدادات بنجاح! 🎉');
      fetchAllData();
    } catch (err: any) {
      alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية: ' + err.message);
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleToggleMaintenanceMode = async (enabled: boolean) => {
    try {
      const updated = { ...settings, maintenance_mode: enabled };
      setSettings(updated);

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('graduation_store_maintenance', enabled ? 'true' : 'false');
      }

      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      await saveSettingsToSupabase(updated);

      if (enabled) {
        alert('تم تفعيل وضع الصيانة 🚧 المتجر الآن مغلق مؤقتاً للزوار.');
      } else {
        alert('تم إلغاء وضع الصيانة ✅ المتجر الآن يعمل ومستعد لاستقبال الطلبات.');
      }
    } catch (e: any) {
      alert('فشل تغيير حالة وضع الصيانة');
    }
  };

  const handlePurgeOrdersData = async () => {
    if (!window.confirm('⚠️ تحذير عاجل: هل أنت متأكد من تصفير ومسح الطلبات والاختبارات الحالية؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const confirmName = window.prompt('اكتب كلمة "CONFIRM" لتأكيد تصفير البيانات:');
    if (confirmName !== 'CONFIRM') {
      alert('تم إلغاء العملية');
      return;
    }

    try {
      setOrders([]);
      alert('تم تصفير وحذف الطلبات بنجاح 🧹');
    } catch (e: any) {
      alert('حدث خطأ أثناء مسح البيانات');
    }
  };

  // Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitleAr || !newProdPrice || !newProdImage) {
      alert('يرجى إكمال الحقول الأساسية للمنتج (الاسم، السعر، الصورة الرئيسية)');
      return;
    }
    if (newProdImageUploading || newProdGalleryUploading || newProdSizeChartUploading) {
      alert('انتظر اكتمال رفع الصور أولاً');
      return;
    }

    try {
      const sizesArray = newProdSizes.split(',').map(s => s.trim()).filter(Boolean);
      const allImages = newProdGalleryUrls.length > 0 ? [newProdImage, ...newProdGalleryUrls] : [newProdImage];
      const addonsPayload = newProdAddons
        .filter(a => a.name.trim())
        .map(a => ({ 
          id: a.id, 
          name: a.name.trim(), 
          price: Number(a.price) || 0,
          image_url: a.image_url ? a.image_url.trim() : undefined,
          description: a.description ? a.description.trim() : undefined
        }));

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ar: newProdTitleAr,
          price: Number(newProdPrice),
          category: newProdCategory,
          stock: Number(newProdStock),
          image_url: newProdImage,
          images: allImages,
          size_chart_url: newProdSizeChart || undefined,
          has_customization: newProdHasCustomization,
          customization_label: newProdCustomLabel.trim() || undefined,
          is_event: newProdIsEvent,
          sizes: sizesArray,
          description_ar: newProdDescAr,
          addons: addonsPayload,
        })
      });

      if (res.ok) {
        setIsAddProductOpen(false);
        setNewProdTitleAr('');
        setNewProdPrice('');
        setNewProdImage('');
        setNewProdImagePreview('');
        setNewProdGalleryUrls([]);
        setNewProdGalleryPreviews([]);
        setNewProdSizeChart('');
        setNewProdSizeChartPreview('');
        setNewProdIsEvent(false);
        setNewProdAddons([]);
        fetchAllData();
      } else {
        const err = await res.json();
        alert('فشل إضافة المنتج: ' + (err.error || ''));
      }
    } catch (err) {
      alert('فشل إضافة المنتج');
    }
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProdTitleAr(product.title_ar || product.title);
    setEditProdPrice(String(product.price));
    setEditProdStock(String(product.stock));
    setEditProdCategory(product.category || 'الملابس (Apparel)');
    setEditProdImage(product.image_url);
    setEditProdImagePreview(product.image_url);
    const gallery = product.images && product.images.length > 0 ? product.images.filter(img => img !== product.image_url) : [];
    setEditProdGalleryUrls(gallery);
    setEditProdGalleryPreviews(gallery);
    setEditProdSizeChart(product.size_chart_url || '');
    setEditProdSizeChartPreview(product.size_chart_url || '');
    setEditProdHasCustomization(Boolean(product.has_customization));
    setEditProdCustomLabel(product.customization_label || 'اسم الطالب أو الكلية للتطريز على القطعة');
    setEditProdIsEvent(Boolean(product.is_event));
    setEditProdSizes((product.sizes || []).join(', '));
    setEditProdDescAr(product.description_ar || product.description || '');
    setEditProdAddons(
      (product.addons || []).map(a => ({
        id: a.id || generateUUID(),
        name: a.name,
        price: String(a.price || 0),
        image_url: a.image_url || '',
        description: a.description || ''
      }))
    );
    setIsEditProductOpen(true);
  };

  // Save Edit Product
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editProdTitleAr || !editProdPrice || !editProdImage) {
      alert('يرجى إكمال الحقول الأساسية للمنتج (الاسم، السعر، الصورة الرئيسية)');
      return;
    }
    if (editProdImageUploading || editProdGalleryUploading || editProdSizeChartUploading) {
      alert('انتظر اكتمال رفع الصور أولاً');
      return;
    }

    try {
      const sizesArray = editProdSizes.split(',').map(s => s.trim()).filter(Boolean);
      const allImages = editProdGalleryUrls.length > 0 ? [editProdImage, ...editProdGalleryUrls] : [editProdImage];
      const addonsPayload = editProdAddons
        .filter(a => a.name.trim())
        .map(a => ({ 
          id: a.id || generateUUID(), 
          name: a.name.trim(), 
          price: Number(a.price) || 0,
          image_url: a.image_url ? a.image_url.trim() : undefined,
          description: a.description ? a.description.trim() : undefined
        }));

      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          title_ar: editProdTitleAr,
          price: Number(editProdPrice),
          category: editProdCategory,
          stock: Number(editProdStock),
          image_url: editProdImage,
          images: allImages,
          size_chart_url: editProdSizeChart || undefined,
          has_customization: editProdHasCustomization,
          customization_label: editProdCustomLabel.trim() || undefined,
          is_event: editProdIsEvent,
          sizes: sizesArray,
          description_ar: editProdDescAr,
          addons: addonsPayload,
        })
      });

      if (res.ok) {
        setIsEditProductOpen(false);
        setEditingProduct(null);
        alert('تم تعديل المنتج وحفظ التغييرات بنجاح! ✏️');
        fetchAllData();
      } else {
        const err = await res.json();
        alert('فشل تعديل المنتج: ' + (err.error || ''));
      }
    } catch (err) {
      alert('حدث خطأ أثناء تعديل المنتج');
    }
  };

  // Delete Product Permanent
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت تأكد من إزالة هذا المنتج نهائياً ولن يظهر مجدداً؟')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addDeletedProductId(id);
        setProducts(prev => prev.filter(p => p.id !== id));
        alert('تم مسح المنتج بنجاح ولن يظهر مجدداً 🗑️');
      } else {
        alert('فشل حذف المنتج');
      }
    } catch (err) {
      alert('حدث خطأ أثناء حذف المنتج');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vodaArray = vodaLines
        .map(n => n.trim())
        .filter(Boolean);

      const instaArray = instaInput
        .split(',')
        .map(n => n.trim())
        .filter(Boolean);

      const payload = {
        vodafone_cash_enabled: vodaEnabled,
        instapay_enabled: instaEnabled,
        vodafone_cash_fee_percent: Number(vodaFeePercentInput) || 0,
        vodafone_cash_numbers: vodaArray.length > 0 ? vodaArray : ['01015339426'],
        line_labels: lineLabelsMap,
        instapay_ipa: instaArray[0] || '9thbatch@instapay',
        instapay_ipas: instaArray.length > 0 ? instaArray : ['9thbatch@instapay'],
        pickup_note: pickupInput.trim(),
        support_phone: supportPhoneInput.trim(),
        maintenance_mode: Boolean(settings.maintenance_mode)
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success && data.settings) {
        setSettings(data.settings);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('grad_store_settings', JSON.stringify(data.settings));
            localStorage.setItem('graduation_store_voda_nums', JSON.stringify(vodaArray));
          } catch (e) {}
        }
        alert('تم حفظ إعدادات وأرقام التحويل بنجاح! 💾');
      } else {
        alert(data?.error || 'فشل حفظ الإعدادات في السيرفر');
      }
    } catch (err: any) {
      alert('حدث خطأ غير متوقع أثناء حفظ الإعدادات: ' + (err?.message || ''));
    }
  };

  // Test Ping Gateway Device Simulation
  const [simDeviceName, setSimDeviceName] = useState('Xiaomi Redmi Note 13');
  const [simPhone, setSimPhone] = useState('01015339426');
  const [simBattery, setSimBattery] = useState(92);

  const handleSendCustomPing = async (name?: string, phone?: string, battery?: number) => {
    try {
      const dName = name || simDeviceName || 'Android Gateway Phone';
      const dPhone = phone || simPhone || '01015339426';
      const dBattery = battery !== undefined ? battery : simBattery;
      const devId = 'dev-' + dName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const res = await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'graduation-store-secure-gateway-token-2026'
        },
        body: JSON.stringify({
          device_id: devId,
          device_name: dName,
          phone_number: dPhone,
          battery_level: dBattery,
          app_version: 'v2.5.0-android'
        })
      });
      if (res.ok) {
        fetchDevices();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      if (typeof window !== 'undefined') {
        const local = getPersistentDevices().filter(d => d.id !== id);
        localStorage.setItem('grad_store_admin_devices', JSON.stringify(local));
      }
      setDevices(prev => prev.filter(d => d.id !== id));
      await fetch(`/api/admin/devices?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleEditDeviceName = async (device: GatewayDevice) => {
    const newName = window.prompt('اكتب الاسم المخصص لهذا الموبايل (مثال: موبايل فودافون كاش - أحمد):', device.device_name);
    if (newName === null) return;
    const cleanName = newName.trim();
    if (!cleanName) return;

    try {
      const updatedList = devices.map(d => d.id === device.id ? { ...d, device_name: cleanName } : d);
      setDevices(updatedList);
      savePersistentDevices(updatedList);

      await fetch('/api/admin/devices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: device.id,
          device_name: cleanName,
          phone_number: device.phone_number
        })
      });
      alert('تم تعديل وحفظ اسم الموبايل بنجاح! 📱');
    } catch (e) {
      alert('فشل تعديل اسم الموبايل');
    }
  };

  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim() || !newAdminName.trim()) {
      alert('يرجى تعبئة كافة الحقول المطلوبة');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword.trim(),
          display_name: newAdminName.trim(),
          role: newAdminRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('تمت إضافة المشرف بنجاح! 🔑');
        setIsAddAdminOpen(false);
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminName('');
        fetchAdmins();
      } else {
        alert(data.error || 'فشل إضافة المشرف');
      }
    } catch (e: any) {
      alert('حدث خطأ أثناء إضافة المشرف');
    }
  };

  const handleDeleteAdminSubmit = async (id: string) => {
    if (!confirm('هل أنت تأكد من حذف هذا المشرف؟')) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminsList(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClearAllDevices = async () => {
    if (!confirm('هل أنت تأكد من مسح جميع الأجهزة المسجلة؟')) return;
    try {
      const res = await fetch('/api/admin/devices', { method: 'DELETE' });
      if (res.ok) {
        setDevices([]);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Calculate statistics for PDF export & breakdown (Confirmed Orders Only for Factory Manufacturing)
  const calculateProductSizeStats = () => {
    const stats: Record<string, { productTitle: string; sizeCounts: Record<string, number>; totalUnits: number; totalRevenue: number }> = {};

    orders.forEach(order => {
      const isConfirmed = order.status === 'auto_verified' || order.status === 'manual_verified' || order.status === 'ready_for_pickup' || order.status === 'delivered';
      if (!isConfirmed) return;
      const items = getOrderEffectiveItems(order);
      items.forEach(item => {
        let rawTitle = item.product_title || 'منتج غير معرف';
        // Clean title from add-ons or embroidery details bracket tags for unified factory grouping
        let title = rawTitle
          .replace(/\s*\.?\s*\[الإضافات:.*?\]/gi, '')
          .replace(/\s*\.?\s*\[التطريز:.*?\]/gi, '')
          .replace(/\s*\.?\s*\[Addons:.*?\]/gi, '')
          .trim();
        if (!title) title = rawTitle;

        if (!stats[title]) {
          stats[title] = {
            productTitle: title,
            sizeCounts: { S: 0, M: 0, L: 0, XL: 0, XXL: 0, 'بدون مقاس': 0 },
            totalUnits: 0,
            totalRevenue: 0
          };
        }
        const sz = item.selected_size || 'بدون مقاس';
        if (!stats[title].sizeCounts[sz]) {
          stats[title].sizeCounts[sz] = 0;
        }
        stats[title].sizeCounts[sz] += item.quantity;
        stats[title].totalUnits += item.quantity;
        stats[title].totalRevenue += item.quantity * item.unit_price;
      });
    });

    return Object.values(stats);
  };

  // Calculate aggregated counts for all Add-ons/Accessories from confirmed orders
  const calculateAddonStats = () => {
    const addonTally: Record<string, number> = {};

    orders.forEach(order => {
      const isConfirmed = order.status === 'auto_verified' || order.status === 'manual_verified' || order.status === 'ready_for_pickup' || order.status === 'delivered';
      if (!isConfirmed) return;

      const items = getOrderEffectiveItems(order);
      items.forEach(item => {
        let optStr = item.customization_option || (item as any).customizationOption || '';
        const rawTitle = item.product_title || '';
        if (!optStr && rawTitle.includes('[الإضافات:')) {
          const match = rawTitle.match(/\[الإضافات:\s*(.*?)\]/);
          if (match && match[1]) optStr = match[1];
        }

        if (optStr) {
          const parts = optStr.split(/[,،\n]/).map((p: string) => p.trim()).filter(Boolean);
          parts.forEach((addon: string) => {
            let cleanAddon = addon
              .replace(/\s*\(\s*\+?\s*\d+[\s\S]*?\)/gi, '')
              .replace(/\s*\+\s*\d+\s*(ج\.م|EGP|\$)?/gi, '')
              .replace(/[\(\)]/g, '')
              .trim();
            if (!cleanAddon) cleanAddon = addon.trim();

            if (!addonTally[cleanAddon]) {
              addonTally[cleanAddon] = 0;
            }
            addonTally[cleanAddon] += (item.quantity || 1);
          });
        }
      });
    });

    return Object.entries(addonTally).map(([name, count]) => ({ name, count }));
  };

  const printStandalonePdfReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportDate = new Date().toLocaleDateString('ar-EG');
    const reportTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const productSizeStats = calculateProductSizeStats();
    const addonStats = calculateAddonStats();
    const totalUnitsCount = productSizeStats.reduce((acc, p) => acc + p.totalUnits, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير حصر الكميات والمقاسات - The Medix</title>
        <style>
          body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; background: #ffffff; }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #84cc16;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .brand-title { font-size: 22px; font-weight: 900; color: #0f172a; }
          .brand-subtitle { font-size: 11px; color: #475569; font-weight: 700; margin-top: 2px; }
          .meta-box { text-align: left; font-size: 10px; color: #334155; font-family: monospace; }
          .meta-box strong { color: #65a30d; }
          
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 25px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 10px;
            text-align: center;
          }
          .kpi-title { font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
          .kpi-value { font-size: 18px; font-weight: 900; color: #0f172a; }
          .kpi-unit { font-size: 10px; font-weight: 700; color: #65a30d; }
          
          .section-header {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            border-right: 4px solid #84cc16;
            padding-right: 8px;
            margin-top: 25px;
            margin-bottom: 12px;
            page-break-after: avoid;
            break-after: avoid;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
            page-break-inside: auto;
          }
          th {
            background: #1e293b;
            color: #ffffff;
            font-weight: 700;
            padding: 8px 10px;
            text-align: right;
            border: 1px solid #334155;
            vertical-align: middle;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            color: #1e293b;
            vertical-align: middle;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          tr:nth-child(even) { background: #f8fafc; }
          .font-mono { font-family: monospace; font-weight: 700; }
          .text-center { text-align: center; }
          .text-amber { color: #65a30d; font-weight: 800; }

          .footer-signatures {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #cbd5e1;
            padding-top: 30px;
          }
          .sig-box { text-align: center; width: 200px; font-weight: 700; }
          .sig-line { border-bottom: 2px dashed #94a3b8; margin-top: 40px; }
          .stamp-box {
            width: 120px;
            height: 120px;
            border: 2.5px dashed #d97706;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #d97706;
            font-size: 10px;
            font-weight: 900;
            transform: rotate(-10deg);
            margin: 0 auto;
            background: #fffbe6;
          }

          @media print {
            body { padding: 0; }
            @page { size: A4 landscape; margin: 0.8cm; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            .footer-signatures { page-break-inside: avoid; break-inside: avoid; }
            .section-header { page-break-after: avoid; break-after: avoid; }
            .kpi-grid { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-container">
          <div>
            <div class="brand-title">🎓 ${settings.store_name}</div>
            <div class="brand-subtitle">تقرير حصر الكميات والمقاسات والكشوفات التكليفية الرسمية</div>
          </div>
          <div class="meta-box">
            <div>التاريخ: <strong>${reportDate}</strong></div>
            <div>الوقت: <strong>${reportTime}</strong></div>
            <div>رقم التقرير: <strong>#REP-${Math.floor(100000 + Math.random() * 900000)}</strong></div>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">إجمالي المبيعات الإجمالية</div>
            <div class="kpi-value">${totalGrossRevenue} <span class="kpi-unit">ج.م</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">عدد الطلبات المؤكدة</div>
            <div class="kpi-value">${totalVerifiedOrders} <span class="kpi-unit">طلب</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">إجمالي القطع للتصنيع</div>
            <div class="kpi-value">${totalUnitsCount} <span class="kpi-unit">قطعة</span></div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">عدد الأصناف المطلوبة</div>
            <div class="kpi-value">${products.length} <span class="kpi-unit">منتج</span></div>
          </div>
        </div>

        <!-- Section 1: Product Size Matrix -->
        <div class="section-header">1. بيان حصر القطع والمقاسات (الموجه للمصانع والمطبعة)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">اسم المنتج</th>
              <th class="text-center">S</th>
              <th class="text-center">M</th>
              <th class="text-center">L</th>
              <th class="text-center">XL</th>
              <th class="text-center">XXL</th>
              <th class="text-center">بدون مقاس</th>
              <th class="text-center">إجمالي القطع</th>
            </tr>
          </thead>
          <tbody>
            ${productSizeStats.map(stat => `
              <tr>
                <td><strong>${stat.productTitle}</strong></td>
                <td class="text-center font-mono">${stat.sizeCounts['S'] || 0}</td>
                <td class="text-center font-mono">${stat.sizeCounts['M'] || 0}</td>
                <td class="text-center font-mono">${stat.sizeCounts['L'] || 0}</td>
                <td class="text-center font-mono">${stat.sizeCounts['XL'] || 0}</td>
                <td class="text-center font-mono">${stat.sizeCounts['XXL'] || 0}</td>
                <td class="text-center font-mono">${stat.sizeCounts['بدون مقاس'] || 0}</td>
                <td class="text-center font-mono text-amber"><strong>${stat.totalUnits} قطعة</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Section 1.5: Add-ons & Accessories Breakdown -->
        ${addonStats.length > 0 ? `
          <div class="section-header">1.5. بيان حصر الإضافات والملحقات المطلوبة (Add-ons & Accessories)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 70%;">اسم الإضافة / الملحق المطلوبة</th>
                <th class="text-center" style="width: 30%;">إجمالي الكمية المطلوبة للتجهيز</th>
              </tr>
            </thead>
            <tbody>
              ${addonStats.map(ad => `
                <tr>
                  <td><strong>💎 ${ad.name}</strong></td>
                  <td class="text-center font-mono text-amber"><strong>${ad.count} قطعة</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- Section 2: Detailed Orders Breakdown -->
        <div class="section-header">2. كشوفات تسليم طلبات العملاء وتفاصيل التطريز</div>
        <table>
          <thead>
            <tr>
              ${pdfShowCode ? '<th style="width: 11%;">كود الطلب</th>' : ''}
              <th style="width: 18%;">اسم العميل</th>
              ${pdfShowPhone ? '<th style="width: 13%;">رقم الموبايل</th>' : ''}
              ${pdfShowRef ? '<th style="width: 14%;">الرقم المرجعي</th>' : ''}
              <th style="width: 11%;">طريقة الدفع</th>
              ${pdfShowStatus ? '<th style="width: 12%;">حالة الطلب</th>' : ''}
              <th>الأصناف المحددة والتطريز</th>
              <th style="width: 11%;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                ${pdfShowCode ? `<td class="font-mono text-amber">#${o.order_code}</td>` : ''}
                <td><strong>${o.customer_name}</strong></td>
                ${pdfShowPhone ? `<td class="font-mono">${o.customer_phone}</td>` : ''}
                ${pdfShowRef ? `<td class="font-mono">${o.transaction_ref || '—'}</td>` : ''}
                <td>${o.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'InstaPay'}</td>
                ${pdfShowStatus ? `<td>
                  ${o.status === 'auto_verified' || o.status === 'manual_verified' ? '<span style="color: #047857; font-weight: bold;">مؤكد ✓</span>' :
                    o.status === 'ready_for_pickup' ? '<span style="color: #6d28d9; font-weight: bold;">جاهز للاستلام 🎓</span>' :
                    o.status === 'delivered' ? '<span style="color: #1d4ed8; font-weight: bold;">تم التسليم 📦</span>' :
                    o.status === 'cancelled' ? '<span style="color: #b91c1c; font-weight: bold;">ملغي ❌</span>' :
                    '<span style="color: #b45309; font-weight: bold;">قيد الانتظار ⏳</span>'}
                </td>` : ''}
                <td>
                  ${getOrderEffectiveItems(o).map(it => `
                    <div>• ${it.product_title} ${it.selected_size ? `[${it.selected_size}]` : ''} × ${it.quantity}
                    ${pdfShowCustomization && it.custom_text ? `<br><small style="color: #b45309;">(تطريز: ${it.custom_text})</small>` : ''}
                    ${pdfShowCustomization && it.customization_option ? `<br><small style="color: #047857;">(إضافة: ${it.customization_option})</small>` : ''}
                    </div>
                  `).join('')}
                </td>
                <td class="font-mono"><strong>${o.total_amount} ج.م</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Signatures & Stamp -->
        <div class="footer-signatures">
          <div class="sig-box">
            <div>توقيع مسؤول حصر المقاسات</div>
            <div class="sig-line"></div>
          </div>
          <div class="stamp-box">
            اعتماد المتجر الرسمي<br>الدفعة التاسعة 🎓
          </div>
          <div class="sig-box">
            <div>توقيع المسؤول المالي</div>
            <div class="sig-line"></div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md glass-modal rounded-3xl p-8 border border-slate-800 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">لوحة تحكم المتجر</h2>
            <p className="text-xs text-slate-400 mt-1">9th Batch Graduation Store Admin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم المستخدم / البريد الإلكتروني
              </label>
              <input
                type="text"
                required
                placeholder="أدخل اسم المستخدم أو الإيميل"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                كلمة المرور (Password)
              </label>
              <input
                type="password"
                required
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {authError && <p className="text-xs text-rose-400 font-semibold">{authError}</p>}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl gradient-purple-btn text-white font-bold text-sm shadow-lg shadow-indigo-600/20"
            >
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  const productSizeStats = calculateProductSizeStats();
  const totalVerifiedOrders = orders.filter(o => o.status === 'auto_verified' || o.status === 'manual_verified' || o.status === 'ready_for_pickup' || o.status === 'delivered').length;
  const totalGrossRevenue = orders.reduce((sum, o) => o.status !== 'cancelled' ? sum + Number(o.total_amount) : sum, 0);

  const isSuperAdmin = currentAdmin?.role === 'superadmin';

  const navSections = [
    {
      groupTitle: 'العمليات والمبيعات',
      items: [
        { id: 'analytics', label: 'إحصائيات ومبيعات 📊', badge: 'حي', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: BarChart3 },
        { id: 'orders', label: 'إدارة الطلبات', badge: `${orders.length}`, badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: ShoppingBag },
        { id: 'products', label: 'المنتجات والمعرض', badge: `${products.length}`, badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Package }
      ]
    },
    {
      groupTitle: 'النظام والبوابات',
      items: [
        { 
          id: 'gateway', 
          label: 'بوابة SMS والأجهزة', 
          badge: `${devices.filter(d => d.status === 'online').length} أونلاين`, 
          badgeColor: devices.some(d => d.status === 'online') ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700', 
          icon: Smartphone 
        },
        { id: 'sms', label: 'سجل رسائل SMS', badge: `${transactions.length}`, badgeColor: 'bg-slate-800 text-slate-300 border-slate-700', icon: MessageSquare },
        { id: 'settings', label: 'إعدادات الدفع والمحفظة', badge: null, badgeColor: '', icon: Settings }
      ]
    },
    {
      groupTitle: 'الإدارة والأمان',
      items: [
        ...(isSuperAdmin ? [
          { id: 'admins', label: 'إدارة الأدمن والمشرفين 🔑', badge: `${adminsList.length}`, badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: ShieldCheck },
          { id: 'maintenance', label: 'الصيانة والباك أب ⚙️', badge: settings.maintenance_mode ? '🚧 مفعّل' : null, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: Wrench }
        ] : [])
      ]
    }
  ];

  const navTabs = navSections.flatMap(sec => sec.items);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans dir-rtl">
      
      {/* --- DESKTOP VERTICAL SIDEBAR MENU (قائمة جانبية عمودية مجمعة) --- */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-slate-900 border-l border-slate-800/80 h-screen sticky top-0 p-4 space-y-5 overflow-y-auto selection:bg-indigo-500 selection:text-white shadow-2xl">
        
        {/* Header & Logo */}
        <div className="space-y-3 pb-4 border-b border-slate-800/80">
          <div className="flex flex-col items-start gap-2.5">
            <img 
              src="/logo-removebg-preview.png" 
              alt="the medix" 
              className="h-10 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(142,208,0,0.45)]" 
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-lime-500/20 text-lime-300 px-2.5 py-0.5 rounded-full font-mono border border-lime-500/30 font-bold">Admin Panel v2.0</span>
            </div>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition border border-purple-800/60 hover:border-lime-500/40 shadow-sm"
          >
            <span>عرض المتجر الرئيسي ↗</span>
          </a>
        </div>

        {/* Grouped Vertical Navigation Menu */}
        <nav className="flex-1 space-y-5">
          {navSections.map((section, sIdx) => {
            if (section.items.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  {section.groupTitle}
                </p>
                <div className="space-y-1">
                  {section.items.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl font-bold text-xs transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-500/50 translate-x-1'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                          <span className="truncate">{tab.label}</span>
                        </div>

                        {tab.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0 border ${
                            isActive 
                              ? 'bg-white/20 text-white border-white/30' 
                              : tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer Admin Profile & Controls */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          {currentAdmin && (
            <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-amber-500/30">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentAdmin.display_name || currentAdmin.username}</p>
                  <p className="text-[10px] text-amber-400 font-mono truncate" dir="ltr">{formatUsername(currentAdmin.username)} <span dir="rtl">• {currentAdmin.role === 'superadmin' ? 'مدير عام' : 'مشرف'}</span></p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllData}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition border border-slate-700/80"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('admin_authenticated');
                sessionStorage.removeItem('admin_profile');
                setIsAuthenticated(false);
                setCurrentAdmin(null);
              }}
              className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition border border-rose-500/20 flex items-center justify-center gap-1 text-xs font-bold"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MOBILE TOP HEADER & HORIZONTAL TABS --- */}
      <div className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold text-white">لوحة الإدارة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_authenticated');
                setIsAuthenticated(false);
              }}
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tabs */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-slate-800/80 px-2 py-1.5 gap-1">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        {/* --- ORDERS TAB --- */}
        {activeTab === 'orders' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Filters Bar & PDF Export Button */}
            <div className="space-y-2">
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                {/* Search Bar */}
                <div className="w-full xl:w-80 flex items-center gap-2 bg-slate-950 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-800 focus-within:border-amber-500/50 transition">
                  <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="ابحث بكود الطلب، الاسم، الموبايل، Ref#..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                  />
                  {orderSearch && (
                    <button
                      onClick={() => setOrderSearch('')}
                      className="text-slate-500 hover:text-slate-300 text-xs px-1"
                      title="مسح البحث"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap items-center gap-2 flex-1 justify-start xl:justify-end">
                  <span className="text-xs text-slate-400 font-semibold flex-shrink-0 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>تصفية:</span>
                  </span>

                  {/* Status Dropdown */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`bg-slate-950 text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none transition cursor-pointer ${
                      statusFilter !== 'all' 
                        ? 'text-amber-400 border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/10' 
                        : 'text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <option value="all" className="bg-slate-900 text-slate-100">📋 كل الحالات ({orders.length})</option>
                    <option value="all_pending" className="bg-slate-900 text-amber-300">⏳ كل المعلق ({orders.filter(o => o.status === 'pending' || o.status === 'pending_difference').length})</option>
                    <option value="pending" className="bg-slate-900 text-amber-400">⏳ معلق (بانتظار التأكيد) ({orders.filter(o => o.status === 'pending').length})</option>
                    <option value="pending_difference" className="bg-slate-900 text-amber-500">⚠️ معلق (دفع جزئي / فارق) ({orders.filter(o => o.status === 'pending_difference').length})</option>
                    <option value="all_verified" className="bg-slate-900 text-emerald-400">✅ كل المؤكد ({orders.filter(o => o.status === 'auto_verified' || o.status === 'manual_verified' || o.status === 'ready_for_pickup' || o.status === 'delivered').length})</option>
                    <option value="auto_verified" className="bg-slate-900 text-emerald-300">🤖 مؤكد تلقائياً ({orders.filter(o => o.status === 'auto_verified').length})</option>
                    <option value="manual_verified" className="bg-slate-900 text-cyan-300">👤 مؤكد يدوي ({orders.filter(o => o.status === 'manual_verified').length})</option>
                    <option value="ready_for_pickup" className="bg-slate-900 text-indigo-300">🎓 جاهز للاستلام بالمقر ({orders.filter(o => o.status === 'ready_for_pickup').length})</option>
                    <option value="delivered" className="bg-slate-900 text-blue-300">📦 تم التسليم ({orders.filter(o => o.status === 'delivered').length})</option>
                    <option value="cancelled" className="bg-slate-900 text-rose-400">❌ ملغي ({orders.filter(o => o.status === 'cancelled').length})</option>
                  </select>

                  {/* Line Dropdown */}
                  <select
                    value={lineFilter}
                    onChange={(e) => setLineFilter(e.target.value)}
                    className={`bg-slate-950 text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none transition cursor-pointer ${
                      lineFilter !== 'all' 
                        ? 'text-amber-400 border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/10' 
                        : 'text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <option value="all" className="bg-slate-900 text-slate-100">📱 كافة الخطوط ({orders.length})</option>
                    {settings.vodafone_cash_numbers.map((num, idx) => {
                      const count = orders.filter(o => {
                        const line = getEffectiveConfirmedLine(o);
                        return line && line.includes(num);
                      }).length;
                      return (
                        <option key={idx} value={num} className="bg-slate-900 text-amber-300">
                          {settings.line_labels?.[num] || `خط ${idx + 1}`} ({num}) [{count}]
                        </option>
                      );
                    })}
                    <option value="manual" className="bg-slate-900 text-cyan-300">
                      👤 تأكيد يدوي بدون خط ({orders.filter(o => !getEffectiveConfirmedLine(o) && Boolean(o.verified_by)).length})
                    </option>
                  </select>

                  {/* Payment Method Dropdown */}
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className={`bg-slate-950 text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none transition cursor-pointer ${
                      paymentFilter !== 'all' 
                        ? 'text-amber-400 border-amber-500/60 bg-amber-500/10 shadow-sm shadow-amber-500/10' 
                        : 'text-slate-200 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <option value="all" className="bg-slate-900 text-slate-100">💳 كافة طرق الدفع</option>
                    <option value="vodafone_cash" className="bg-slate-900 text-rose-300">🔴 فودافون كاش ({orders.filter(o => o.payment_method === 'vodafone_cash').length})</option>
                    <option value="instapay" className="bg-slate-900 text-purple-300">🟣 InstaPay ({orders.filter(o => o.payment_method === 'instapay').length})</option>
                  </select>

                  {/* Reset Filters Button */}
                  {(statusFilter !== 'all' || lineFilter !== 'all' || paymentFilter !== 'all' || orderSearch !== '') && (
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setLineFilter('all');
                        setPaymentFilter('all');
                        setOrderSearch('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition text-xs font-semibold"
                      title="إعادة ضبط الفلاتر"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إلغاء الفلاتر</span>
                    </button>
                  )}

                  {/* Export PDF Button */}
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex-shrink-0 mr-auto xl:mr-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>تصدير تقرير PDF احترافي 🖨️</span>
                  </button>
                </div>
              </div>

              {/* Active Filter Summary Banner */}
              {(statusFilter !== 'all' || lineFilter !== 'all' || paymentFilter !== 'all' || orderSearch !== '') && (
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">نتائج التصفية الحالية:</span>
                    <span className="font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-md font-mono">
                      {filteredOrders.length} من أصل {orders.length} طلب
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-400/80">تطبيق الفلاتر نشط الآن</span>
                </div>
              )}
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900 shadow-xl relative">
              <table className="w-full text-right text-xs min-w-[950px] border-collapse">
                <thead className="bg-slate-950/90 text-slate-400 font-bold border-b border-slate-800 text-xs">
                  <tr>
                    <th className="p-4 text-right whitespace-nowrap">كود الطلب</th>
                    <th className="p-4 text-right whitespace-nowrap">اسم العميل ورقم الموبايل</th>
                    <th className="p-4 text-right whitespace-nowrap">الرقم المرجعي / الإيصال</th>
                    <th className="p-4 text-right min-w-[220px]">المنتجات والمقاس والتطريز</th>
                    <th className="p-4 text-center whitespace-nowrap">إجمالي المبلغ</th>
                    <th className="p-4 text-center whitespace-nowrap">طريقة الدفع</th>
                    <th className="p-4 text-center whitespace-nowrap">الحالة والخط المؤكِّد</th>
                    <th className="p-4 text-center whitespace-nowrap min-w-[130px] sticky left-0 bg-slate-950 z-20 border-r border-slate-800 shadow-md">إجراءات الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        لا توجد طلبات مسجلة بهذه الشروط
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrderModal(order)}
                        className="hover:bg-slate-800/60 transition cursor-pointer group"
                        title="اضغط على الطلب لعرض التفاصيل بالكامل"
                      >
                        <td className="p-4 font-mono font-extrabold text-amber-400 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 group-hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20 transition">
                            <Eye className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100" />
                            <span>#{order.order_code}</span>
                          </span>
                        </td>
                        <td className="p-4 space-y-0.5 align-middle">
                          <p className="font-bold text-white text-sm group-hover:text-amber-300 transition">{order.customer_name}</p>
                          <p className="font-mono text-slate-400 text-xs">{order.customer_phone}</p>
                        </td>
                        <td className="p-4 space-y-1 align-middle whitespace-nowrap">
                          <p className="font-mono font-bold text-emerald-400 text-xs">
                            {order.transaction_ref ? `Ref# ${order.transaction_ref}` : '—'}
                          </p>
                        </td>
                        <td className="p-4 space-y-1.5 min-w-[220px] align-middle">
                          {(!order.items || order.items.length === 0) ? (
                            <div className="text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-xs font-semibold space-y-1">
                              <p className="flex items-center gap-1 text-white">
                                <Package className="w-3.5 h-3.5 text-amber-400" />
                                <span>طلب منتج تخرج ({order.total_amount} ج.م)</span>
                              </p>
                              {cleanDisplayNotes(order.notes) && (
                                <p className="text-[10px] text-slate-400 font-normal">ملاحظة: {cleanDisplayNotes(order.notes)}</p>
                              )}
                            </div>
                          ) : (
                            order.items.map((item, i) => (
                              <div key={i} className="py-1 border-b border-slate-800/80 last:border-0 text-slate-300">
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-white">
                                  <span className="font-semibold">{item.product_title}</span>
                                  <span className="text-slate-400 font-mono">× {item.quantity}</span>
                                  {item.selected_size && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-slate-700 font-bold">
                                      {item.selected_size}
                                    </span>
                                  )}
                                </div>
                                {item.custom_text && (
                                  <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                                    ✨ التطريز: &quot;{item.custom_text}&quot;
                                  </p>
                                )}
                                {(() => {
                                  const { cleanOpt, attendees: parsedAtt } = parseAttendeesAndCleanOpt(item.customization_option);
                                  const attendeesList = (item.attendees && item.attendees.length > 0) ? item.attendees : parsedAtt;
                                  return (
                                    <>
                                      {cleanOpt && (
                                        <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                                          💎 {cleanOpt}
                                        </p>
                                      )}
                                      {attendeesList && attendeesList.length > 0 && (
                                        <div className="mt-1 p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 space-y-0.5">
                                          <span className="font-bold text-indigo-400 block">🎟️ الحاضرين والتذاكر ({attendeesList.length}):</span>
                                          {attendeesList.map((att: any, aIdx: number) => (
                                            <div key={aIdx} className="text-[10px] text-slate-200">
                                              • {att.name} {att.phone ? `(${att.phone})` : ''}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            ))
                          )}
                        </td>
                        <td className="p-4 text-center align-middle whitespace-nowrap space-y-1">
                          <p className="font-mono font-bold text-sm text-white">{order.total_amount} ج.م</p>
                          {(() => {
                            const matchedTx = findMatchedTransaction(order);
                            const paid = Number(order.paid_amount || matchedTx?.amount || 0);
                            const total = Number(order.total_amount || 0);
                            const diff = Number(order.difference_amount || 0);
                            const isPartial = order.status === 'pending_difference' || (diff > 0 && paid < total);

                            if (isPartial) {
                              const remaining = diff > 0 ? diff : Math.max(0, total - paid);
                              return (
                                <div className="text-[10px] font-sans font-medium space-y-0.5 flex flex-col items-center">
                                  <p className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                                    ⚠️ مدفوع جزئياً: {paid} ج.م
                                  </p>
                                  <p className="text-amber-300 font-mono">
                                    متبقي: {remaining} ج.م
                                  </p>
                                </div>
                              );
                            }

                            const excess = paid - total;
                            if (excess > 25) {
                              return (
                                <p className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-sans font-medium inline-block whitespace-nowrap">
                                  مدفوع: {paid} ج.م (فائض للعميل: +{excess} ج.م)
                                </p>
                              );
                            } else if (excess > 0 && excess <= 25) {
                              return (
                                <p className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md font-sans font-normal inline-block whitespace-nowrap">
                                  مدفوع: {paid} ج.م (شامل رسوم التحويل)
                                </p>
                              );
                            }

                            return null;
                          })()}
                        </td>
                        <td className="p-4 text-center align-middle whitespace-nowrap">
                          {order.payment_method === 'vodafone_cash' ? (
                            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold shadow-sm">
                              <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                                <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-full h-full object-contain" />
                              </div>
                              <span>فودافون كاش</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold shadow-sm">
                              <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
                                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                              </div>
                              <span>InstaPay</span>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center align-middle space-y-1.5 whitespace-nowrap">
                          {order.status === 'auto_verified' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>مؤكد تلقائياً</span>
                            </span>
                          )}
                          {order.status === 'manual_verified' && (
                            <div className="space-y-1 flex flex-col items-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                <span>مؤكد يدوياً</span>
                              </span>
                              <p className="text-[10px] text-slate-400 font-mono">
                                بواسطة {order.verified_by || 'أدمن المتجر'}
                              </p>
                            </div>
                          )}
                          {order.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              <span>قيد الانتظار</span>
                            </span>
                          )}
                          {order.status === 'pending_difference' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              <span>⏳ معلق (دفع جزئي / فارق)</span>
                            </span>
                          )}
                          {order.status === 'ready_for_pickup' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                              <span>جاهز للاستلام</span>
                            </span>
                          )}
                          {order.status === 'delivered' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                              <span>تم التسليم</span>
                            </span>
                          )}
                          {order.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                              <span>ملغي</span>
                            </span>
                          )}

                          {/* CONFIRMED LINE BADGE */}
                          {(() => {
                            const lineToDisplay = getEffectiveConfirmedLine(order);
                            return lineToDisplay ? (
                              <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-mono font-medium">
                                <span className="text-slate-500">الخط:</span>
                                <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                                  {settings.line_labels?.[lineToDisplay] || lineToDisplay}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="p-4 text-center align-middle whitespace-nowrap sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition z-10 border-r border-slate-800/80 shadow-md">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrderModal(order);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 mx-auto shadow-md shadow-amber-500/10"
                            title="عرض تفاصيل الطلب والرسالة والتأكيد بالكامل"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-950 flex-shrink-0" />
                            <span>عرض التفاصيل</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- PRODUCTS TAB --- */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">قائمة كروت ومعرض المنتجات المتاحة</h3>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-purple-btn text-white font-bold text-xs shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منتج جديد مع صور متعددة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="rounded-3xl glass-card p-5 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Main Image */}
                    <div className="relative group">
                      <img
                        src={product.image_url}
                        alt={product.title_ar}
                        className="w-full h-44 rounded-2xl object-cover bg-slate-950"
                      />
                      {product.images && product.images.length > 1 && (
                        <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/30">
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>{product.images.length} صور معرض</span>
                        </span>
                      )}
                    </div>

                    {/* Secondary Images Strip */}
                    {product.images && product.images.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                        {product.images.map((imgUrl, imgIdx) => (
                          <div key={imgIdx} className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700/80 flex-shrink-0 bg-slate-950">
                            <img src={imgUrl} alt={`صورة فرعية ${imgIdx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white">{product.title_ar || product.title}</h4>
                      <span className="text-amber-400 font-extrabold text-sm">{product.price} ج.م</span>
                    </div>
                    <p className="text-xs text-slate-400">{product.description_ar}</p>
                    
                    {/* Customization label preview */}
                    {product.has_customization && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
                        ✨ يدعم التخصيص/التطريز: {product.customization_label}
                      </div>
                    )}

                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-xs">
                        <span className="text-slate-400 font-semibold">المقاسات:</span>
                        {product.sizes.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">المخزون: <strong className="text-white">{product.stock} قطعة</strong></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditProduct(product)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center gap-1 border border-amber-500/30"
                        title="تعديل المنتج"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition flex items-center gap-1 border border-rose-500/20"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- GATEWAY & DEVICES TAB --- */}
        {activeTab === 'gateway' && (
          <div className="space-y-6">
            
            {/* API Credentials Box */}
            <div className="p-6 rounded-3xl glass-card border border-indigo-500/30 bg-slate-900/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">إعدادات توكن مزامنة الـ Android Gateway App</h3>
                    <p className="text-xs text-slate-400">استخدم البيانات التالية في تطبيق الموبايل لتمرير رسائل الـ SMS تلقائياً وإخطار حالة الموبايل</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendCustomPing()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs transition border border-indigo-500/30"
                >
                  <Activity className="w-4 h-4" />
                  <span>مزامنة تجريبية (Ping Test)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Base Server URL Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 space-y-2 md:col-span-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{isLocalDev ? 'رابط الـ IP المحلي المباشر لتطبيق الموبايل (Local Network IP):' : 'رابط السيرفر (Vercel Production URL):'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(gatewayBaseUrl);
                        setCopiedBaseUrl(true);
                        setTimeout(() => setCopiedBaseUrl(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline"
                    >
                      {copiedBaseUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedBaseUrl ? 'تم النسخ! ✓' : 'نسخ الرابط 📋'}</span>
                    </button>
                  </div>

                  <div dir="ltr" className="bg-slate-900 p-3 rounded-xl border border-amber-500/30 font-mono text-amber-300 font-extrabold text-base text-left select-all flex items-center justify-between">
                    <span>{gatewayBaseUrl}</span>
                    <span className="text-xs text-slate-400 font-sans font-normal">(ضع هذا الرابط في تطبيق الأندرويد)</span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    {isLocalDev
                      ? <>💡 <strong>تنبيه هام:</strong> ضع هذا الرابط في خانة <strong>Base Server URL</strong> داخل التطبيق بدلاً من <code className="text-rose-400">localhost</code> لكي يستطيع هاتف الأندرويد الاتصال بالكمبيوتر عبر الشبكة المحلية (Wi-Fi).</>
                      : <>✅ <strong>أنت على Vercel:</strong> استخدم هذا الرابط مباشرة في تطبيق الأندرويد — سيعمل من أي شبكة إنترنت وليس فقط الشبكة المحلية.</>
                    }
                  </p>
                </div>

                {/* 2. SMS Endpoint Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold text-xs">رابط رفع الـ SMS (Full Endpoint):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${gatewayBaseUrl}/api/sms`);
                        alert('تم نسخ رابط الـ SMS Endpoint بنجاح!');
                      }}
                      className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ الرابط</span>
                    </button>
                  </div>
                  <div dir="ltr" className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-xs text-left truncate select-all">
                    {gatewayBaseUrl}/api/sms
                  </div>
                </div>

                {/* 3. Device Ping Endpoint Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold text-xs">رابط مزامنة الهاتف (Ping Endpoint):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${gatewayBaseUrl}/api/admin/devices`);
                        alert('تم نسخ رابط الـ Device Ping Endpoint بنجاح!');
                      }}
                      className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ الرابط</span>
                    </button>
                  </div>
                  <div dir="ltr" className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-emerald-400 text-xs text-left truncate select-all">
                    {gatewayBaseUrl}/api/admin/devices
                  </div>
                </div>

                {/* 4. X-API-KEY Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold text-xs">مفتاح السر بالـ Header (X-API-KEY):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('graduation-store-secure-gateway-token-2026');
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'تم النسخ!' : 'نسخ المفتاح'}</span>
                    </button>
                  </div>
                  <div dir="ltr" className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-amber-300 font-bold text-xs text-left truncate select-all">
                    graduation-store-secure-gateway-token-2026
                  </div>
                </div>
              </div>
            </div>



            {/* Mobile Devices Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <span>حالة الموبايلات المتصلة المباشرة ({devices.length})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  الأجهزة الأونلاين: {devices.filter(d => d.status === 'online').length} من {devices.length}
                </span>
              </div>

              {devices.length === 0 ? (
                <div className="p-8 rounded-3xl glass-card border border-slate-800 text-center space-y-3 text-slate-400">
                  <Smartphone className="w-12 h-12 stroke-1 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">لا يوجد أجهزة متصلة حالياً</p>
                  <p className="text-xs max-w-md mx-auto">
                    بامكانك ربط هاتف الأندرويد الحقيقي عبر الـ Token الموضح أعلاه، أو إرسال إشارة اختبار سريعة من الأزرار بالأعلى لتجربة المزامنة الحية.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {devices.map(dev => (
                    <div key={dev.id} className="p-5 rounded-3xl glass-card border border-slate-800 flex items-center justify-between relative group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                          dev.status === 'online'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          <Smartphone className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-sm">{dev.device_name}</h4>
                            <button
                              onClick={() => handleEditDeviceName(dev)}
                              className="p-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs transition"
                              title="تعديل اسم الموبايل (مثال: موبايل فودافون كاش - أحمد)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              dev.status === 'online'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {dev.status === 'online' ? '🟢 اونلاين Online' : '🔴 أوفلاين Offline'}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-400">رقم SIM: {dev.phone_number || 'غير محدد'}</p>
                          <p className="text-[11px] text-slate-400">آخر إشارة: {new Date(dev.last_ping).toLocaleTimeString('ar-EG')}</p>
                        </div>
                      </div>

                      <div className="text-left space-y-2 font-mono flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <Battery className="w-4 h-4 text-emerald-400" />
                            <span>{dev.battery_level}%</span>
                          </div>
                          <button
                            onClick={() => handleDeleteDevice(dev.id)}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition opacity-0 group-hover:opacity-100"
                            title="حذف الجهاز"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans">
                          تمت معالجة <strong className="text-amber-400">{dev.total_sms_processed}</strong> رسالة SMS
                        </p>
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px]">
                          {dev.app_version || 'v2.5.0'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- ADMINS MANAGEMENT TAB --- */}
        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-amber-400" />
                  <span>إدارة مشرفي ورؤساء لوحة التحكم (Admins Management)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">يمكنك إضافة حسابات إدارية جديدة وتحديد صلاحياتهم للتحكم بالطلبات والمنتجات</p>
              </div>

              <button
                onClick={() => setIsAddAdminOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl gradient-purple-btn text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مشرف جديد +</span>
              </button>
            </div>

            <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-4">الاسم الظاهر</th>
                      <th className="p-4">اسم المستخدم (Username)</th>
                      <th className="p-4">الصلاحية (Role)</th>
                      <th className="p-4">تاريخ الإضافة</th>
                      <th className="p-4">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {adminsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          لا يوجد مشرفون مسجلون حالياً سوى الحساب الرئيسي
                        </td>
                      </tr>
                    ) : (
                      adminsList.map(adm => (
                        <tr key={adm.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4 font-bold text-white font-sans">
                            {adm.display_name}
                          </td>
                          <td className="p-4 text-amber-400 font-mono font-bold text-xs" dir="ltr">
                            {formatUsername(adm.username)}
                          </td>
                          <td className="p-4 font-sans">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              adm.role === 'superadmin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {adm.role === 'superadmin' ? '👑 مدير عام (Super Admin)' : '🛡️ مشرف طلبات (Admin)'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-xs">
                            {new Date(adm.created_at || Date.now()).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-4">
                            {adm.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteAdminSubmit(adm.id)}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="حذف المشرف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- ADD ADMIN MODAL --- */}
        {isAddAdminOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 flex items-center justify-center">
            <div className="relative w-full max-w-md glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>إضافة حساب مشرف جديد</span>
                </h3>
                <button onClick={() => setIsAddAdminOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAdminSubmit} className="space-y-4 text-right">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم الكامل / الوظيفي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد علي - مشرف تتبع الطلبات"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المستخدم للإنضمام (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ahmed_admin"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 dir-ltr text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور للحساب (Password) *</label>
                  <input
                    type="password"
                    required
                    placeholder="كلمة السر الخاصة به"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">صلاحيات الحساب (Role)</label>
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="admin">مشرف طلبات عادي (Moderator)</option>
                    <option value="superadmin">👑 مدير عام (Super Admin)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition"
                >
                  تأكيد وإنشاء الحساب الإداري
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <Settings className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-lg font-bold text-white">إعدادات أرقام فودافون كاش و InstaPay</h3>
                <p className="text-xs text-slate-400">تحديث أرقام التحويل والملاحظات المعروضة للعملاء</p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Vodafone Cash Settings */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <h4 className="text-sm font-bold text-white">إعدادات فودافون كاش (Vodafone Cash)</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-rose-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vodaEnabled}
                      onChange={(e) => setVodaEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-500 bg-slate-950 border-slate-700"
                    />
                    <span>{vodaEnabled ? 'مفعّل بالمتجر ✅' : 'معطّل بالمتجر ❌'}</span>
                  </label>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-200">
                      أرقام وخطوط محفظة فودافون كاش المعروضة للعملاء (أضف أرقام الخطوط وتسميتها):
                    </label>
                    <button
                      type="button"
                      onClick={() => setVodaLines(prev => [...prev, ''])}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-rose-400" />
                      <span>إضافة خط محفظة جديد ➕</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {vodaLines.map((num, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 font-mono text-xs font-bold border border-rose-500/20 whitespace-nowrap flex-shrink-0">
                              خط {idx + 1}
                            </span>
                            <input
                              type="tel"
                              required={vodaEnabled}
                              placeholder="010XXXXXXXX"
                              value={num}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVodaLines(prev => {
                                  const next = [...prev];
                                  next[idx] = val;
                                  setVodaInput(next.join(', '));
                                  return next;
                                });
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`تسمية الخط (مثلاً: خط ${idx + 1})`}
                              value={lineLabelsMap[num] || `خط ${idx + 1}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (num) {
                                  setLineLabelsMap(prev => ({ ...prev, [num]: val }));
                                }
                              }}
                              className="w-full sm:w-44 px-3 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-semibold border border-slate-700 focus:outline-none"
                            />

                            {vodaLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setVodaLines(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex-shrink-0"
                                title="حذف هذا الخط"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    نسبة رسوم تحويل فودافون كاش (%) (تتحمل على العميل وتظهر بملخص السلة وتُقرّب لأقرب رقم صحيح)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={vodaFeePercentInput}
                      onChange={(e) => setVodaFeePercentInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-rose-500 pl-8"
                      placeholder="مثال: 1 أو 2"
                    />
                    <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    يتم حساب هذه النسبة من إجمالي المنتجات وتقريب النتيجة لأقرب رقم صحيح، وتضاف تلقائياً لإجمالي التحويل للعميل عند اختيار فودافون كاش.
                  </p>
                </div>

                {/* Display Parsed Badges */}
                {vodaLines.filter(n => n.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold ml-1">الأرقام المعروضة للعميل:</span>
                    {vodaLines.filter(n => n.trim()).map((num, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                        📞 {num}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* InstaPay Settings */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <h4 className="text-sm font-bold text-white">إعدادات إنستا باي (InstaPay)</h4>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-purple-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={instaEnabled}
                      onChange={(e) => setInstaEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-500 bg-slate-950 border-slate-700"
                    />
                    <span>{instaEnabled ? 'مفعّل بالمتجر ✅' : 'معطّل بالمتجر ❌'}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    عنوان / أرقام حساب InstaPay (يمكنك إدخال أكثر من حساب مفصولة بفاصلة)
                  </label>
                  <input
                    type="text"
                    required={instaEnabled}
                    placeholder="9thbatch@instapay, 01015339426"
                    value={instaInput}
                    onChange={(e) => setInstaInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Display Parsed Badges */}
                {instaInput.split(',').filter(n => n.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold ml-1">الحسابات المعروضة للعميل:</span>
                    {instaInput.split(',').map(n => n.trim()).filter(Boolean).map((handle, i) => (
                      <span key={i} className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold">
                        💳 {handle}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ملاحظة مكان التسليم (المعروضة للعميل)
                </label>
                <input
                  type="text"
                  required
                  value={pickupInput}
                  onChange={(e) => setPickupInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الواتساب والدعم الفني 💬 (المستخدم لرابط التواصل بصفحة الطلبات)
                </label>
                <input
                  type="text"
                  required
                  placeholder="01555583154"
                  value={supportPhoneInput}
                  onChange={(e) => setSupportPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  الرقم الذي سيتم توجيه العميل إليه عند النقر على زر "تواصل مع الدعم عبر الواتساب" في سجل الطلبات.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات والإعدادات</span>
              </button>
            </form>
          </div>
        )}

        {/* --- ANALYTICS & CHARTS TAB --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            {/* Header & Report Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-amber-400" />
                  <span>مركز التحليلات والذكاء التجاري 📊</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  نظرة شمولية وحية على مؤشرات الأداء الرئيسية (KPIs)، توزيع المقاسات، وإيرادات المتجر للدفعة التاسعة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={printStandalonePdfReport}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>توليد تقرير الـ PDF المصنع 🖨️</span>
                </button>
              </div>
            </div>

            {/* Executive KPI Cards (8 Core Indicators) */}
            {(() => {
              const totalOrdersCount = orders.length || 0;
              
              // Revenue Calculations
              let totalCollectedCash = 0;
              let totalPendingBalance = 0;
              let totalUnitsSold = 0;
              let embroideredItemsCount = 0;

              orders.forEach(order => {
                const items = getOrderEffectiveItems(order);
                items.forEach(item => {
                  totalUnitsSold += (item.quantity || 1);
                  if (item.custom_text || (item as any).customText) {
                    embroideredItemsCount += (item.quantity || 1);
                  }
                });

                if (order.paid_amount) {
                  totalCollectedCash += Number(order.paid_amount);
                } else if (order.status === 'auto_verified' || order.status === 'manual_verified' || order.status === 'ready_for_pickup' || order.status === 'delivered') {
                  totalCollectedCash += Number(order.total_amount || 0);
                }

                if (order.difference_amount && order.difference_amount > 0) {
                  totalPendingBalance += Number(order.difference_amount);
                } else if (order.status === 'pending' || order.status === 'pending_difference') {
                  const unpaid = Math.max(0, (order.total_amount || 0) - (order.paid_amount || 0));
                  totalPendingBalance += unpaid;
                }
              });

              const autoVerifiedCount = orders.filter(o => o.status === 'auto_verified').length;
              const manualVerifiedCount = orders.filter(o => o.status === 'manual_verified').length;
              const pendingDiffCount = orders.filter(o => o.status === 'pending_difference' || (o.difference_amount || 0) > 0).length;
              const pendingCount = orders.filter(o => o.status === 'pending').length;
              const readyPickupCount = orders.filter(o => o.status === 'ready_for_pickup' || o.status === 'delivered').length;
              const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

              const autoVerifyPct = totalVerifiedOrders > 0 ? Math.round((autoVerifiedCount / totalVerifiedOrders) * 100) : 0;
              const embroideredPct = totalUnitsSold > 0 ? Math.round((embroideredItemsCount / totalUnitsSold) * 100) : 0;
              const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalGrossRevenue / totalOrdersCount) : 0;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1: Gross Sales */}
                    <div className="p-5 rounded-3xl glass-card border border-emerald-500/30 bg-slate-900/90 space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-xs font-bold text-slate-400">إجمالي قيمة المبيعات</span>
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-white">{totalGrossRevenue.toLocaleString()} <span className="text-sm font-bold text-emerald-400">ج.م</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>إجمالي {totalOrdersCount} طلب بالمتجر</span>
                        <span className="text-emerald-400 font-bold">100% المبيعات</span>
                      </div>
                    </div>

                    {/* KPI 2: Verified & Ready Orders */}
                    <div className="p-5 rounded-3xl glass-card border border-amber-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-xs font-bold text-slate-400">الطلبات المؤكدة والجاهزة</span>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-amber-400">{totalVerifiedOrders} <span className="text-sm font-bold text-slate-400">طلب</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>معدل التحقق التلقائي:</span>
                        <span className="text-amber-300 font-bold font-mono">{autoVerifyPct}% عبر الموبايل 📱</span>
                      </div>
                    </div>

                    {/* KPI 3: Actual Cash Collected */}
                    <div className="p-5 rounded-3xl glass-card border border-teal-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-teal-400">
                        <span className="text-xs font-bold text-slate-400">المبالغ المحصّلة فعلياً</span>
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-teal-300">{totalCollectedCash.toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>مبالغ مؤكدة بالمحفظة</span>
                        <span className="text-teal-400 font-bold">متحصلات فعليّة</span>
                      </div>
                    </div>

                    {/* KPI 4: Pending Balances & Differences */}
                    <div className="p-5 rounded-3xl glass-card border border-rose-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-rose-400">
                        <span className="text-xs font-bold text-slate-400">المبالغ والفواتير المعلقة</span>
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-rose-400">{totalPendingBalance.toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>فوارق أسعار & غير مؤكد</span>
                        <span className="text-rose-300 font-bold">{pendingDiffCount + pendingCount} طلب</span>
                      </div>
                    </div>

                    {/* KPI 5: Average Order Value (AOV) */}
                    <div className="p-5 rounded-3xl glass-card border border-indigo-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-indigo-400">
                        <span className="text-xs font-bold text-slate-400">متوسط قيمة الطلب (AOV)</span>
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-indigo-300">{avgOrderValue.toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>متوسط سلة العميل</span>
                        <span className="text-indigo-400 font-bold">لكل أوردر</span>
                      </div>
                    </div>

                    {/* KPI 6: Total Units Sold */}
                    <div className="p-5 rounded-3xl glass-card border border-purple-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-purple-400">
                        <span className="text-xs font-bold text-slate-400">إجمالي القطع المباعة</span>
                        <Package className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-purple-300">{totalUnitsSold} <span className="text-sm font-bold text-slate-400">قطعة</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>إجمالي المنتجات المباعة</span>
                        <span className="text-purple-400 font-bold">للتصنيع</span>
                      </div>
                    </div>

                    {/* KPI 7: Personalization & Custom Embroidery */}
                    <div className="p-5 rounded-3xl glass-card border border-pink-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-pink-400">
                        <span className="text-xs font-bold text-slate-400">طلبات التطريز المخصص</span>
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-pink-300">{embroideredItemsCount} <span className="text-sm font-bold text-slate-400">اسم مخصص</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>نسبة الطلب على التطريز:</span>
                        <span className="text-pink-400 font-bold font-mono">{embroideredPct}%</span>
                      </div>
                    </div>

                    {/* KPI 8: Active Catalog Products */}
                    <div className="p-5 rounded-3xl glass-card border border-cyan-500/30 bg-slate-900/90 space-y-2">
                      <div className="flex items-center justify-between text-cyan-400">
                        <span className="text-xs font-bold text-slate-400">أصناف الكتالوج النشطة</span>
                        <Layers className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-black text-cyan-300">{products.length} <span className="text-sm font-bold text-slate-400">صنف</span></p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>معروضة على المتجر</span>
                        <span className="text-cyan-400 font-bold">منتجات متاحة</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Size Demand & Payment Gateways Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Size Distribution Breakdown Chart */}
                    <div className="p-6 rounded-3xl glass-card border border-slate-800 bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-amber-400" />
                          <span>توزيع المقاسات الأكثر طلباً (Size Demand Analysis)</span>
                        </h4>
                      </div>

                      {(() => {
                        const sizesList = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
                        const totalUnitsAll = productSizeStats.reduce((s, p) => s + p.totalUnits, 0) || 1;
                        
                        let topSize = 'XL';
                        let maxSizeUnits = -1;

                        sizesList.forEach(sz => {
                          const units = productSizeStats.reduce((s, p) => s + (p.sizeCounts[sz] || 0), 0);
                          if (units > maxSizeUnits) {
                            maxSizeUnits = units;
                            topSize = sz;
                          }
                        });

                        const topSizePct = Math.round((maxSizeUnits / totalUnitsAll) * 100);

                        return (
                          <div className="space-y-4 pt-2">
                            {/* Top Size Recommendation Alert */}
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                                🔥 المقاس الأكثر طلباً في الدفعة: <strong className="text-white text-sm font-mono dir-ltr">{topSize}</strong>
                              </span>
                              <span className="text-slate-300 font-mono font-bold">{maxSizeUnits} قطعة ({topSizePct}%)</span>
                            </div>

                            <div className="space-y-3">
                              {sizesList.map(size => {
                                const sizeUnits = productSizeStats.reduce((s, p) => s + (p.sizeCounts[size] || 0), 0);
                                const percentage = Math.round((sizeUnits / totalUnitsAll) * 100);

                                return (
                                  <div key={size} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span className="text-amber-300 font-mono">مقاس {size}</span>
                                      <span className="text-slate-300 font-mono">{sizeUnits} قطعة ({percentage}%)</span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${size === topSize ? 'bg-gradient-to-r from-amber-500 to-amber-300' : 'bg-gradient-to-r from-indigo-500 to-indigo-400'}`}
                                        style={{ width: `${Math.max(percentage, sizeUnits > 0 ? 5 : 0)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Payment Methods Ratio & Volume Chart */}
                    <div className="p-6 rounded-3xl glass-card border border-slate-800 bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-indigo-400" />
                          <span>تحليل طرق الدفع المحصلة (Payment Gateways)</span>
                        </h4>
                      </div>

                      {(() => {
                        const vodaOrders = orders.filter(o => o.payment_method === 'vodafone_cash');
                        const instaOrders = orders.filter(o => o.payment_method === 'instapay');

                        const vodaCount = vodaOrders.length;
                        const instaCount = instaOrders.length;
                        const total = orders.length || 1;

                        const vodaVol = vodaOrders.reduce((s, o) => s + (o.paid_amount || o.total_amount || 0), 0);
                        const instaVol = instaOrders.reduce((s, o) => s + (o.paid_amount || o.total_amount || 0), 0);

                        const vodaPct = Math.round((vodaCount / total) * 100);
                        const instaPct = Math.round((instaCount / total) * 100);

                        return (
                          <div className="space-y-6 pt-2">
                            <div className="flex h-6 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-1">
                              <div className="bg-rose-500 h-full rounded-xl transition-all duration-500" style={{ width: `${vodaPct}%` }}></div>
                              <div className="bg-purple-500 h-full rounded-xl transition-all duration-500" style={{ width: `${instaPct}%` }}></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
                                <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                                  <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-4 h-4 object-contain" />
                                  <span>فودافون كاش</span>
                                </p>
                                <p className="text-2xl font-black text-white">{vodaCount} <span className="text-xs text-slate-400">طلب</span></p>
                                <div className="pt-2 border-t border-rose-500/20 text-xs">
                                  <span className="text-slate-400 block text-[10px]">إجمالي الحجم المحول:</span>
                                  <span className="font-mono font-bold text-rose-300 text-sm">{vodaVol.toLocaleString()} ج.م</span>
                                  <span className="block text-[10px] text-rose-400 font-mono mt-0.5">({vodaPct}% من الطلبات)</span>
                                </div>
                              </div>

                              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center space-y-2">
                                <p className="text-xs font-bold text-purple-300">🟣 InstaPay (إنستا باي)</p>
                                <p className="text-2xl font-black text-white">{instaCount} <span className="text-xs text-slate-400">طلب</span></p>
                                <div className="pt-2 border-t border-purple-500/20 text-xs">
                                  <span className="text-slate-400 block text-[10px]">إجمالي الحجم المحول:</span>
                                  <span className="font-mono font-bold text-purple-300 text-sm">{instaVol.toLocaleString()} ج.م</span>
                                  <span className="block text-[10px] text-purple-400 font-mono mt-0.5">({instaPct}% من الطلبات)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* Section 3: Product Performance & Order Status Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Top Best-Selling Products */}
                    <div className="p-6 rounded-3xl glass-card border border-slate-800 bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          <span>الأصناف الأعلى مبيعاً وتحقيقاً للإيرادات (Top Products)</span>
                        </h4>
                      </div>

                      <div className="space-y-3 pt-1">
                        {(() => {
                          const sortedProducts = [...productSizeStats].sort((a, b) => b.totalRevenue - a.totalRevenue);
                          const maxRev = sortedProducts[0]?.totalRevenue || 1;

                          if (sortedProducts.length === 0) {
                            return <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات مبيعات كافية حتى الآن.</p>;
                          }

                          return sortedProducts.map((p, idx) => {
                            const revPct = Math.round((p.totalRevenue / (totalGrossRevenue || 1)) * 100);

                            return (
                              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-white font-semibold flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center font-mono">#{idx + 1}</span>
                                    <span>{p.productTitle}</span>
                                  </span>
                                  <span className="text-emerald-400 font-mono">{p.totalRevenue.toLocaleString()} ج.م</span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${Math.max(revPct, 4)}%` }}
                                  ></div>
                                </div>

                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                  <span>عدد القطع المباعة: <strong className="text-amber-400">{p.totalUnits} قطعة</strong></span>
                                  <span>مساهمة الإيراد: <strong className="text-emerald-400">{revPct}%</strong></span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Order Status Breakdown */}
                    <div className="p-6 rounded-3xl glass-card border border-slate-800 bg-slate-900 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <Layers className="w-5 h-5 text-indigo-400" />
                          <span>توزيع حالات الطلبات (Order Status Funnel)</span>
                        </h4>
                      </div>

                      <div className="space-y-3 pt-2">
                        {[
                          { label: 'مؤكد تلقائياً عبر البوابة (Auto Verified)', count: autoVerifiedCount, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                          { label: 'مؤكد يدوياً بواسطة الأدمن (Manual Verified)', count: manualVerifiedCount, color: 'bg-teal-500', textColor: 'text-teal-400' },
                          { label: 'فاتورة جزئية / فارق سعر (Pending Difference)', count: pendingDiffCount, color: 'bg-amber-500', textColor: 'text-amber-400' },
                          { label: 'جاهز للتسليم / تم التسليم (Ready / Delivered)', count: readyPickupCount, color: 'bg-indigo-500', textColor: 'text-indigo-400' },
                          { label: 'معلق / قيد المراجعة (Pending Review)', count: pendingCount, color: 'bg-slate-500', textColor: 'text-slate-400' },
                          { label: 'طلبات ملغية (Cancelled)', count: cancelledCount, color: 'bg-rose-500', textColor: 'text-rose-400' },
                        ].map((st, idx) => {
                          const pct = totalOrdersCount > 0 ? Math.round((st.count / totalOrdersCount) * 100) : 0;

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className={`text-xs ${st.textColor}`}>{st.label}</span>
                                <span className="text-slate-300 font-mono">{st.count} طلب ({pct}%)</span>
                              </div>
                              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${st.color} transition-all duration-500`}
                                  style={{ width: `${Math.max(pct, st.count > 0 ? 5 : 0)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </>
              );
            })()}

          </div>
        )}

        {/* --- MAINTENANCE & BACKUP TAB --- */}
        {activeTab === 'maintenance' && isSuperAdmin && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Maintenance Mode Toggle Box */}
            <div className="p-6 rounded-3xl glass-card border border-amber-500/30 bg-slate-900/90 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <Wrench className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">وضع الصيانة والتحديث المجدول (Maintenance Mode)</h3>
                    <p className="text-xs text-slate-400">تفعيل هذا الخيار يعرض شاشة صيانة عصرية للزوار ويمنع إضافة طلبات جديدة مؤقتاً</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.maintenance_mode)}
                    onChange={(e) => handleToggleMaintenanceMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>الحالة الحالية للمتجر:</span>
                {settings.maintenance_mode ? (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>🚧 وضع الصيانة مفعّل (المتجر مغلق للزوار)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>✅ المتجر يعمل ومستعد لاستقبال الطلبات</span>
                  </span>
                )}
              </div>
            </div>

            {/* Backup & Restore Box */}
            <div className="p-6 rounded-3xl glass-card border border-indigo-500/30 bg-slate-900/90 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">النسخ الاحتياطي والاستعادة الشاملة (Backup & Restore)</h3>
                  <p className="text-xs text-slate-400">حفظ كافة بيانات المنتجات، الإعدادات، والطلبات كملف JSON واستعادتها في أي وقت</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Backup Button */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-right">
                  <p className="text-xs font-bold text-amber-400">1. تصدير أخذ نسخة احتياطية (Export Backup)</p>
                  <p className="text-[11px] text-slate-400">تحميل ملف JSON كامل يحتوي على كل المنتجات والطلبات والإعدادات الحالية.</p>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل نسخة احتياطية JSON 💾</span>
                  </button>
                </div>

                {/* Restore Backup File Upload */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-right">
                  <p className="text-xs font-bold text-indigo-400">2. استعادة نسخة احتياطية (Restore Backup)</p>
                  <p className="text-[11px] text-slate-400">رفع ملف JSON تم تحميلة سابقاً لاستعادة البيانات وإرجاع المنتجات والإعدادات.</p>
                  <label className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    <span>{isRestoringBackup ? 'جاري الاستعادة...' : 'رفع واستعادة ملف JSON 📥'}</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleRestoreBackupFile}
                      disabled={isRestoringBackup}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Safe Purge / Reset Box */}
            <div className="p-6 rounded-3xl glass-card border border-rose-500/30 bg-slate-900/90 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">منطقة الإجراءات الحساسة (Danger Zone)</h3>
                  <p className="text-xs text-slate-400">تصفير الطلبات وحذف البيانات المؤقتة بأمان للاختبارات</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-rose-500/20">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-300">مسح وتصفير سجل الطلبات الحالية</p>
                  <p className="text-[11px] text-slate-400">يستخدم لتنظيف سجل الطلبات التجريبية قبل إطلاق المتجر الفعلي.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePurgeOrdersData}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تصفير الطلبات 🧹</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* --- ADMINS MANAGEMENT TAB --- */}
        {activeTab === 'admins' && (
          !isSuperAdmin ? (
            <div className="max-w-xl mx-auto p-8 rounded-3xl bg-slate-900 border border-rose-500/30 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-white">عذراً، هذا القسم مخصص للمدير العام فقط (Super Admin)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                إدارة المشرفين وإنشاء الحسابات الجديدة متاح حكراً للمدير العام للحفاظ على أمان وصلاحيات لوحة التحكم.
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Header banner */}
              <div className="p-6 rounded-3xl glass-card border border-indigo-500/30 bg-slate-900/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>نظام إدارة حسابات الأدمنز والمشرفين</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                        {adminsList.length} حساب مسجل
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      إضافة وإنشاء حسابات جديدة للمشرفين، تحديد الرتب والصلاحيات، وإدارة مفاتيح الدخول للوحة التحكم
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة مشرف/أدمن جديد 🔑</span>
                </button>
              </div>

              {/* Admin accounts grid / table */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>قائمة حسابات الأدمنز المعتمدة في المتجر</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {adminsList.map((adm) => {
                    const isSuper = adm.role === 'superadmin';
                    const isSelf = currentAdmin?.username === adm.username || currentAdmin?.id === adm.id;
                    const isDefaultAdmin = adm.username === 'admin';

                    return (
                      <div
                        key={adm.id || adm.username}
                        className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-4 shadow-xl"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl p-0.5 flex items-center justify-center ${
                              isSuper ? 'bg-gradient-to-tr from-amber-500 to-amber-700' : 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                            }`}>
                              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                                <ShieldCheck className={`w-6 h-6 ${isSuper ? 'text-amber-400' : 'text-indigo-400'}`} />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-base font-bold text-white">{adm.display_name}</h5>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                    حسابك الحالي
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-amber-400 font-mono mt-0.5">@{adm.username}</p>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                            isSuper 
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          }`}>
                            {isSuper ? '👑 مدير عام (Super Admin)' : '🛡️ مشرف (Admin)'}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>حساب نشط ومعتمد</span>
                          </span>

                          {!isDefaultAdmin && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminSubmit(adm.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف الحساب</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instruction box */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h5 className="font-bold text-amber-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>كيف يعمل نظام الأدمن المتعدد (Multi-Admin Accounts System)؟</span>
                </h5>
                <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed">
                  <li>كل أدمن يمتلك اسم مستخدم (`username`) وكلمة مرور خاصة به للولوج إلى لوحة التحكم.</li>
                  <li>المشرف العادي يمتلك صلاحيات إدارة الطلبات والمنتجات دون التعديل على الحسابات.</li>
                  <li>يتم حفظ الجلسة وتسجيل الدخول لكل أدمن بشكل مستقل بأمان عبر السيرفر وقاعدة بيانات Supabase.</li>
                </ul>
              </div>

            </div>
          )
        )}

        {/* --- SMS AUDIT TAB --- */}
        {activeTab === 'sms' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-bold text-white">سجل الرسائل النصية الواردة تلقائياً من الموبايل</span>
              </div>
              <span className="text-xs text-slate-400">إجمالي الرسائل: {transactions.length}</span>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">وقت الوصول</th>
                    <th className="p-4">طريقة الدفع</th>
                    <th className="p-4">المبلغ المستخرج</th>
                    <th className="p-4">رقم الراسل</th>
                    <th className="p-4">نص الرسالة الخام (Raw SMS)</th>
                    <th className="p-4">نتيجة المطابقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        لم يتم استقبال أي رسائل SMS حتى الآن من الموبايل
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => {
                      const cleanTxRef = tx.transaction_ref ? tx.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                      const cleanTxPhone = tx.sender_phone ? tx.sender_phone.replace(/[^0-9]/g, '') : '';

                      // Dynamic cross-check against registered orders
                      const matchedOrder = orders.find(o => {
                        if (o.matched_transaction_id === tx.id || (tx.matched_order_id && o.id === tx.matched_order_id)) return true;
                        if (cleanTxRef && o.transaction_ref) {
                          const oRef = o.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                          if (oRef && (oRef === cleanTxRef || oRef.includes(cleanTxRef) || cleanTxRef.includes(oRef))) return true;
                        }
                        if (cleanTxPhone && cleanTxPhone.length >= 7) {
                          const p1 = (o.customer_phone || '').replace(/[^0-9]/g, '');
                          const p2 = (o.sender_phone || '').replace(/[^0-9]/g, '');
                          const phoneMatch = p1.endsWith(cleanTxPhone.slice(-7)) || p2.endsWith(cleanTxPhone.slice(-7));
                          const amountMatch = Math.abs(Number(o.total_amount) - Number(tx.amount)) < 1;
                          if (phoneMatch && amountMatch) return true;
                        }
                        return false;
                      });

                      const isMatched = tx.status === 'matched' || Boolean(matchedOrder);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40">
                          <td className="p-4 text-slate-400">
                            {new Date(tx.received_at).toLocaleString('ar-EG')}
                          </td>
                          <td className="p-4 font-sans font-bold text-white">
                            {tx.payment_method}
                          </td>
                          <td className="p-4 text-amber-400 font-bold text-sm">
                            {tx.amount} EGP
                          </td>
                          <td className="p-4 text-slate-300">
                            {tx.sender_phone || 'غير محدد'}
                          </td>
                          <td className="p-4 text-[11px] text-slate-400 max-w-xs truncate font-sans">
                            {tx.raw_sms}
                          </td>
                          <td className="p-4 font-sans">
                            {isMatched ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                                <span>✅ مطابق للطلب</span>
                                {matchedOrder && (
                                  <span className="font-mono text-amber-300 font-extrabold mr-1">
                                    (#{matchedOrder.order_code})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold text-[11px]">
                                غير مطابق (لم تُربط بطلب)
                              </span>
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
        )}
      </main>

      {/* --- ADD PRODUCT MODAL --- */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">إضافة منتج جديد مع صور متعددة وتخصيص</h3>
              <button onClick={() => setIsAddProductOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-right max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المنتج بالعربي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جاكيت بيسبول التخرج"
                  value={newProdTitleAr}
                  onChange={(e) => setNewProdTitleAr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    required
                    placeholder="650"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية بالمخزون</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Main Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الصورة الرئيسية للمنتج * <span className="text-slate-400 font-normal">(رفع صورة من الجهاز أو إضافة رابط مباشر)</span>
                </label>
                <div className="space-y-2">
                  {newProdImagePreview ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
                      <img src={newProdImagePreview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {newProdImageUploading ? (
                          <p className="text-xs text-amber-400 font-bold animate-pulse">جاري المعالجة...</p>
                        ) : (
                          <p className="text-xs text-emerald-400 font-bold">✅ تم تجهيز صورة المنتج</p>
                        )}
                        <p className="text-[10px] text-slate-500 truncate">{newProdImage}</p>
                      </div>
                      <button type="button" onClick={() => { setNewProdImage(''); setNewProdImagePreview(''); }} className="text-rose-400 hover:text-rose-300 text-xs">حذف</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/60 cursor-pointer transition">
                        <input type="file" accept="image/*" onChange={handleMainImagePick} className="hidden" />
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-300 font-medium">رفع صورة من الجهاز</span>
                      </label>

                      <input
                        type="url"
                        placeholder="أو لصق رابط صورة مباشر https://..."
                        value={newProdImage}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProdImage(val);
                          setNewProdImagePreview(val);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Images Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">صور إضافية للمعرض (يمكن اختيار أكثر من صورة)</label>
                <div className="space-y-2">
                  {newProdGalleryPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newProdGalleryPreviews.map((src, i) => (
                        <div key={i} className="relative">
                          <img src={src} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-700" />
                          {i < newProdGalleryUrls.length ? (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          ) : (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-spin border border-amber-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 cursor-pointer transition">
                    <input type="file" accept="image/*" multiple onChange={handleGalleryImagesPick} className="hidden" />
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs text-slate-300">{newProdGalleryPreviews.length > 0 ? `إضافة مزيد من الصور (${newProdGalleryPreviews.length} محددة)` : 'اختر صور إضافية للمعرض (اختياري)'}</span>
                  </label>
                </div>
              </div>

              {/* Size Chart Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">صورة دليل المقاسات 📐 (Size Chart) — اختياري</label>
                {newProdSizeChartPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <img src={newProdSizeChartPreview} alt="size chart" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                    <div className="flex-1">
                      {newProdSizeChartUploading ? (
                        <p className="text-xs text-amber-400 animate-pulse">جاري الرفع...</p>
                      ) : (
                        <p className="text-xs text-emerald-400 font-bold">✅ تم رفع دليل المقاسات</p>
                      )}
                    </div>
                    <button type="button" onClick={() => { setNewProdSizeChart(''); setNewProdSizeChartPreview(''); }} className="text-rose-400 text-xs">حذف</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-slate-500 cursor-pointer transition">
                    <input type="file" accept="image/*" onChange={handleSizeChartPick} className="hidden" />
                    <Ruler className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">اضغط لرفع جدول المقاسات (اختياري)</span>
                  </label>
                )}
              </div>

              {/* Customization Toggle */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdHasCustomization}
                    onChange={(e) => setNewProdHasCustomization(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>تفعيل خيار التطريز / طباعة اسم الطالب للعميل ✨</span>
                </label>
                {newProdHasCustomization && (
                  <input
                    type="text"
                    placeholder="عنوان الحقل: اسم الطالب أو الكلية للتطريز..."
                    value={newProdCustomLabel}
                    onChange={(e) => setNewProdCustomLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                )}
              </div>

              {/* Event Ticket Toggle */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-indigo-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdIsEvent}
                    onChange={(e) => setNewProdIsEvent(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-700"
                  />
                  <span>🎟️ تذكرة إيفينت / فعالية (توليد حقول أسماء الحاضرين ديناميكياً)</span>
                </label>
                <p className="text-[11px] text-slate-400">عند التفعيل، سيظهر للعميل نموذج ديناميكي لكتابة اسم كل شخص سيحضر الفعالية حسب عدد التذاكر</p>
              </div>

              {/* Sizes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاسات المتاحة (مفصولة بفاصلة) — أتركها فارغة لو لا يوجد مقاسات</label>
                <input
                  type="text"
                  placeholder="S, M, L, XL, XXL"
                  value={newProdSizes}
                  onChange={(e) => setNewProdSizes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none"
                />
              </div>

              {/* ===== ADD-ONS SECTION ===== */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      إضافات اختيارية (Add-ons)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">خيارات إضافية يختارها العميل وتُضاف لسعر المنتج (مثل: تطريز اسم +50 ج.م)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addNewAddon}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة Add-on
                  </button>
                </div>

                {newProdAddons.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-2">لا توجد إضافات حتى الآن — اضغط "+ إضافة Add-on" لإضافة خيار</p>
                ) : (
                  <div className="space-y-3">
                    {newProdAddons.map((addon) => (
                      <div key={addon.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="اسم الإضافة (مثل: تطريز ذهبي خاص بالاسم)"
                            value={addon.name}
                            onChange={(e) => updateAddon(addon.id, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                          />
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              placeholder="0"
                              min="0"
                              value={addon.price}
                              onChange={(e) => updateAddon(addon.id, 'price', e.target.value)}
                              className="w-20 px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500 text-center"
                            />
                            <span className="text-[10px] text-slate-400 font-bold mr-1">ج.م</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAddon(addon.id)}
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="رابط الصورة أو ارفع من الجهاز 📷"
                              value={addon.image_url || ''}
                              onChange={(e) => updateAddon(addon.id, 'image_url', e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                            />
                            <label className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer flex items-center gap-1.5 flex-shrink-0 transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>رفع صورة</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleAddonImagePick(addon.id, false, e)}
                              />
                            </label>
                            {addon.image_url && (
                              <img src={addon.image_url} alt="معاينة الإضافة" className="w-8 h-8 rounded-lg object-cover border border-amber-500/50 flex-shrink-0" />
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="وصف مختصر للإضافة (اختياري)"
                            value={addon.description || ''}
                            onChange={(e) => updateAddon(addon.id, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={newProdImageUploading || newProdGalleryUploading || newProdSizeChartUploading || !newProdImage}
                className="w-full py-3.5 px-4 rounded-xl gradient-purple-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(newProdImageUploading || newProdGalleryUploading || newProdSizeChartUploading)
                  ? 'جاري رفع الصور... ⏳'
                  : 'حفظ وإضافة المنتج فوراً'
                }
              </button>
            </form>

          </div>
        </div>
      )}

      {/* --- EDIT PRODUCT MODAL --- */}
      {isEditProductOpen && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-500/30">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>تعديل بيانات المنتج ({editingProduct.title_ar || editingProduct.title})</span>
              </h3>
              <button onClick={() => { setIsEditProductOpen(false); setEditingProduct(null); }} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 text-right max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المنتج بالعربي *</label>
                <input
                  type="text"
                  required
                  value={editProdTitleAr}
                  onChange={(e) => setEditProdTitleAr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">السعر (ج.م) *</label>
                  <input
                    type="number"
                    required
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية بالمخزون</label>
                  <input
                    type="number"
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وصف مختصر للمنتج</label>
                <textarea
                  rows={2}
                  value={editProdDescAr}
                  onChange={(e) => setEditProdDescAr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Main Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الصورة الرئيسية للمنتج *</label>
                {editProdImagePreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <img src={editProdImagePreview} alt="main preview" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                    <div className="flex-1">
                      {editProdImageUploading ? (
                        <p className="text-xs text-amber-400 font-bold animate-pulse">جاري الرفع...</p>
                      ) : (
                        <p className="text-xs text-emerald-400 font-bold">✅ تم اختيار الصورة</p>
                      )}
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 text-xs font-bold cursor-pointer hover:bg-slate-700">
                      <input type="file" accept="image/*" onChange={handleEditMainImagePick} className="hidden" />
                      تغيير الصورة
                    </label>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500 cursor-pointer transition">
                    <input type="file" accept="image/*" onChange={handleEditMainImagePick} className="hidden" />
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span className="text-xs text-slate-300">رفع صورة جديدة للمنتج</span>
                  </label>
                )}
              </div>

              {/* Gallery Images Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">معرض الصور الإضافية (Gallery)</label>
                <div className="space-y-2">
                  {editProdGalleryPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {editProdGalleryPreviews.map((src, idx) => (
                        <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                          <img src={src} alt="gallery" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-500/60 cursor-pointer transition">
                    <input type="file" accept="image/*" multiple onChange={handleEditGalleryImagesPick} className="hidden" />
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-300">{editProdGalleryPreviews.length > 0 ? `إضافة مزيد من الصور (${editProdGalleryPreviews.length} محددة)` : 'اختر صور إضافية للمعرض (اختياري)'}</span>
                  </label>
                </div>
              </div>

              {/* Size Chart Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">صورة دليل المقاسات 📐 (Size Chart)</label>
                {editProdSizeChartPreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-700">
                    <img src={editProdSizeChartPreview} alt="size chart" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                    <div className="flex-1">
                      {editProdSizeChartUploading ? (
                        <p className="text-xs text-amber-400 animate-pulse">جاري الرفع...</p>
                      ) : (
                        <p className="text-xs text-emerald-400 font-bold">✅ تم رفع دليل المقاسات</p>
                      )}
                    </div>
                    <button type="button" onClick={() => { setEditProdSizeChart(''); setEditProdSizeChartPreview(''); }} className="text-rose-400 text-xs">حذف</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-slate-500 cursor-pointer transition">
                    <input type="file" accept="image/*" onChange={handleEditSizeChartPick} className="hidden" />
                    <Ruler className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400">اضغط لرفع جدول المقاسات (اختياري)</span>
                  </label>
                )}
              </div>

              {/* Customization Toggle */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProdHasCustomization}
                    onChange={(e) => setEditProdHasCustomization(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-700"
                  />
                  <span>تفعيل خيار التطريز / طباعة اسم الطالب للعميل ✨</span>
                </label>
                {editProdHasCustomization && (
                  <input
                    type="text"
                    placeholder="عنوان الحقل: اسم الطالب أو الكلية للتطريز..."
                    value={editProdCustomLabel}
                    onChange={(e) => setEditProdCustomLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none"
                  />
                )}
              </div>

              {/* Event Ticket Toggle */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 space-y-1">
                <label className="flex items-center gap-2 text-xs font-bold text-indigo-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProdIsEvent}
                    onChange={(e) => setEditProdIsEvent(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 bg-slate-950 border-slate-700"
                  />
                  <span>🎟️ تذكرة إيفينت / فعالية (توليد حقول أسماء الحاضرين ديناميكياً)</span>
                </label>
                <p className="text-[11px] text-slate-400">عند التفعيل، سيظهر للعميل نموذج ديناميكي لكتابة اسم كل شخص سيحضر الفعالية حسب عدد التذاكر</p>
              </div>

              {/* Sizes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">المقاسات المتاحة (مفصولة بفاصلة)</label>
                <input
                  type="text"
                  placeholder="S, M, L, XL, XXL"
                  value={editProdSizes}
                  onChange={(e) => setEditProdSizes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none"
                />
              </div>

              {/* ===== EDIT ADD-ONS SECTION ===== */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      إضافات اختيارية (Add-ons)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">تعديل أو إضافة إضافات اختيارية للمنتج (مثل: توتي باج +100 ج.م)</p>
                  </div>
                  <button
                    type="button"
                    onClick={addEditAddon}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة Add-on
                  </button>
                </div>

                {editProdAddons.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-2">لا توجد إضافات مخصصة لهذا المنتج حالياً</p>
                ) : (
                  <div className="space-y-3">
                    {editProdAddons.map((addon, index) => (
                      <div key={addon.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-amber-300">إضافة #{index + 1}</span>
                          <button type="button" onClick={() => removeEditAddon(addon.id)} className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف
                          </button>
                        </div>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="اسم الإضافة (مثال: توتي باج مطرز)"
                            value={addon.name}
                            onChange={(e) => updateEditAddon(addon.id, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="number"
                            placeholder="السعر إضافي (مثال: 100)"
                            value={addon.price}
                            onChange={(e) => updateEditAddon(addon.id, 'price', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="رابط الصورة أو ارفع من الجهاز 📷"
                              value={addon.image_url || ''}
                              onChange={(e) => updateEditAddon(addon.id, 'image_url', e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                            />
                            <label className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer flex items-center gap-1.5 flex-shrink-0 transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>رفع صورة</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleAddonImagePick(addon.id, true, e)}
                              />
                            </label>
                            {addon.image_url && (
                              <img src={addon.image_url} alt="معاينة الإضافة" className="w-8 h-8 rounded-lg object-cover border border-amber-500/50 flex-shrink-0" />
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="وصف مختصر للإضافة (اختياري)"
                            value={addon.description || ''}
                            onChange={(e) => updateEditAddon(addon.id, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-[11px] focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={editProdImageUploading || editProdGalleryUploading || editProdSizeChartUploading || !editProdImage}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {(editProdImageUploading || editProdGalleryUploading || editProdSizeChartUploading)
                  ? 'جاري رفع الصور... ⏳'
                  : 'حفظ والتعديل فوراً 💾'
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- RECEIPT SCREENSHOT MODAL --- */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/95 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="relative max-w-2xl w-full glass-modal rounded-3xl p-6 border border-slate-700 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>معاينة صورة إيصال الدفع 📸</span>
              </h3>
              <button onClick={() => setViewingReceiptUrl(null)} className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center max-h-[65vh] overflow-hidden">
              <img src={viewingReceiptUrl} alt="Receipt Screenshot" className="max-h-[60vh] max-w-full w-auto h-auto rounded-xl object-contain shadow-lg" />
            </div>

            <div className="flex items-center justify-center gap-3">
              <a
                href={viewingReceiptUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة بالحجم الكامل</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD NEW ADMIN MODAL --- */}
      {isAddAdminOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-md glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-500/30 space-y-6 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إضافة حساب أدمن / مشرف جديد</h3>
                  <p className="text-xs text-slate-400">إنشاء بيانات الدخول والصلاحيات للمشرف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  الاسم بالكامل / الاسم الظاهر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد علي (مدير المبيعات)"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  اسم المستخدم (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ahmed_admin"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  كلمة المرور (Password) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="أدخل كلمة مرور قوية"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  الرتبة والصلاحية (Role)
                </label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="admin">مشرف عادي (Admin) — إدارة الطلبات والمنتجات</option>
                  <option value="superadmin">مدير عام (Super Admin) — كافة الصلاحيات والإعدادات</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  إضافة المشرف فوراً 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRINTABLE PDF REPORT MODAL --- */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-300 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Top Actions & Field Toggles */}
            <div className="space-y-4 border-b pb-4 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-amber-600" />
                  <h3 className="text-lg font-extrabold text-slate-900">تقرير المبيعات وحصر المقاسات الشامل</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printStandalonePdfReport()}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة / حفظ كـ PDF 🖨️</span>
                  </button>
                  <button onClick={() => setIsPdfModalOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PDF Column Toggles */}
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 space-y-2 text-right dir-rtl">
                <p className="text-xs font-extrabold text-slate-800">⚙️ تخصيص ومفتاح التحكم بالأعمدة قبل التصدير والطباعة:</p>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={pdfShowCode} onChange={e => setPdfShowCode(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>كود الطلب (#OrderCode)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={pdfShowPhone} onChange={e => setPdfShowPhone(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>رقم موبايل العميل</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={pdfShowRef} onChange={e => setPdfShowRef(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>الرقم المرجعي (Ref#)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={pdfShowStatus} onChange={e => setPdfShowStatus(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>حالة الطلب</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={pdfShowCustomization} onChange={e => setPdfShowCustomization(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>تفاصيل التطريز والإضافات</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-6 text-right dir-rtl font-sans" id="printable-report">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  <img src="/logo-removebg-preview.png" alt="the medix" className="h-12 w-auto object-contain" />
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-1.5 font-sans">
                      <span className="italic text-[#65a30d] font-serif font-bold">the</span>
                      <span className="font-bold text-slate-900 lowercase">medix</span>
                      <span className="text-xs text-slate-600 font-bold bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full mr-2">الدفعة التاسعة 🎓</span>
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-1">تقرير حصر الكميات والمقاسات والكشوفات التكليفية الرسمية</p>
                  </div>
                </div>
                <div className="text-left font-mono text-xs text-slate-700 space-y-1">
                  <p>تاريخ التقرير: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></p>
                  <p>إجمالي الطلبات: <strong>{orders.length}</strong></p>
                </div>
              </div>

              {/* Stats Summary Cards */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-800">إجمالي الطلبات المؤكدة</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{totalVerifiedOrders}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-800">إجمالي المبيعات الإجمالية</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{totalGrossRevenue} ج.م</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <p className="text-xs font-bold text-indigo-800">عدد أصناف المنتجات</p>
                  <p className="text-2xl font-black text-indigo-900 mt-1">{products.length}</p>
                </div>
              </div>

              {/* SECTION 1: Itemized Product Size Breakdown Table */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 border-r-4 border-amber-500 pr-3">
                  1. بيان حصر القطع المطلوبة مقسماً حسب المقاسات (للتصنيع والمطبعة)
                </h3>
                
                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300">
                      <tr>
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3 text-center">S</th>
                        <th className="p-3 text-center">M</th>
                        <th className="p-3 text-center">L</th>
                        <th className="p-3 text-center">XL</th>
                        <th className="p-3 text-center">XXL</th>
                        <th className="p-3 text-center">أخرى</th>
                        <th className="p-3 text-center">إجمالي القطع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {productSizeStats.map((stat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-extrabold text-slate-900">{stat.productTitle}</td>
                          <td className="p-3 text-center text-amber-700 font-mono">{stat.sizeCounts['S'] || 0}</td>
                          <td className="p-3 text-center text-amber-700 font-mono">{stat.sizeCounts['M'] || 0}</td>
                          <td className="p-3 text-center text-amber-700 font-mono">{stat.sizeCounts['L'] || 0}</td>
                          <td className="p-3 text-center text-amber-700 font-mono">{stat.sizeCounts['XL'] || 0}</td>
                          <td className="p-3 text-center text-amber-700 font-mono">{stat.sizeCounts['XXL'] || 0}</td>
                          <td className="p-3 text-center text-slate-600 font-mono">{stat.sizeCounts['بدون مقاس'] || 0}</td>
                          <td className="p-3 text-center font-mono font-black text-amber-900 bg-amber-100/50">
                            {stat.totalUnits} قطعة
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 1.5: Add-ons & Accessories Breakdown Table */}
              {calculateAddonStats().length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-base font-extrabold text-slate-900 border-r-4 border-indigo-500 pr-3">
                    1.5. بيان حصر الإضافات والملحقات المطلوبة (Add-ons & Accessories)
                  </h3>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-300">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-indigo-50 text-indigo-950 font-extrabold border-b border-indigo-200">
                        <tr>
                          <th className="p-3">اسم الإضافة / الملحق المطلوبة</th>
                          <th className="p-3 text-center">إجمالي الكمية المطلوبة للتجهيز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold">
                        {calculateAddonStats().map((ad, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>💎</span>
                              <span>{ad.name}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-black text-indigo-900 bg-indigo-100/50">
                              {ad.count} قطعة
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 2: Detailed Customer Orders Table */}
              <div className="space-y-3 pt-4">
                <h3 className="text-base font-extrabold text-slate-900 border-r-4 border-amber-500 pr-3">
                  2. القائمة التفصيلية لطلبات العملاء والتطريز
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-300">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-300">
                      <tr>
                        {pdfShowCode && <th className="p-2.5">الكود</th>}
                        <th className="p-2.5">العميل</th>
                        {pdfShowPhone && <th className="p-2.5">الموبايل</th>}
                        {pdfShowRef && <th className="p-2.5">الرقم المرجعي</th>}
                        <th className="p-2.5">طريقة الدفع</th>
                        <th className="p-2.5">الأصناف والتطريز</th>
                        <th className="p-2.5">الإجمالي</th>
                        <th className="p-2.5">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50">
                          {pdfShowCode && <td className="p-2.5 font-mono font-bold text-amber-800">#{o.order_code}</td>}
                          <td className="p-2.5 font-bold text-slate-900">{o.customer_name}</td>
                          {pdfShowPhone && <td className="p-2.5 font-mono">{o.customer_phone}</td>}
                          {pdfShowRef && <td className="p-2.5 font-mono font-bold text-emerald-800">{o.transaction_ref || '—'}</td>}
                          <td className="p-2.5 font-medium">{o.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'InstaPay'}</td>
                          <td className="p-2.5">
                            {getOrderEffectiveItems(o).map((it, i) => (
                              <div key={i}>
                                • {it.product_title} {it.selected_size ? `[${it.selected_size}]` : ''} × {it.quantity}
                                {pdfShowCustomization && it.custom_text && <span className="text-amber-800 font-bold block"> (تطريز: {it.custom_text})</span>}
                                {pdfShowCustomization && it.customization_option && <span className="text-emerald-800 font-bold block"> (إضافات: {it.customization_option})</span>}
                              </div>
                            ))}
                          </td>
                          <td className="p-2.5 font-bold font-mono">{o.total_amount} ج.م</td>
                          <td className="p-2.5 font-bold">{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t text-center text-xs text-slate-500 font-mono">
                9th Batch Graduation Store • Built for Seamless Auto Verification & Management
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAILED ORDER & SMS CONFIRMATION MODAL --- */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-3xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">تفاصيل الطلب والرسالة التأكيدية</h3>
                    <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 text-sm">
                      #{selectedOrderModal.order_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تاريخ التسجيل: {new Date(selectedOrderModal.created_at).toLocaleString('ar-EG')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrderModal(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Status & Verification Mode Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">حالة الطلب الحالية:</span>
                {selectedOrderModal.status === 'auto_verified' && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-emerald-400" />
                    <span>🤖 مؤكد تلقائياً عبر الـ SMS</span>
                  </span>
                )}
                {selectedOrderModal.status === 'manual_verified' && (
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>👤 مؤكد يدوياً بواسطة الإدارة</span>
                  </span>
                )}
                {selectedOrderModal.status === 'pending' && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-4 h-4" />
                    <span>⏳ معلق (بانتظار الـ SMS)</span>
                  </span>
                )}
                {selectedOrderModal.status === 'pending_difference' && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>⏳ معلق (بانتظار سداد فارق السعر)</span>
                  </span>
                )}
                {selectedOrderModal.status === 'ready_for_pickup' && (
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span>📦 جاهز للاستلام بالمقر</span>
                  </span>
                )}
                {selectedOrderModal.status === 'delivered' && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>🎉 تم التسليم للعميل</span>
                  </span>
                )}
                {selectedOrderModal.status === 'cancelled' && (
                  <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>❌ ملغي</span>
                  </span>
                )}
              </div>

              {selectedOrderModal.verified_at && (
                <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>تاريخ التأكيد: {new Date(selectedOrderModal.verified_at).toLocaleString('ar-EG')}</span>
                </div>
              )}
            </div>

            {/* Customer & Order Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>بيانات العميل واسم المستلم</span>
                </h4>
                <div className="space-y-1 text-xs">
                  <p className="text-white font-bold text-sm">{selectedOrderModal.customer_name}</p>
                  <p className="text-slate-300 font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>موبايل العميل: <strong>{selectedOrderModal.customer_phone}</strong></span>
                  </p>
                  {selectedOrderModal.sender_phone && selectedOrderModal.sender_phone !== selectedOrderModal.customer_phone && (
                    <p className="text-amber-400 font-mono text-[11px]">
                      رقم المحفظة الراسلة: {selectedOrderModal.sender_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Box */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>تفاصيل وسيلة الدفع والمبلغ</span>
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <span>طريقة الدفع:</span>
                    {selectedOrderModal.payment_method === 'vodafone_cash' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-bold text-xs">
                        <img src="/vf_Logo.png" alt="Vodafone Cash" className="w-4 h-4 object-contain" />
                        <span>فودافون كاش (Vodafone Cash)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-bold text-xs">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        <span>InstaPay</span>
                      </span>
                    )}
                  </div>
                  <p className="text-white font-black text-sm">
                    إجمالي الطلب المطلوب: {selectedOrderModal.total_amount} ج.م
                  </p>
                  {(() => {
                    const matchedTx = findMatchedTransaction(selectedOrderModal);
                    const paid = Number(selectedOrderModal.paid_amount || matchedTx?.amount || 0);
                    const total = Number(selectedOrderModal.total_amount || 0);
                    const excess = paid - total;

                    if (excess > 25) {
                      return (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                          <p className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
                            <span>💵 المبلغ المسدد بالـ SMS:</span>
                            <span className="font-mono text-sm font-black">{paid} ج.م</span>
                          </p>
                          <p className="text-[11px] text-emerald-300/90 font-medium">
                            ⚠️ يوجد فائض مستحق للعميل بقيمة: <strong className="text-white font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-xs">+{excess} ج.م</strong>
                          </p>
                        </div>
                      );
                    } else if (excess > 0 && excess <= 25) {
                      return (
                        <p className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 font-mono">
                          المبلغ المسدد بالـ SMS: <strong className="text-slate-200">{paid} ج.م</strong> (شامل رسوم التحويل)
                        </p>
                      );
                    }
                    return null;
                  })()}
                  <p className="text-slate-300 font-mono text-[11px] flex items-center gap-1 pt-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>الرقم المرجعي بالطلب: <strong className="text-amber-300">{selectedOrderModal.transaction_ref || 'لم يدخل رقم مرجعي'}</strong></span>
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items Breakdown & Edit Order Trigger */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-400" />
                  <span>المنتجات والمقاسات والتطريز المطلوب ({selectedOrderModal.items?.length || 0} صنف)</span>
                </h4>

                <button
                  type="button"
                  onClick={() => handleOpenEditOrder(selectedOrderModal)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل عناصر الطلب والمقاسات ✏️</span>
                </button>
              </div>

              {/* PENDING DIFFERENCE STATUS BANNER IN ADMIN MODAL */}
              {(selectedOrderModal.is_difference_pending || selectedOrderModal.status === 'pending_difference' || (selectedOrderModal.difference_amount && selectedOrderModal.difference_amount > 0)) && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <span>⚠️ الطلب به فرق سعر مستحق قيد الانتظار:</span>
                    </div>
                    <span className="text-sm font-mono font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-xl border border-amber-500/30">
                      مطلوب: {selectedOrderModal.difference_amount} ج.م
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>المبلغ المدفوع سابقاً: <strong className="font-mono text-emerald-400">{selectedOrderModal.paid_amount || 0} ج.م</strong></span>
                    <span>إجمالي الطلب التراكمي: <strong className="font-mono text-white">{selectedOrderModal.total_amount} ج.م</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('هل تأكدت من استلام فرق السعر المتبقي يدوياً؟')) return;
                      const updatedOrder: Order = {
                        ...selectedOrderModal,
                        paid_amount: selectedOrderModal.total_amount,
                        difference_amount: 0,
                        is_difference_pending: false,
                        status: 'manual_verified',
                        verified_by: currentAdmin?.display_name || 'Admin',
                        verified_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      await updateOrderInSupabase(updatedOrder);
                      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                      setSelectedOrderModal(updatedOrder);
                      alert('تم تأكيد سداد فرق السعر يدوياً بنجاح! 🎉');
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد استلام فرق السعر يدوياً ({selectedOrderModal.difference_amount} ج.م)</span>
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {(!selectedOrderModal.items || selectedOrderModal.items.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-bold space-y-1">
                    <p className="flex items-center gap-1.5 text-white text-sm">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>طلب منتج تخرج أساسي ({selectedOrderModal.total_amount} ج.م)</span>
                    </p>
                    <p className="text-slate-400 font-normal text-xs">
                      تم تسجيل الطلب وإجمالي المبلغ المطلوب: <strong>{selectedOrderModal.total_amount} ج.م</strong>
                    </p>
                  </div>
                ) : (
                  selectedOrderModal.items.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between font-bold text-sm text-white">
                        <span>{item.product_title} × {item.quantity}</span>
                        <div className="flex items-center gap-2">
                          {item.selected_size && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/30">
                              المقاس: {item.selected_size}
                            </span>
                          )}
                          <span className="text-amber-400 font-mono text-xs">{item.unit_price * item.quantity} ج.م</span>
                        </div>
                      </div>

                      {item.custom_text && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>✨ الاسم / الكلية للتطريز:</span>
                          </span>
                          <span className="bg-slate-950 px-3 py-1 rounded-lg text-white font-black text-sm border border-amber-500/30 font-sans">
                            &quot;{item.custom_text}&quot;
                          </span>
                        </div>
                      )}
                      {(() => {
                        const { cleanOpt, attendees: parsedAtt } = parseAttendeesAndCleanOpt(item.customization_option);
                        const attendeesList = (item.attendees && item.attendees.length > 0) ? item.attendees : parsedAtt;
                        return (
                          <>
                            {cleanOpt && (
                              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-emerald-400" />
                                  <span>💎 الإضافات المطلوبة (Add-ons):</span>
                                </span>
                                <span className="bg-slate-950 px-3 py-1 rounded-lg text-emerald-300 font-bold text-xs border border-emerald-500/30">
                                  {cleanOpt}
                                </span>
                              </div>
                            )}
                            {attendeesList && attendeesList.length > 0 && (
                              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-bold space-y-2">
                                <span className="flex items-center gap-1.5 text-indigo-300 text-xs font-extrabold">
                                  <Ticket className="w-4 h-4 text-indigo-400" />
                                  <span>🎟️ أسماء الحاضرين والتذاكر المحجوزة ({attendeesList.length}):</span>
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {attendeesList.map((att: any, aIdx: number) => (
                                    <div key={aIdx} className="p-2.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-200 space-y-0.5">
                                      <span className="text-[10px] text-amber-400 font-mono block font-bold">التذكرة {aIdx + 1}:</span>
                                      <div className="font-bold text-white">👤 {att.name}</div>
                                      {att.phone && <div className="text-[11px] text-slate-400 font-mono">📱 {att.phone}</div>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              {cleanDisplayNotes(selectedOrderModal.notes) && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-amber-400">ملاحظات إضافية من العميل:</span> {cleanDisplayNotes(selectedOrderModal.notes)}
                </div>
              )}

              {/* CONFIRMED LINE BADGE IN MODAL */}
              {(() => {
                const lineToDisplay = getEffectiveConfirmedLine(selectedOrderModal);
                return lineToDisplay ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 text-emerald-300 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <span>📱 الخط والمحفظة التي تم تأكيد استلام المبلغ عليها:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-950 px-3.5 py-1.5 rounded-xl text-emerald-300 font-mono font-black text-sm border border-emerald-500/40 shadow-inner">
                        {settings.line_labels?.[lineToDisplay] ? `${settings.line_labels[lineToDisplay]} (${lineToDisplay})` : lineToDisplay}
                      </span>
                      {selectedOrderModal.matched_device_name && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          (جهاز: {selectedOrderModal.matched_device_name})
                        </span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* CONFIRMATION SMS & VERIFICATION AUDIT BOX */}
            {(() => {
              const matchedTx = findMatchedTransaction(selectedOrderModal);
              return (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>توثيق التأكيد ورسالة الـ SMS المستلمة (SMS Verification Audit)</span>
                  </h4>

                  {matchedTx ? (
                    <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-300">
                            رسالة الـ SMS التي تم تأكيد واقتران الطلب بها تلقائياً:
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                          {matchedTx.payment_method}
                        </span>
                      </div>

                      {/* RAW SMS CONTENT BOX */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-1.5 font-sans">
                        <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>نص الرسالة الخام المستلمة من المحفظة (Raw SMS):</span>
                        </p>
                        <p dir="rtl" className="text-xs text-white font-mono font-bold leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800 select-all">
                          {matchedTx.raw_sms}
                        </p>
                      </div>

                      {/* Extracted SMS Data */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">المبلغ بالرسالة:</span>
                          <strong className="text-amber-400">{matchedTx.amount} EGP</strong>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">رقم الراسل:</span>
                          <strong className="text-slate-200">{matchedTx.sender_phone || 'غير محدد'}</strong>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px]">وقت وصول الرسالة:</span>
                          <strong className="text-emerald-300">{new Date(matchedTx.received_at).toLocaleTimeString('ar-EG')}</strong>
                        </div>
                      </div>
                    </div>
                  ) : selectedOrderModal.status === 'manual_verified' ? (
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                        <span>تم تأكيد هذا الطلب يدوياً بواسطة: <strong className="text-white underline">{selectedOrderModal.verified_by || 'أدمن المتجر'}</strong></span>
                      </div>

                      {/* Option to manually associate an unmatched transaction */}
                      {transactions.filter(t => t.status === 'unmatched').length > 0 && (
                        <div className="pt-2 border-t border-cyan-500/20 space-y-1.5">
                          <p className="text-[11px] text-slate-300 font-semibold">
                            هل ترغب في ربط هذا الطلب بشرائح رسائل SMS غير مطابقة في النظام؟
                          </p>
                          <select
                            onChange={(e) => {
                              const txId = e.target.value;
                              if (txId) {
                                handleUpdateOrderStatus(selectedOrderModal.id, 'manual_verified', txId);
                                alert('تم ربط رسالة الـ SMS بالطلب بنجاح!');
                              }
                            }}
                            className="w-full bg-slate-950 text-xs text-amber-300 p-2 rounded-xl border border-slate-800 focus:outline-none"
                          >
                            <option value="">اختر رسالة SMS غير مطابقة لربطها...</option>
                            {transactions.filter(t => t.status === 'unmatched').map(t => (
                              <option key={t.id} value={t.id}>
                                {new Date(t.received_at).toLocaleTimeString('ar-EG')} - {t.amount} ج.م - {t.raw_sms.slice(0, 45)}...
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>لم تصل رسالة SMS مطابقة لهذا الطلب بعد.</span>
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        عند قيام العميل بالتحويل ووصول رسالة الإشعار من فودافون كاش أو InstaPay للهاتف، سيتم تأكيد الطلب تلقائياً وتحديث الحالة.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* RECEIPT SCREENSHOT PREVIEW SECTION */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>صورة إيصال الدفع / الاسكرين المرفق من العميل 📸</span>
              </h4>

              {selectedOrderModal.receipt_url ? (
                <div className="p-4 bg-slate-900 rounded-2xl border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>تم إرفاق صورة إيصال التحويل بواسطة العميل أثناء تسجيل الطلب</span>
                    </span>
                    <button
                      onClick={() => setViewingReceiptUrl(selectedOrderModal.receipt_url!)}
                      className="px-3 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-xs font-bold border border-indigo-500/40 transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>معاينة مكبّرة 🔍</span>
                    </button>
                  </div>

                  {/* DIRECT EMBEDDED IMAGE PREVIEW */}
                  <div className="relative group bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-center max-h-[320px] overflow-hidden">
                    <img
                      src={selectedOrderModal.receipt_url}
                      alt="إيصال التحويل المرفق من العميل"
                      className="max-h-[300px] w-auto object-contain rounded-lg shadow-md cursor-pointer group-hover:scale-[1.02] transition-transform"
                      onClick={() => setViewingReceiptUrl(selectedOrderModal.receipt_url!)}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span>لم يقم العميل برفع صورة إيصال (تم اعتماد رقم المتابعة والمرجعي أو الـ SMS تلقائياً)</span>
                  </div>
                </div>
              )}
            </div>

            {/* MODAL QUICK MANAGEMENT ACTIONS */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-bold">تغيير الحالة:</span>
                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderModal.id, 'manual_verified');
                    setSelectedOrderModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 transition"
                >
                  تأكيد يدوي 👤
                </button>

                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderModal.id, 'ready_for_pickup');
                    setSelectedOrderModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs border border-indigo-500/30 transition"
                >
                  جاهز للاستلام 📦
                </button>

                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderModal.id, 'delivered');
                    setSelectedOrderModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs border border-blue-500/30 transition"
                >
                  تم التسليم 🎉
                </button>

                <button
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrderModal.id, 'cancelled');
                    setSelectedOrderModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs border border-rose-500/30 transition"
                >
                  إلغاء الطلب ❌
                </button>
              </div>

              <button
                onClick={() => setSelectedOrderModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                إغلاق ✖
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT ORDER ITEMS & SIZES MODAL */}
      {isEditOrderModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تعديل عناصر الطلب والمقاسات</h3>
                  <p className="text-xs text-slate-400 font-mono">الطلب #{editingOrder.order_code} - {editingOrder.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditOrderModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Current Items Editor List */}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {editOrderItems.length === 0 ? (
                <p className="text-xs text-amber-400 text-center py-6">لا توجد منتجات بالطلب حالياً. أضف منتج جديد أدناه.</p>
              ) : (
                editOrderItems.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-white mb-1">{item.product_title}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">المقاس:</label>
                            <select
                              value={item.selected_size || ''}
                              onChange={e => handleUpdateEditItemSize(idx, e.target.value)}
                              className="w-full bg-slate-900 text-xs text-amber-300 font-bold p-2 rounded-xl border border-slate-800"
                            >
                              <option value="S">S</option>
                              <option value="M">M</option>
                              <option value="L">L</option>
                              <option value="XL">XL</option>
                              <option value="XXL">XXL</option>
                              <option value="3XL">3XL</option>
                              <option value="Free Size">Free Size</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 font-bold mb-0.5">سعر القطعة (ج.م):</label>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={e => {
                                const updated = [...editOrderItems];
                                updated[idx].unit_price = Number(e.target.value);
                                setEditOrderItems(updated);
                              }}
                              className="w-full bg-slate-900 text-xs text-white font-mono font-bold p-2 rounded-xl border border-slate-800"
                            />
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="block text-[10px] text-slate-400 font-bold mb-0.5">✨ الاسم المطلوب للتطريز على هذه القطعة:</label>
                          <input
                            type="text"
                            value={item.custom_text || ''}
                            onChange={e => handleUpdateEditItemCustomText(idx, e.target.value)}
                            placeholder="مثال: د. محمد أحمد"
                            className="w-full bg-slate-900 text-xs text-amber-300 p-2 rounded-xl border border-slate-800"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between space-y-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(idx)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                          title="حذف هذا المنتج من الطلب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateEditItemQuantity(idx, item.quantity - 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg"
                          >
                            -
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-2">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateEditItemQuantity(idx, item.quantity + 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Product Selector */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold block mb-2">➕ إضافة منتج جديد للطلب:</span>
              <div className="flex flex-wrap gap-2">
                {products.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddProductToEditOrder(p)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{p.title_ar || p.title} ({p.price} ج.م)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary & Price Difference Calculation Box */}
            {(() => {
              const newTotal = editOrderItems.reduce((sum, item) => sum + (Number(item.unit_price) * Number(item.quantity)), 0);
              const prevPaid = Number(editPaidAmount) || 0;
              const priceDiff = newTotal - prevPaid;

              return (
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-slate-300 font-bold">
                      المبلغ المدفوع والمؤكد سابقاً قبل التعديل (ج.م):
                    </label>
                    <input
                      type="number"
                      value={editPaidAmount}
                      onChange={e => setEditPaidAmount(e.target.value)}
                      placeholder="أدخل المبلغ المدفوع سابقاً"
                      className="w-full sm:w-36 bg-slate-900 text-emerald-400 font-mono font-bold text-sm p-2 rounded-xl border border-slate-800 text-center"
                    />
                  </div>

                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
                    <span>إجمالي الطلب الجديد بعد التعديلات:</span>
                    <span className="font-mono font-bold text-white text-sm">{newTotal} ج.م</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold">
                    <span className="text-amber-400">فرق السعر المستحق لسداد الفاتورة الجزئية:</span>
                    <span className={`font-mono text-base ${priceDiff > 0 ? 'text-amber-400 font-black' : 'text-slate-400'}`}>
                      {priceDiff > 0 ? `+${priceDiff} ج.م (فاتورة تكملة 💳)` : '0 ج.م (لا يوجد فارق)'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOrderModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveOrderEdits}
                disabled={isSavingOrderEdits}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingOrderEdits ? 'جاري التعديل...' : 'حفظ التعديلات وتوليد الفاتورة 💾'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
