'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Copy, 
  Check, 
  Search, 
  QrCode, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Package, 
  Info,
  X,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Award,
  Send,
  Eye,
  Layers,
  Ruler,
  Upload,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product, CartItem, Order, PaymentMethod, StoreSettings } from '@/types';
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from '@/lib/supabaseClient';

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

export default function StoreFrontPage() {
  // Products & Settings State
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Active Product Detail Modal State
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);
  const [modalActiveImageIndex, setModalActiveImageIndex] = useState(0);
  const [modalSelectedSize, setModalSelectedSize] = useState<string>('');
  const [modalCustomText, setModalCustomText] = useState<string>('');
  const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vodafone_cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Active Size Selector per Product card
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Tracker Modal State
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedOrders, setTrackedOrders] = useState<Order[]>([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [latestCreatedOrder, setLatestCreatedOrder] = useState<Order | null>(null);

  // Fetch products and settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, setRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/admin/settings')
        ]);
        if (prodRes.ok) {
          const prods = await prodRes.json();
          if (prods && prods.length > 0) setProducts(prods);
        }
        if (setRes.ok) {
          const setts = await setRes.json();
          if (setts) setSettings(setts);
        }
      } catch (err) {
        console.warn('Using default fallback data', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadData();
  }, []);

  // Poll tracked order status every 5 seconds if tracker is open
  useEffect(() => {
    let interval: any;
    if (isTrackerOpen && (searchQuery || latestCreatedOrder)) {
      const q = searchQuery || latestCreatedOrder?.order_code || latestCreatedOrder?.customer_phone;
      if (q) {
        interval = setInterval(() => {
          fetchTrackedOrders(q, false);
        }, 5000);
      }
    }
    return () => clearInterval(interval);
  }, [isTrackerOpen, searchQuery, latestCreatedOrder]);

  // Open product modal helper
  const handleOpenProductModal = (product: Product) => {
    setActiveProductModal(product);
    setModalActiveImageIndex(0);
    setModalSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
    setModalCustomText('');
  };

  // Add to cart from modal
  const handleAddToCartFromModal = () => {
    if (!activeProductModal) return;
    const hasSizes = activeProductModal.sizes && activeProductModal.sizes.length > 0;
    if (hasSizes && !modalSelectedSize) {
      alert('يرجى اختيار المقاس أولاً');
      return;
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === activeProductModal.id && item.selectedSize === modalSelectedSize && item.customText === modalCustomText
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, {
        product: activeProductModal,
        selectedSize: modalSelectedSize || undefined,
        customText: modalCustomText.trim() || undefined,
        quantity: 1
      }];
    });

    setActiveProductModal(null);
    setIsCartOpen(true);
  };

  // Add to cart directly from product card
  const handleAddToCartDirect = (product: Product) => {
    const sizeNeeded = product.sizes && product.sizes.length > 0;
    const selectedSize = selectedSizes[product.id] || (sizeNeeded ? product.sizes[0] : undefined);

    if (sizeNeeded && !selectedSize) {
      handleOpenProductModal(product);
      return;
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === selectedSize
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [...prev, { product, selectedSize, quantity: 1 }];
    });

    setIsCartOpen(true);
  };

  // Receipt File Change Handler with automatic Canvas Compression
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setReceiptUrl(compressedDataUrl);
        } else if (typeof event.target?.result === 'string') {
          setReceiptUrl(event.target.result);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

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

  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Copy to clipboard helper
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !transactionRef.trim()) {
      alert('يرجى إدخال اسم العميل ورقم الموبايل والرقم المرجعي للعملية');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_title: item.product.title_ar || item.product.title,
        selected_size: item.selectedSize,
        customText: item.customText,
        quantity: item.quantity,
        unit_price: item.product.price,
        product: item.product
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          transactionRef: transactionRef.trim(),
          paymentMethod,
          receiptUrl: receiptUrl || undefined,
          items: orderItems,
          notes: `المقاسات والتسليم: ${settings.pickup_note}`
        })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        setLatestCreatedOrder(data.order);
        setTrackedOrders([data.order]);
        setCart([]);
        setReceiptUrl('');
        setIsCheckoutOpen(false);
        setIsTrackerOpen(true);

        fireConfetti({
          particleCount: 80,
          spread: 70,
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

  // Track orders search
  const fetchTrackedOrders = async (queryStr: string, showLoader = true) => {
    if (!queryStr.trim()) return;
    if (showLoader) setIsTrackingLoading(true);

    try {
      const cleanQ = queryStr.trim();
      const res = await fetch(`/api/orders?code=${encodeURIComponent(cleanQ)}&phone=${encodeURIComponent(cleanQ)}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedOrders(data);

        data.forEach((o: Order) => {
          if (o.status === 'auto_verified' || o.status === 'manual_verified') {
            fireConfetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.7 }
            });
          }
        });
      }
    } catch (err) {
      console.error('Error tracking orders:', err);
    } finally {
      if (showLoader) setIsTrackingLoading(false);
    }
  };

  const activeVodafoneNumber = settings.vodafone_cash_numbers[0] || '01015339426';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* --- TOP BANNER & HEADER --- */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-indigo-800 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight gradient-gold-text">
                {settings.store_name}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span>🎓 متجر الدفعة التاسعة الرسمي</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Track Order Button */}
            <button
              onClick={() => setIsTrackerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-sm font-medium text-slate-200 transition-all"
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">متابعة حالة الطلب</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl gradient-purple-btn text-white text-sm font-semibold shadow-lg shadow-indigo-600/30"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>السلة</span>
              {totalCartCount > 0 && (
                <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center border-2 border-slate-950 animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Admin Dashboard Link */}
            <a
              href="/admin"
              className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition"
              title="لوحة التحكم"
            >
              🔒 الإدارة
            </a>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden border-b border-slate-800/60 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>منتجات ومستلزمات تخرج الدفعة التاسعة الحصرية</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
            احجز منتجات <span className="gradient-gold-text">الدفعة التاسعة</span> الآن
          </h2>
          <p className="max-w-2xl mx-auto text-slate-400 text-sm sm:text-base mb-6 leading-relaxed">
            تصفح صور المنتج بالكامل، اختر المقاس والتطريز المطلوب، وادفع فوراً عبر فودافون كاش أو إنستا باي مع التأكيد المباشر للطلب.
          </p>

          {/* Pickup Note Alert */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs sm:text-sm font-medium">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>مكان التسليم: <strong className="text-amber-400">{settings.pickup_note}</strong></span>
          </div>
        </div>
      </section>

      {/* --- PRODUCTS CATALOG SECTION --- */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>منتجات التخرج الحصرية</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {products.length} منتجات
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">اضغط على أي منتج لمعاينة كافة الصور، اختيارات المقاسات والتطريز</p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => {
            const hasSizes = product.sizes && product.sizes.length > 0;
            const currentSize = selectedSizes[product.id] || (hasSizes ? product.sizes[0] : '');
            const imagesList = product.images && product.images.length > 0 ? product.images : [product.image_url];

            return (
              <div
                key={product.id}
                className="group rounded-3xl glass-card overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 flex flex-col hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer"
                onClick={() => handleOpenProductModal(product)}
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.title_ar || product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-400 font-bold text-sm border border-amber-500/30">
                      {product.price} ج.م
                    </span>
                  </div>
                  
                  {imagesList.length > 1 && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>{imagesList.length} صور</span>
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 rounded-xl bg-slate-900/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xl border border-slate-700">
                      <Eye className="w-4 h-4 text-indigo-400" />
                      <span>معاينة التفاصيل والتطريز</span>
                    </span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-6 flex-1 flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 
                        onClick={() => handleOpenProductModal(product)} 
                        className="text-lg font-bold text-white group-hover:text-amber-400 transition hover:underline"
                      >
                        {product.title_ar || product.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
                      {product.description_ar || product.description}
                    </p>

                    {/* Customization badge if available */}
                    {product.has_customization && (
                      <div className="mb-3 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{product.customization_label || 'يدعم طباعة والتطريز حسب الطلب'}</span>
                      </div>
                    )}

                    {/* Size Selector */}
                    {hasSizes && (
                      <div className="mb-5">
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          اختر المقاس (Size):
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {product.sizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSizes(prev => ({ ...prev, [product.id]: size }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                currentSize === size
                                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Action */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCartDirect(product)}
                      className="flex-1 py-3 px-4 rounded-xl gradient-purple-btn text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة للسلة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenProductModal(product)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                      title="عرض المعرض والتطريز"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* --- RICH INTERACTIVE PRODUCT DETAIL MODAL --- */}
      {activeProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-3xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{activeProductModal.title_ar || activeProductModal.title}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {activeProductModal.price} ج.م
                </span>
              </h3>
              <button
                onClick={() => setActiveProductModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Image Gallery Viewer */}
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
                  <img
                    src={
                      (activeProductModal.images && activeProductModal.images[modalActiveImageIndex]) ||
                      activeProductModal.image_url
                    }
                    alt={activeProductModal.title_ar}
                    className="w-full h-full object-cover"
                  />
                  
                  {activeProductModal.images && activeProductModal.images.length > 1 && (
                    <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                      <button
                        type="button"
                        onClick={() => setModalActiveImageIndex(prev => (prev > 0 ? prev - 1 : activeProductModal.images!.length - 1))}
                        className="p-2 rounded-full bg-slate-950/80 text-white pointer-events-auto border border-slate-700 hover:bg-slate-900"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalActiveImageIndex(prev => (prev < activeProductModal.images!.length - 1 ? prev + 1 : 0))}
                        className="p-2 rounded-full bg-slate-950/80 text-white pointer-events-auto border border-slate-700 hover:bg-slate-900"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Gallery Thumbnails List */}
                {activeProductModal.images && activeProductModal.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeProductModal.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setModalActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                          modalActiveImageIndex === idx ? 'border-amber-400 scale-105 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Customization Options & Details */}
              <div className="space-y-5 text-right">
                <div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeProductModal.description_ar || activeProductModal.description}
                  </p>
                </div>

                {/* Size Selector */}
                {activeProductModal.sizes && activeProductModal.sizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">اختيار المقاس *</label>
                      {activeProductModal.size_chart_url && (
                        <button
                          type="button"
                          onClick={() => setIsSizeChartModalOpen(true)}
                          className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          <span>دليل المقاسات 📐</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeProductModal.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setModalSelectedSize(s)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            modalSelectedSize === s
                              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105'
                              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Embroidery / Name Customization Field */}
                {activeProductModal.has_customization && (
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
                    <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{activeProductModal.customization_label || 'التطريز أو الطباعة المخصصة'}</span>
                    </label>
                    <input
                      type="text"
                      placeholder="أدخل الاسم أو الكلية (مثال: أحمد علي - حاسبات 2026)"
                      value={modalCustomText}
                      onChange={(e) => setModalCustomText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Add to cart submit */}
                <button
                  type="button"
                  onClick={handleAddToCartFromModal}
                  className="w-full py-4 px-6 rounded-2xl gradient-purple-btn text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30"
                >
                  <Plus className="w-5 h-5" />
                  <span>إضافة المنتج للسلة بالمواصفات المحددة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SIZE CHART VIEWER MODAL --- */}
      {isSizeChartModalOpen && activeProductModal?.size_chart_url && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="relative max-w-xl w-full glass-modal rounded-3xl p-6 border border-slate-700 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ruler className="w-5 h-5 text-amber-400" />
                <span>دليل وقوانين المقاسات بالسنتيمتر 📐</span>
              </h3>
              <button onClick={() => setIsSizeChartModalOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 max-h-[70vh] overflow-auto">
              <img src={activeProductModal.size_chart_url} alt="Size Chart" className="max-w-full rounded-xl mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* --- CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">سلة الشراء ({totalCartCount})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
                  <ShoppingBag className="w-16 h-16 stroke-1 mb-4 opacity-40 text-indigo-400" />
                  <p className="text-base font-semibold text-slate-300 mb-1">السلة فارغة حالياً</p>
                  <p className="text-xs">اختر المنتجات من الصفحة الرئيسية وأضفها هنا</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize || 'nosize'}-${idx}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60"
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.title_ar}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950"
                    />
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {item.product.title_ar || item.product.title}
                      </h4>
                      {item.selectedSize && (
                        <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                          المقاس: {item.selectedSize}
                        </span>
                      )}
                      {item.customText && (
                        <p className="text-[11px] text-amber-300 font-medium">
                          ✨ التطريز: &quot;{item.customText}&quot;
                        </p>
                      )}
                      <p className="text-xs font-semibold text-indigo-400">
                        {item.product.price} ج.م × {item.quantity} = {item.product.price * item.quantity} ج.م
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-1 border border-slate-700">
                      <button
                        onClick={() => handleUpdateQuantity(idx, -1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white px-1.5">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(idx, 1)}
                        className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-800 bg-slate-900/90 space-y-4">
                <div className="flex items-center justify-between text-base">
                  <span className="text-slate-400 font-medium">الإجمالي الكلي:</span>
                  <span className="text-2xl font-black gradient-gold-text">{cartTotal} ج.م</span>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 px-6 rounded-2xl gradient-purple-btn text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30"
                >
                  <span>متابعة الدفع والتأكيد (ادفع الآن)</span>
                  <Send className="w-5 h-5 rotate-180" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PAYMENT & CHECKOUT MODAL (ادفع الآن) WITH RECEIPT UPLOAD --- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                  <span>تفاصيل التحويل وبيانات الطلب</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ادفع المبلغ المطلوب للحساب ثم أدخل بياناتك وارفع إيصال الدفع</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 mb-6 text-center">
              <span className="text-xs font-bold text-amber-400 block mb-1">إجمالي المبلغ المطلوب تحويله</span>
              <span className="text-4xl font-black text-white">{cartTotal} <span className="text-amber-400 text-xl">ج.م</span></span>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('vodafone_cash')}
                className={`p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  paymentMethod === 'vodafone_cash'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-600/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span>فودافون كاش (Vodafone Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  paymentMethod === 'instapay'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg shadow-purple-600/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span>إنستا باي (InstaPay)</span>
              </button>
            </div>

            {/* Transfer Instructions & Copy Box */}
            {paymentMethod === 'vodafone_cash' ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>حول المبلغ على رقم فودافون كاش التالي:</span>
                  <span className="text-rose-400 font-semibold">محفظة كاش</span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xl font-mono font-extrabold text-white tracking-widest">
                    {activeVodafoneNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeVodafoneNumber, 'voda')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                  >
                    {copiedText === 'voda' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'voda' ? 'تم النسخ' : 'نسخ الرقم'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>حول المبلغ على حساب InstaPay IPA التالي:</span>
                  <span className="text-purple-400 font-semibold">InstaPay</span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-base font-mono font-bold text-white">
                    {settings.instapay_ipa}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(settings.instapay_ipa, 'insta')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                  >
                    {copiedText === 'insta' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText === 'insta' ? 'تم النسخ' : 'نسخ الحساب'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Customer Details & Receipt Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الاسم بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك الثلاثي"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رقم الموبايل (الذي قمت بالتحويل منه للتحقق الفوري) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="010XXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center justify-between">
                  <span>الرقم المرجعي للمعاملة / رقم العملية <span className="text-rose-500 font-black">* (إجباري)</span></span>
                  <span className="text-[10px] text-amber-400 font-mono">Ref# / Transaction ID</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="أدخل الرقم المرجعي أو رقم العملية (مثال: Ref# 8554632e أو 123456789)"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/60 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm font-mono shadow-inner shadow-amber-500/5"
                />
              </div>

              {/* Payment Receipt Upload Field */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>رفع صورة إيصال التحويل / سكرين شوت الدفع 📸</span>
                  <span className="text-[11px] text-amber-400 font-normal">مستحسن لتأكيد فوري</span>
                </label>

                {receiptUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center gap-3">
                      <img src={receiptUrl} alt="Receipt preview" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                      <span className="text-xs text-emerald-400 font-bold">تم رفع صورة الإيصال بنجاح ✓</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptUrl('')}
                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs"
                    >
                      تغيير الصورة
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-4 text-center cursor-pointer transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1 text-slate-400">
                      <Upload className="w-6 h-6 text-amber-400 mb-1" />
                      <p className="text-xs font-bold text-slate-200">اضغط لرفع سكرين شوت الدفع من الاستوديو</p>
                      <p className="text-[10px] text-slate-500">PNG, JPG أو WEBP حتى 8MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pickup Note Reminder */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>مكان التسليم: <strong className="text-white">{settings.pickup_note}</strong></span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className="w-full py-4 px-6 rounded-2xl gradient-purple-btn text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSubmittingOrder ? (
                  <span>جاري حفظ وتأكيد الطلب...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>إرسال الطلب ومتابعة التأكيد التلقائي</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- LIVE ORDER STATUS TRACKER MODAL --- */}
      {isTrackerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-2xl glass-modal rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">متابعة حالة الطلب والتحويل</h3>
                  <p className="text-xs text-slate-400">تحديث فوري حالة الدفع والتأكيد عبر النظام</p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackerOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-6 flex gap-2">
              <input
                type="text"
                placeholder="أدخل رقم الموبايل أو كود الطلب (مثل GRAD-12345)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTrackedOrders(searchQuery)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => fetchTrackedOrders(searchQuery)}
                disabled={isTrackingLoading}
                className="px-5 py-3 rounded-xl gradient-purple-btn text-white font-bold text-sm flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>بحث</span>
              </button>
            </div>

            {/* Tracked Orders List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {trackedOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <Clock className="w-12 h-12 stroke-1 mx-auto mb-2 text-indigo-400 opacity-50" />
                  <p className="text-sm font-semibold text-slate-300">لم يتم العثور على طلبات مطابقة</p>
                  <p className="text-xs mt-1">يرجى التأكد من كتابة رقم الموبايل الذي أدخلته عند طلب المنتجات</p>
                </div>
              ) : (
                trackedOrders.map((order) => {
                  const isVerified = order.status === 'auto_verified' || order.status === 'manual_verified';
                  const isReady = order.status === 'ready_for_pickup';
                  const isDelivered = order.status === 'delivered';

                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
                    >
                      {/* Order Code & Status Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-xs text-slate-400 font-medium">كود الطلب:</span>
                          <span className="text-base font-extrabold text-amber-400 mr-2 font-mono">
                            #{order.order_code}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>تم تأكيد الدفع بنجاح</span>
                          </span>
                        )}
                        {order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>جاري التحقق التلقائي من التحويل...</span>
                          </span>
                        )}
                        {isReady && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/40">
                            <Package className="w-3.5 h-3.5 text-indigo-400" />
                            <span>جاهز للاستلام بالمقر</span>
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/40">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            <span>تم التسليم</span>
                          </span>
                        )}
                      </div>

                      {/* Order Items & Customer Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 mb-1">العميل: <strong className="text-white">{order.customer_name}</strong></p>
                          <p className="text-slate-400">رقم الهاتف: <strong className="text-white font-mono">{order.customer_phone}</strong></p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-slate-400 mb-1">الإجمالي: <strong className="text-amber-400 text-sm">{order.total_amount} ج.م</strong></p>
                          <p className="text-slate-400">وسيلة الدفع: <strong className="text-white">{order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : 'InstaPay'}</strong></p>
                        </div>
                      </div>

                      {/* Pickup Info Banner */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 flex items-center justify-between">
                        <span>مكان التسليم: <strong className="text-amber-400">{settings.pickup_note}</strong></span>
                        <span className="text-[11px] text-slate-400">{new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 space-y-2">
          <p>© 2026 {settings.store_name} - جميع الحقوق محفوظة للدفعة التاسعة.</p>
          <p className="text-[11px] text-slate-600">نظام الدفع الفوري التلقائي المربوط ببوابة SMS & InstaPay</p>
        </div>
      </footer>
    </div>
  );
}
