'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ShoppingBag, 
  ChevronRight, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Ruler, 
  Layers, 
  Share2, 
  CheckCircle2, 
  Award, 
  X, 
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Ticket,
  User
} from 'lucide-react';
import { Product, ProductAddon, CartItem, StoreSettings, EventAttendee } from '@/types';
import { DEFAULT_PRODUCTS, fetchProductsFromSupabase, cleanProductDescription } from '@/lib/supabaseClient';

export default function StandaloneProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Image Gallery Index
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Selected Product Options
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Event Tickets & Attendees State
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);

  // Modals & UI Feedback
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [copiedLinkToast, setCopiedLinkToast] = useState(false);

  // Cart State from localStorage
  const [cart, setCart] = useState<CartItem[]>([]);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isEvent = Boolean(
    product?.is_event || 
    product?.category?.includes('تذاكر') || 
    product?.category?.includes('إيفينت') || 
    product?.category?.includes('Event') || 
    product?.category?.includes('حفل') ||
    product?.category?.includes('Day') ||
    product?.title_ar?.toLowerCase().includes('scarb') ||
    product?.title_ar?.toLowerCase().includes('day') ||
    product?.title_ar?.includes('يوم') ||
    product?.title_ar?.includes('حفل') ||
    product?.title_ar?.includes('تذكرة') ||
    product?.title?.toLowerCase().includes('scarb') ||
    product?.title?.toLowerCase().includes('day')
  );

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('graduation_store_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.warn('Failed to load cart', e);
    }
  }, []);

  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem('graduation_store_cart', JSON.stringify(updatedCart));
  };

  // Sync Attendees array with quantity for event tickets
  useEffect(() => {
    if (isEvent) {
      setAttendees(prev => {
        const updated: EventAttendee[] = [];
        const savedCustomer = typeof window !== 'undefined' ? localStorage.getItem('graduation_customer_session') : null;
        let cust: any = null;
        if (savedCustomer) { try { cust = JSON.parse(savedCustomer); } catch(e) {} }

        for (let i = 0; i < quantity; i++) {
          if (prev[i] && prev[i].name) {
            updated.push(prev[i]);
          } else if (i === 0 && cust?.full_name) {
            updated.push({ name: cust.full_name, phone: cust.phone_number || '' });
          } else {
            updated.push({ name: prev[i]?.name || '', phone: prev[i]?.phone || '' });
          }
        }
        return updated;
      });
    }
  }, [quantity, isEvent]);

  useEffect(() => {
    async function loadProductData() {
      setIsLoading(true);
      try {
        const fetchedProds = await fetchProductsFromSupabase();
        const fullList = fetchedProds && fetchedProds.length > 0 ? fetchedProds : DEFAULT_PRODUCTS;
        setAllProducts(fullList);

        const found = fullList.find(p => p.id === productId);
        if (found) {
          setProduct(found);
          if (found.sizes && found.sizes.length > 0) {
            setSelectedSize(found.sizes[0]);
          }
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error('Error fetching product details', err);
        const fallback = DEFAULT_PRODUCTS.find(p => p.id === productId) || null;
        setProduct(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    if (productId) {
      loadProductData();
    }
  }, [productId]);

  const toggleAddon = (addon: ProductAddon) => {
    setSelectedAddons(prev => {
      const exists = prev.some(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    async function loadSettingsData() {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const s = await res.json();
          setStoreSettings(s);
        }
      } catch (e) {}
    }
    loadSettingsData();
  }, []);

  const handleAddToCart = (redirectAfter: boolean = false) => {
    if (!product) return;

    if (storeSettings?.maintenance_mode) {
      const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
      if (!isAdmin) {
        alert('عفواً، المتجر في وضع الصيانة والتحديث حالياً، تم تعليق استقبال الطلبات والـ Checkout مؤقتاً.');
        return;
      }
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert('يرجى اختيار المقاس أولاً');
      return;
    }

    if (isEvent) {
      const missingIdx = attendees.findIndex(a => !a.name.trim());
      if (missingIdx > -1) {
        alert(`يرجى كتابة اسم الحاضر للتذكرة رقم ${missingIdx + 1}`);
        return;
      }
    }

    const newItem: CartItem = {
      product,
      selectedSize: selectedSize || undefined,
      customText: customText.trim() || undefined,
      quantity,
      selectedAddons: selectedAddons.length > 0 ? [...selectedAddons] : undefined,
      attendees: isEvent ? [...attendees] : undefined
    };

    let updatedCart: CartItem[];

    if (redirectAfter) {
      // Buy Now: Replace cart with this immediate purchase to avoid accumulating old items
      updatedCart = [newItem];
    } else {
      // Add to Cart: Replace previous selection of the same product with new selection
      const filtered = cart.filter(item => item.product.id !== product.id);
      updatedCart = [...filtered, newItem];
    }

    saveCartToStorage(updatedCart);

    if (redirectAfter) {
      router.push('/checkout');
    } else {
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 3000);
    }
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLinkToast(true);
      setTimeout(() => setCopiedLinkToast(false), 3000);
    }
  };

  // Filter suggested products (excluding current product)
  const suggestedProducts = allProducts.filter(p => p.id !== productId && p.is_active !== false).slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-slate-400">جاري تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">عفواً، المنتج غير موجود</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          قد يكون المنتج قد تم إزالته أو أن الرابط غير صحيح
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-600 transition"
        >
          العودة لتصفح المتجر
        </button>
      </div>
    );
  }

  const galleryImages = product.images && product.images.length > 0 ? product.images : [product.image_url];
  const activeImage = galleryImages[activeImageIndex] || product.image_url;

  // Calculate Addons Extra Price
  const addonsTotalPrice = selectedAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const singleUnitPrice = product.price + addonsTotalPrice;
  const totalPriceCalculated = singleUnitPrice * quantity;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      
      {/* --- TOP NAVBAR --- */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs sm:text-sm font-semibold border border-slate-700/60"
            >
              <ChevronRight className="w-4 h-4 text-lime-400" />
              <span>العودة للمتجر</span>
            </button>
            <img src="/logo-removebg-preview.png" alt="themedix" className="h-7 w-auto object-contain hidden xs:block filter drop-shadow-[0_0_8px_rgba(142,208,0,0.3)]" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (storeSettings?.maintenance_mode) {
                  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';
                  if (!isAdmin) {
                    alert('عفواً، المتجر في وضع الصيانة والتحديث حالياً، تم تعليق استقبال الطلبات والـ Checkout مؤقتاً.');
                    return;
                  }
                }
                router.push('/checkout');
              }}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>السلة ({totalCartCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- BREADCRUMB --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button onClick={() => router.push('/')} className="hover:text-amber-400 transition">الرئيسية</button>
          <span>/</span>
          <span className="text-slate-500">{product.category}</span>
          <span>/</span>
          <span className="text-amber-400 font-semibold truncate max-w-[200px]">{product.title_ar}</span>
        </div>
      </div>

      {/* --- MAIN PRODUCT CONTAINER --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Success Toast */}
        {addedToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold text-sm px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5" />
            <span>تمت إضافة المنتج والميزات إلى سلتك بنجاح! 🎉</span>
          </div>
        )}

        {copiedLinkToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-bold text-sm px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>تم نسخ رابط المنتج إلى الحافظة! 🔗</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- LEFT COLUMN: GALLERY --- */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
              <img 
                src={activeImage} 
                alt={product.title_ar} 
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-amber-400 text-xs font-bold">
                {product.category}
              </span>
            </div>

            {/* Gallery Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition ${
                      activeImageIndex === idx
                        ? 'border-amber-500 ring-2 ring-amber-500/30'
                        : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Size Chart Banner Button */}
            {product.size_chart_url && (
              <button
                type="button"
                onClick={() => setIsSizeChartOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/5 active:scale-[0.98]"
              >
                <Ruler className="w-4 h-4 text-amber-400" />
                <span>عرض دليل وجدول المقاسات الرسمي 📐</span>
              </button>
            )}
          </div>

          {/* --- RIGHT COLUMN: PRODUCT INFO & OPTIONS --- */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Title & Stock */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  ✓ متوفر الآن للطلب (دفعة التخرج 9)
                </span>

                <button
                  onClick={handleShareLink}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 transition"
                  title="مشاركة المنتج"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-100 leading-snug">
                {product.title_ar}
              </h1>
              {product.title && product.title !== product.title_ar && (
                <p className="text-xs text-slate-500 font-mono" dir="ltr">{product.title}</p>
              )}
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">السعر الأساسي للقطعة</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-emerald-400">{product.price}</span>
                  <span className="text-sm font-bold text-slate-400">ج.م</span>
                </div>
              </div>

              {addonsTotalPrice > 0 && (
                <div className="text-left border-r border-slate-800 pr-4">
                  <span className="text-[11px] text-amber-400 block">+ الإضافات الخاطفة</span>
                  <span className="text-sm font-bold text-slate-200">+{addonsTotalPrice} ج.م</span>
                </div>
              )}
            </div>

            {/* Description */}
            {cleanProductDescription(product.description_ar) && (
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800/60">
                {cleanProductDescription(product.description_ar)}
              </div>
            )}

            {/* Size Picker */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">اختر المقاس المناسب:</label>
                  {product.size_chart_url && (
                    <button
                      onClick={() => setIsSizeChartOpen(true)}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>جدول المقاسات</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[48px] h-12 px-4 rounded-2xl text-xs sm:text-sm font-bold border transition ${
                        selectedSize === sz
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Embroidery Input */}
            {product.has_customization && (
              <div className="space-y-2 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <label className="block text-xs font-bold text-amber-400">
                  ✏️ {product.customization_label || 'الاسم أو الكلية للتطريز/الطباعة:'}
                </label>
                <input
                  type="text"
                  placeholder="مثال: أحمد مصطفى - كلية الهندسـة"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            )}

            {/* --- VISUAL ADD-ONS SECTION (الإضافات والملحقات) --- */}
            {product.addons && product.addons.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">
                        خيارات وإضافات مخصصة لطلبك (Add-ons):
                      </h3>
                      <p className="text-xs text-slate-400">يمكنك اختيار ميزات أو ملحقات إضافية تضاف لطلبك</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.addons.map((addon) => {
                    const isSelected = selectedAddons.some(a => a.id === addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        className={`p-4 rounded-3xl border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-slate-900 border-amber-500 shadow-xl shadow-amber-500/10 scale-[1.02]'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Addon Image preview */}
                          {addon.image_url ? (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 shadow-md">
                              <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                            </div>
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-md">
                              <Layers className="w-8 h-8" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                                {addon.name}
                              </h4>
                            </div>
                            {addon.description && (
                              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                {addon.description}
                              </p>
                            )}
                            <div className="pt-1">
                              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-xs font-mono">
                                +{addon.price} ج.م
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Select Toggle Button */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400">
                            {isSelected ? 'تم اختيار الإضافة ✓' : 'إضافة للطلب'}
                          </span>

                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                              isSelected ? 'bg-slate-950 text-amber-400' : 'border border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{isSelected ? 'محددة' : 'إضافة'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Controller & Totals */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {isEvent ? 'عدد تذاكر الإيفينت المطلوب:' : 'الكمية:'}
                </span>
                <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center justify-center transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-slate-100">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center justify-center transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-xs font-bold text-slate-400">الإجمالي المحسوب:</span>
                <span className="text-xl font-black text-emerald-400">{totalPriceCalculated} ج.م</span>
              </div>
            </div>

            {/* Event Attendees Form (Dynamic according to Quantity) */}
            {isEvent && (
              <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-500/50 space-y-4 shadow-xl shadow-amber-500/5">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">
                      بيانات الحاضرين والتذاكر ({quantity} {quantity === 1 ? 'تذكرة' : 'تذاكر'}):
                    </h3>
                    <p className="text-[11px] text-slate-400">يرجى كتابة اسم كل شخص سيحضر الفعالية لإصدار التذكرة باسمه</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {attendees.map((att, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>{idx === 0 ? 'التذكرة 1 (الحاضر الرئيسي)' : `التذكرة ${idx + 1} (مرافق)`}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1 font-semibold">اسم الحاضر بالكامل *</label>
                          <input
                            type="text"
                            required
                            placeholder={idx === 0 ? "اسمك الثلاثي" : `اسم الشخص المرافق ${idx + 1}`}
                            value={att.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendees(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], name: val };
                                return next;
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1 font-semibold">رقم الموبايل (اختياري)</label>
                          <input
                            type="tel"
                            placeholder="01012345678"
                            value={att.phone || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttendees(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], phone: val };
                                return next;
                              });
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleAddToCart(false)}
                className="py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>إضافة إلى السلة</span>
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                className="py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <span>شراء الآن والدفع 🚀</span>
              </button>
            </div>

          </div>
        </div>

        {/* --- SUGGESTED / RECOMMENDED PRODUCTS SECTION (منتجات مقترحة) --- */}
        {suggestedProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black text-slate-100">
                  قد يعجبك أيضاً (منتجات مقترحة 🌟)
                </h2>
              </div>

              <button
                onClick={() => router.push('/')}
                className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>عرض جميع المنتجات</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {suggestedProducts.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => router.push(`/product/${sp.id}`)}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition duration-300 group flex flex-col justify-between"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-950">
                    <img
                      src={sp.image_url}
                      alt={sp.title_ar}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 text-[10px] font-bold text-amber-400">
                      {sp.category}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition line-clamp-1">
                        {sp.title_ar}
                      </h3>
                      {sp.description_ar && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {sp.description_ar}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-sm font-black text-emerald-400">{sp.price} ج.م</span>
                      <span className="text-xs text-amber-400 font-semibold group-hover:translate-x-[-2px] transition">
                        عرض التفاصيل ←
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* --- SIZE CHART MODAL --- */}
      {isSizeChartOpen && product.size_chart_url && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6">
            <button
              onClick={() => setIsSizeChartOpen(false)}
              className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-amber-400" />
              <span>جدول مقاسات - {product.title_ar}</span>
            </h3>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img src={product.size_chart_url} alt="جدول المقاسات" className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
