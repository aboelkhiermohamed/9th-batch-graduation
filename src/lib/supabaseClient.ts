import { createClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, IncomingTransaction, OrderItem, GatewayDevice } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gthedzjjumbxdaxmehqb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- INITIAL FALLBACK / SEED DATA ---
export const DEFAULT_SETTINGS: StoreSettings = {
  id: 'default',
  store_name: '9th batch graduation',
  vodafone_cash_enabled: true,
  instapay_enabled: false,
  vodafone_cash_fee_percent: 1,
  vodafone_cash_numbers: ['01015339426'],
  instapay_ipa: '9thbatch@instapay',
  instapay_ipas: ['9thbatch@instapay'],
  pickup_note: 'تابع جروب التليجرام',
  support_phone: '01555583154',
  updated_at: new Date().toISOString()
};

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    title: 'Graduation Baseball Jacket',
    title_ar: 'بيسبول هودي التخرج',
    description: 'Graduation Baseball jacket with custom 9th batch embroidery.',
    description_ar: 'جاكيت بيسبول التخرج مع تطريز خاص بالدفعة التاسعة خامة ممتازة وبطانة مريحة.',
    price: 650,
    category: 'الملابس (Apparel)',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600&auto=format&fit=crop&q=80'
    ],
    size_chart_url: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&auto=format&fit=crop&q=80',
    has_customization: true,
    customization_label: 'اسم الطالب أو الكلية للتطريز على الجاكيت',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    addons: [
      {
        id: 'add-1',
        name: 'تطريز ذهبي خاص بالاسم على الكم',
        price: 50,
        image_url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=300&auto=format&fit=crop&q=80',
        description: 'تطريز بخيوط ذهبية فائقة الجودة للاسم والكلية'
      },
      {
        id: 'add-2',
        name: 'علبة هدايا فاخرة بشعار التخرج',
        price: 45,
        image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300&auto=format&fit=crop&q=80',
        description: 'تغليف هدايا ملكي مميز للذكرى'
      }
    ],
    stock: 100,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
    title: 'Graduation Notebook',
    title_ar: 'نوت بوك الدفعة التاسعة',
    description: 'Hardcover premium graduation notebook & planner.',
    description_ar: 'نوت بوك فاخر غلاف مقوى بتصميم الدفعة التاسعة لملاحظات وذكريات التخرج.',
    price: 150,
    category: 'أدوات مكتبية (Stationery)',
    image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
    ],
    sizes: [],
    stock: 150,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
    title: 'Graduation Ceramic Mug',
    title_ar: 'ماج التخرج الحراري',
    description: 'Custom printed ceramic mug for 9th batch graduation.',
    description_ar: 'ماج سيراميك حراري مطبوع عليه شعار وتصميم التخرج الدفعة التاسعة.',
    price: 120,
    category: 'مستلزمات (Drinkware)',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
    ],
    has_customization: true,
    customization_label: 'الاسم المطلوب طباعته على الماج',
    sizes: [],
    stock: 200,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const DEFAULT_DEVICES: GatewayDevice[] = [];

// Memory/LocalStorage cache state for seamless offline & fallback execution
let memoryProducts: Product[] = [...DEFAULT_PRODUCTS];
let memoryOrders: Order[] = [];
let memorySettings: StoreSettings = { ...DEFAULT_SETTINGS };
let memoryTransactions: IncomingTransaction[] = [];
let memoryDevices: GatewayDevice[] = [...DEFAULT_DEVICES];

let memoryDeletedProductIds: string[] = [];

export function getDeletedProductIds(): string[] {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('graduation_store_deleted_products');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
  }
  return memoryDeletedProductIds;
}

export function setDeletedProductIds(ids: string[]) {
  if (Array.isArray(ids)) {
    memoryDeletedProductIds = Array.from(new Set([...memoryDeletedProductIds, ...ids]));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('graduation_store_deleted_products', JSON.stringify(memoryDeletedProductIds));
      } catch (e) {}
    }
  }
}

export function addDeletedProductId(id: string) {
  if (!memoryDeletedProductIds.includes(id)) {
    memoryDeletedProductIds.push(id);
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('graduation_store_deleted_products', JSON.stringify(memoryDeletedProductIds));
    } catch (e) {}
  }
  memoryProducts = memoryProducts.filter(p => p.id !== id);
}

// --- SUPABASE DATABASE PERSISTENCE HELPERS ---

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: true });

    let dbProds: Product[] = [];
    const inactiveDbIds = new Set<string>();

    if (!error && data && data.length > 0) {
      data.forEach((p: any) => {
        if (p.is_active === false || p.title === 'DELETED' || p.title_ar === 'DELETED') {
          inactiveDbIds.add(p.id);
          addDeletedProductId(p.id);
        } else {
          let prodMeta: any = null;
          let cleanDescAr = cleanProductDescription(p.description_ar || p.description || '');

          const b64Match = (p.description_ar || '').match(/\[PROD_META_B64:([A-Za-z0-9+/=]+)\]/);
          if (b64Match && b64Match[1]) {
            prodMeta = decodeProdMeta(b64Match[1]);
          } else {
            const legacyMatch = (p.description_ar || '').match(/\[PROD_META:([\s\S]*?)\]/);
            if (legacyMatch && legacyMatch[1]) {
              try { prodMeta = JSON.parse(legacyMatch[1]); } catch (e) {}
            }
          }

          const resolvedImages = prodMeta?.imgs && Array.isArray(prodMeta.imgs) && prodMeta.imgs.length > 0
            ? prodMeta.imgs
            : (Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images) : [p.image_url]));

          const resolvedSizeChart = prodMeta?.chart || p.size_chart_url || undefined;
          const resolvedAddons = prodMeta?.addons && Array.isArray(prodMeta.addons) && prodMeta.addons.length > 0
            ? prodMeta.addons
            : (Array.isArray(p.addons) ? p.addons : (typeof p.addons === 'string' ? JSON.parse(p.addons) : []));

          dbProds.push({
            id: p.id,
            title: p.title || p.title_ar,
            title_ar: p.title_ar || p.title,
            description: cleanDescAr,
            description_ar: cleanDescAr,
            price: Number(p.price || 0),
            category: p.category || 'Apparel',
            image_url: p.image_url || '',
            images: resolvedImages,
            size_chart_url: resolvedSizeChart,
            has_customization: Boolean(p.has_customization),
            customization_label: p.customization_label || undefined,
            sizes: Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : []),
            addons: resolvedAddons,
            stock: Number(p.stock || 0),
            is_active: true,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString()
          });
        }
      });
    }

    const deletedIds = new Set([...getDeletedProductIds(), ...inactiveDbIds]);
    const currentMemory = getMemoryProducts().filter(p => !deletedIds.has(p.id));
    const dbIds = new Set(dbProds.map(p => p.id));
    const extraLocal = currentMemory.filter(p => !dbIds.has(p.id) && !deletedIds.has(p.id));
    const finalProducts = [...dbProds, ...extraLocal].filter(p => !deletedIds.has(p.id));

    setMemoryProducts(finalProducts);
    return finalProducts;
  } catch (err) {
    console.warn('Error reading products from Supabase:', err);
    const deletedIds = new Set(getDeletedProductIds());
    return getMemoryProducts().filter(p => !deletedIds.has(p.id));
  }
}

export async function saveProductToSupabase(product: Product): Promise<{ success: boolean; error?: string }> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

  const current = getMemoryProducts();
  const idx = current.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...product };
  } else {
    current.unshift(product);
  }
  setMemoryProducts([...current]);

  if (!supabase) {
    return { success: true };
  }

  try {
    const rawImages = product.images && product.images.length > 0 ? product.images : [product.image_url];
    const rawSizes = product.sizes || [];
    const rawAddons = product.addons || [];

    const cleanDesc = cleanProductDescription(product.description_ar || product.description || '');
    const prodMeta = {
      imgs: rawImages,
      chart: product.size_chart_url || undefined,
      addons: rawAddons
    };
    const b64Meta = encodeProdMeta(prodMeta);
    const encodedDesc = b64Meta ? `${cleanDesc} [PROD_META_B64:${b64Meta}]` : cleanDesc;

    const payload: any = {
      title: product.title || product.title_ar || 'Product',
      title_ar: product.title_ar || product.title || 'منتج',
      description: cleanDesc,
      description_ar: encodedDesc,
      price: Number(product.price) || 0,
      category: product.category || 'Apparel',
      image_url: product.image_url,
      images: rawImages,
      size_chart_url: product.size_chart_url || null,
      has_customization: Boolean(product.has_customization),
      customization_label: product.customization_label || null,
      sizes: rawSizes,
      addons: rawAddons,
      stock: Number(product.stock) || 0,
      is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
      updated_at: new Date().toISOString()
    };

    if (isUuid || product.id) {
      payload.id = product.id;
    }

    let { data, error } = await supabase
      .from('store_products')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    // Smart Column & Type Fallback Loop: Handles missing columns or text/json array column mismatches in Supabase Postgres
    let attempts = 0;
    while (error && attempts < 6) {
      attempts++;
      const match = error.message.match(/Could not find the '([^']+)' column/i) || error.message.match(/column "([^"]+)"/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Stripping unmigrated column '${missingCol}' from product payload...`);
        delete payload[missingCol];
        const res = await supabase.from('store_products').upsert(payload, { onConflict: 'id' }).select().single();
        data = res.data;
        error = res.error;
      } else if (error.message.includes('json') || error.message.includes('array') || error.message.includes('syntax') || error.message.includes('type')) {
        if (typeof payload.images === 'object') payload.images = JSON.stringify(payload.images);
        if (typeof payload.sizes === 'object') payload.sizes = JSON.stringify(payload.sizes);
        if (typeof payload.addons === 'object') payload.addons = JSON.stringify(payload.addons);
        const res = await supabase.from('store_products').upsert(payload, { onConflict: 'id' }).select().single();
        data = res.data;
        error = res.error;
      } else {
        break;
      }
    }

    if (error) {
      console.error('Supabase product upsert error:', error.message);
      return { success: false, error: error.message };
    }

    if (data?.id) {
      product.id = data.id;
      const updatedList = getMemoryProducts().map(p => p.id === payload.id ? { ...p, id: data.id } : p);
      setMemoryProducts(updatedList);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to insert product into Supabase:', err);
    return { success: false, error: err.message || 'Error inserting product into Supabase' };
  }
}

function parseArrayOrCommaString(val: any, fallback: string[]): string[] {
  if (!val) return fallback;
  if (Array.isArray(val)) {
    const clean = val.map(x => String(x).trim()).filter(Boolean);
    return clean.length > 0 ? clean : fallback;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const clean = parsed.map(x => String(x).trim()).filter(Boolean);
          return clean.length > 0 ? clean : fallback;
        }
      } catch (e) {}
    }
    const split = trimmed.split(',').map(x => x.trim()).filter(Boolean);
    if (split.length > 0) return split;
  }
  return fallback;
}

export function cleanDisplayNotes(str?: string | null): string {
  if (!str) return '';
  let cleaned = String(str);

  // Strip META tags even if truncated at the end
  cleaned = cleaned.replace(/\[\s*(META|SETTINGS_META):[\s\S]*/gi, '');
  cleaned = cleaned.replace(/META:\s*\{[\s\S]*/gi, '');
  cleaned = cleaned.replace(/\{"v":[\s\S]*/gi, '');
  cleaned = cleaned.replace(/"(v|i|vf|m|vn|ia|sp|del)":[\s\S]*/gi, '');
  cleaned = cleaned.replace(/\bsp:\s*\d+/gi, '');
  cleaned = cleaned.replace(/\[\s*RECEIPT_URL:[\s\S]*?\]/gi, '');
  cleaned = cleaned.replace(/RECEIPT_URL:\s*https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/\[VERIFIED_BY:.*?\]/gi, '');
  cleaned = cleaned.replace(/\[\[[\s\S]*?\]\]/gi, '');
  cleaned = cleaned.replace(/\["[^"]*?@instapay[^"]*?"\]/gi, '');
  cleaned = cleaned.replace(/\[[a-z0-9_\-\.]+\.(jpg|jpeg|png|webp|pdf)\]/gi, '');
  cleaned = cleaned.replace(/[\{\}\[\]"']/g, '');
  cleaned = cleaned.replace(/(,\s*)+$/g, '');
  cleaned = cleaned.replace(/(،\s*)+$/g, '');
  cleaned = cleaned.replace(/,+/g, ' ');
  cleaned = cleaned.replace(/،+/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

export function cleanProductDescription(str?: string | null): string {
  if (!str) return '';
  let cleaned = String(str);
  cleaned = cleaned.replace(/\[PROD_META_B64:[A-Za-z0-9+/=]+\]/g, '');
  cleaned = cleaned.replace(/\[PROD_META:[\s\S]*?\]/g, '');
  cleaned = cleaned.replace(/imgs":.*$/gi, '');
  cleaned = cleaned.replace(/chart":.*$/gi, '');
  cleaned = cleaned.replace(/addons":.*$/gi, '');
  cleaned = cleaned.replace(/id":.*$/gi, '');
  cleaned = cleaned.replace(/name":.*$/gi, '');
  cleaned = cleaned.replace(/\["https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/[\{\}\[\]"':]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If no letters or numbers remain, return empty string
  if (!/[\p{L}\p{N}]/u.test(cleaned)) {
    return '';
  }
  return cleaned;
}

export function encodeProdMeta(meta: any): string {
  try {
    const json = JSON.stringify(meta);
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(json, 'utf-8').toString('base64');
    } else if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(json)));
    }
  } catch (e) {}
  return '';
}

export function decodeProdMeta(b64Str: string): any {
  try {
    let json = '';
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(b64Str, 'base64').toString('utf-8');
    } else if (typeof atob !== 'undefined') {
      json = decodeURIComponent(escape(atob(b64Str)));
    }
    if (json) return JSON.parse(json);
  } catch (e) {}
  return null;
}

export async function fetchSettingsFromSupabase(): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      return getMemorySettings();
    }

    let meta: any = null;
    let rawNote = data.pickup_note || '';

    // Match compact [META:...] or full [SETTINGS_META:...]
    const match = rawNote.match(/\[(META|SETTINGS_META):(.*?)]/);
    if (match && match[2]) {
      try {
        meta = JSON.parse(match[2]);
        rawNote = rawNote.replace(/\s*\[(META|SETTINGS_META):.*?\]/g, '').trim();
      } catch (e) {}
    }

    if (Array.isArray(meta?.del) && meta.del.length > 0) {
      setDeletedProductIds(meta.del);
    }

    const currentMem = getMemorySettings();
    
    // Parse meta fields or fallback to column data
    const vodaEnabled = meta ? (meta.v !== undefined ? meta.v === 1 : meta.vodafone_cash_enabled === true)
      : (data.vodafone_cash_enabled !== undefined ? Boolean(data.vodafone_cash_enabled) : Boolean(currentMem.vodafone_cash_enabled));
      
    const instaEnabled = meta ? (meta.i !== undefined ? meta.i === 1 : meta.instapay_enabled === true)
      : (data.instapay_enabled !== undefined ? Boolean(data.instapay_enabled) : Boolean(currentMem.instapay_enabled));

    const defaultIpa = meta?.ia?.[0] || meta?.instapay_ipa || data.instapay_ipa || currentMem.instapay_ipa || '9thbatch@instapay';
    const vodaNums = meta?.vn || meta?.vodafone_cash_numbers || parseArrayOrCommaString(data.vodafone_cash_numbers, currentMem.vodafone_cash_numbers || ['01015339426']);
    const instaAccounts = meta?.ia || meta?.instapay_ipas || parseArrayOrCommaString(data.instapay_ipas, currentMem.instapay_ipas || [defaultIpa]);

    let isMaintenance = false;
    if (meta && meta.m !== undefined) {
      isMaintenance = meta.m === 1;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      isMaintenance = localStorage.getItem('graduation_store_maintenance') === 'true';
    } else {
      isMaintenance = Boolean(currentMem.maintenance_mode);
    }

    const cleanNote = cleanDisplayNotes(rawNote) || 'تابع جروب التليجرام';

    const vodaFeePct = meta?.vf !== undefined ? Number(meta.vf) : (data.vodafone_cash_fee_percent !== undefined ? Number(data.vodafone_cash_fee_percent) : (currentMem.vodafone_cash_fee_percent ?? 1));
    const supportPhone = meta?.sp || meta?.support_phone || data.support_phone || currentMem.support_phone || '01555583154';

    const settings: StoreSettings = {
      id: data.id,
      store_name: meta?.store_name || data.store_name || currentMem.store_name || '9th batch graduation',
      vodafone_cash_enabled: vodaEnabled,
      instapay_enabled: instaEnabled,
      vodafone_cash_fee_percent: vodaFeePct,
      vodafone_cash_numbers: vodaNums,
      instapay_ipa: defaultIpa,
      instapay_ipas: instaAccounts,
      pickup_note: cleanNote,
      support_phone: supportPhone,
      maintenance_mode: isMaintenance,
      updated_at: data.updated_at || new Date().toISOString()
    };

    setMemorySettings(settings);
    return settings;
  } catch (err) {
    console.warn('Error reading settings from Supabase:', err);
    return getMemorySettings();
  }
}

export async function saveSettingsToSupabase(settings: StoreSettings): Promise<boolean> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('graduation_store_maintenance', settings.maintenance_mode ? 'true' : 'false');
  }
  const cleanNote = cleanDisplayNotes(settings.pickup_note || 'تابع جروب التليجرام');
  const memoryPayload = { ...settings, pickup_note: cleanNote };
  setMemorySettings(memoryPayload);

  try {
    // Ultra-compact metadata object (fits under 120 chars to avoid VARCHAR(255) overflow)
    const compactMeta = {
      v: settings.vodafone_cash_enabled ? 1 : 0,
      i: settings.instapay_enabled ? 1 : 0,
      vf: Number(settings.vodafone_cash_fee_percent || 0),
      m: settings.maintenance_mode ? 1 : 0,
      vn: settings.vodafone_cash_numbers,
      ia: settings.instapay_ipas || [settings.instapay_ipa],
      sp: settings.support_phone || '01555583154',
      del: getDeletedProductIds()
    };

    const metaTag = `[META:${JSON.stringify(compactMeta)}]`;
    let maxNoteLen = 235 - metaTag.length;
    if (maxNoteLen < 10) maxNoteLen = 10;
    const safeNote = cleanNote.slice(0, maxNoteLen);
    const encodedNote = `${safeNote} ${metaTag}`;

    const payload: any = {
      id: 'default',
      store_name: settings.store_name,
      vodafone_cash_enabled: Boolean(settings.vodafone_cash_enabled),
      instapay_enabled: Boolean(settings.instapay_enabled),
      vodafone_cash_fee_percent: Number(settings.vodafone_cash_fee_percent || 0),
      vodafone_cash_numbers: settings.vodafone_cash_numbers.join(', '),
      instapay_ipa: (settings.instapay_ipas && settings.instapay_ipas[0]) || settings.instapay_ipa || '9thbatch@instapay',
      instapay_ipas: (settings.instapay_ipas || [settings.instapay_ipa]).join(', '),
      pickup_note: encodedNote,
      updated_at: new Date().toISOString()
    };

    let { error } = await supabase
      .from('store_settings')
      .upsert(payload);

    // Smart Column Fallback Loop for missing columns
    let attempts = 0;
    while (error && attempts < 5) {
      attempts++;
      const match = error.message.match(/Could not find the '([^']+)' column/i) || error.message.match(/column "([^"]+)"/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Stripping missing column '${missingCol}' from settings upsert payload...`);
        delete payload[missingCol];
        const res = await supabase.from('store_settings').upsert(payload);
        error = res.error;
      } else {
        console.warn('Supabase store_settings upsert error detail:', error.message);
        break;
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to save settings in Supabase:', err);
    return true;
  }
}

export async function saveOrderToSupabase(order: Order): Promise<boolean> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);

    // Embed receipt_url into notes as backup marker if column is missing in DB schema
    const receiptMarker = order.receipt_url ? ` [RECEIPT_URL:${order.receipt_url}]` : '';
    const orderNotes = (order.notes || '') + receiptMarker;

    const orderPayload: any = {
      order_code: order.order_code,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      payment_method: order.payment_method,
      status: order.status,
      total_amount: order.total_amount,
      sender_phone: order.sender_phone || order.customer_phone,
      transaction_ref: order.transaction_ref || null,
      receipt_url: order.receipt_url || null,
      notes: orderNotes
    };

    if (isUuid) {
      orderPayload.id = order.id;
    }

    let { data: insertedOrder, error: orderError } = await supabase
      .from('store_orders')
      .insert(orderPayload)
      .select()
      .single();

    // Smart Column Fallback Loop for store_orders
    let attempts = 0;
    while (orderError && attempts < 5) {
      attempts++;
      const match = orderError.message.match(/Could not find the '([^']+)' column/i) || orderError.message.match(/column "([^"]+)"/i);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Stripping missing column '${missingCol}' from order payload...`);
        delete orderPayload[missingCol];
        const res = await supabase.from('store_orders').insert(orderPayload).select().single();
        insertedOrder = res.data;
        orderError = res.error;
      } else {
        break;
      }
    }

    if (orderError) {
      console.warn('Supabase store_orders insert warning:', orderError.message);
    }

    if (insertedOrder?.id) {
      order.id = insertedOrder.id;
    }

    // Insert items into store_order_items
    if (order.items && order.items.length > 0) {
      const productsList = await fetchProductsFromSupabase();
      const firstValidProdUuid = productsList.find(p => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id))?.id || 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';

      const itemsPayload = order.items.map((item) => {
        let pId = item.product_id || item.product?.id;
        if (!pId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId)) {
          const match = productsList.find(p => p.title_ar === item.product_title || p.title === item.product_title);
          pId = (match && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)) ? match.id : firstValidProdUuid;
        }

        const itemId = (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id))
          ? item.id
          : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'f' + Date.now().toString(16).padStart(11, '0') + '-4000-8000-000000000000');

        item.order_id = order.id;

        const customOptStr = item.customization_option || (item as any).customizationOption || '';
        const customTextStr = item.custom_text || (item as any).customText || '';

        let titleWithDetails = item.product_title || item.product?.title_ar || item.product?.title || 'منتج التخرج';
        titleWithDetails = titleWithDetails
          .replace(/\s*\.?\s*\[الإضافات:.*?\]/gi, '')
          .replace(/\s*\.?\s*\[التطريز:.*?\]/gi, '')
          .trim();

        const itemImg = item.image_url || item.product?.image_url || (Array.isArray(item.product?.images) ? item.product.images[0] : undefined);
        const imgMarker = itemImg ? ` [IMG:${itemImg}]` : '';

        return {
          id: itemId,
          order_id: order.id,
          product_id: pId,
          product_title: titleWithDetails + imgMarker,
          image_url: itemImg || null,
          selected_size: item.selected_size || (item as any).selectedSize || null,
          custom_text: customTextStr || null,
          customization_option: customOptStr || null,
          quantity: item.quantity,
          unit_price: item.unit_price
        };
      });

      if (itemsPayload.length > 0) {
        let { error: itemsError } = await supabase
          .from('store_order_items')
          .insert(itemsPayload);

        // Smart Fallback Loop for store_order_items missing columns
        let attempts = 0;
        while (itemsError && attempts < 5) {
          attempts++;
          const match = itemsError.message.match(/Could not find the '([^']+)' column/i) || itemsError.message.match(/column "([^"]+)"/i);
          if (match && match[1]) {
            const missingCol = match[1];
            console.warn(`Stripping missing column '${missingCol}' from order items payload...`);
            itemsPayload.forEach(p => delete (p as any)[missingCol]);
            const res = await supabase.from('store_order_items').insert(itemsPayload);
            itemsError = res.error;
          } else {
            console.warn('Supabase store_order_items insert warning:', itemsError.message);
            break;
          }
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to persist order to Supabase:', err);
    return false;
  }
}

export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data: dbOrders, error } = await supabase
      .from('store_orders')
      .select('*, store_order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !dbOrders || dbOrders.length === 0) {
      return getMemoryOrders();
    }

    const fetchedOrders: Order[] = dbOrders.map((o: any) => {
      let rawNotes = o.notes || '';
      let extractedReceiptUrl = o.receipt_url || undefined;
      let verifiedBy = o.verified_by || undefined;

      if (!extractedReceiptUrl && rawNotes.includes('[RECEIPT_URL:')) {
        const match = rawNotes.match(/\[RECEIPT_URL:(.*?)\]/);
        if (match && match[1]) {
          extractedReceiptUrl = match[1];
          rawNotes = rawNotes.replace(/\[RECEIPT_URL:.*?\]/, '').trim();
        }
      }

      if (!verifiedBy && rawNotes.includes('[VERIFIED_BY:')) {
        const match = rawNotes.match(/\[VERIFIED_BY:(.*?)\]/);
        if (match && match[1]) {
          verifiedBy = match[1];
          rawNotes = rawNotes.replace(/\[VERIFIED_BY:.*?\]/, '').trim();
        }
      }

      const items = (o.store_order_items || []).map((item: any) => {
        let title = item.product_title || '';
        let custOpt = item.customization_option || undefined;
        let custText = item.custom_text || undefined;
        let itemImg = item.image_url || item.product_image || undefined;

        if (title.includes('[IMG:')) {
          const match = title.match(/\[IMG:(.*?)\]/);
          if (match && match[1]) {
            if (!itemImg) itemImg = match[1];
            title = title.replace(/\[IMG:.*?\]/, '').trim();
          }
        }

        if (!custOpt && title.includes('[الإضافات:')) {
          const match = title.match(/\[الإضافات:\s*(.*?)\]/);
          if (match && match[1]) {
            custOpt = match[1];
            title = title.replace(/\[الإضافات:.*?\]/, '').trim();
          }
        }
        if (!custText && title.includes('[التطريز:')) {
          const match = title.match(/\[التطريز:\s*(.*?)\]/);
          if (match && match[1]) {
            custText = match[1];
            title = title.replace(/\[التطريز:.*?\]/, '').trim();
          }
        }

        return {
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          product_title: title,
          image_url: itemImg,
          selected_size: item.selected_size,
          custom_text: custText,
          customization_option: custOpt,
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0)
        };
      });

      return {
        id: o.id,
        order_code: o.order_code,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        sender_phone: o.sender_phone || o.customer_phone,
        payment_method: o.payment_method,
        status: o.status,
        total_amount: Number(o.total_amount || 0),
        transaction_ref: o.transaction_ref || '',
        receipt_url: extractedReceiptUrl,
        notes: rawNotes,
        matched_transaction_id: o.matched_transaction_id || undefined,
        verified_at: o.verified_at || undefined,
        verified_by: verifiedBy,
        created_at: o.created_at || new Date().toISOString(),
        updated_at: o.updated_at || new Date().toISOString(),
        items
      };
    });

    // Merge DB orders with memory cache for complete dataset
    const memory = getMemoryOrders();
    const mergedMap = new Map<string, Order>();
    fetchedOrders.forEach(o => {
      // If DB return has empty items but memory order has items, preserve memory items!
      const memOrder = memory.find(m => m.id === o.id || m.order_code === o.order_code);
      if ((!o.items || o.items.length === 0) && memOrder?.items && memOrder.items.length > 0) {
        o.items = memOrder.items;
      }
      mergedMap.set(o.id, o);
    });
    memory.forEach(o => {
      if (!mergedMap.has(o.id)) mergedMap.set(o.id, o);
    });

    return Array.from(mergedMap.values());
  } catch (err) {
    console.warn('Error reading from Supabase:', err);
    return getMemoryOrders();
  }
}

export async function updateTransactionStatusInSupabase(txId: string, status: string = 'matched', matchedOrderId?: string): Promise<boolean> {
  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (matchedOrderId) {
      payload.matched_order_id = matchedOrderId;
    }

    const { error } = await supabase
      .from('store_transactions')
      .update(payload)
      .eq('id', txId);

    return !error;
  } catch (err) {
    console.error('Error updating transaction status in Supabase:', err);
    return false;
  }
}

export async function updateOrderStatusInSupabase(orderId: string, status: string, matchedTxId?: string, verifiedBy?: string): Promise<boolean> {
  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (status === 'auto_verified' || status === 'manual_verified') {
      payload.verified_at = new Date().toISOString();
      if (verifiedBy) payload.verified_by = verifiedBy;
    }
    if (matchedTxId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedTxId)) {
      payload.matched_transaction_id = matchedTxId;
    }

    let { error } = await supabase
      .from('store_orders')
      .update(payload)
      .eq('id', orderId);

    if (error && verifiedBy && (error.message.includes('verified_by') || error.message.includes('column'))) {
      delete payload.verified_by;
      const res = await supabase.from('store_orders').update(payload).eq('id', orderId);
      error = res.error;
    }

    if (matchedTxId) {
      await updateTransactionStatusInSupabase(matchedTxId, 'matched', orderId);
    }

    return !error;
  } catch (err) {
    console.error('Error updating status in Supabase:', err);
    return false;
  }
}

export async function saveTransactionToSupabase(tx: IncomingTransaction): Promise<boolean> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tx.id);
    const payload: any = {
      payment_method: tx.payment_method,
      amount: tx.amount,
      sender_phone: tx.sender_phone || null,
      sender_name: tx.sender_name || null,
      transaction_ref: tx.transaction_ref || null,
      status: tx.status,
      raw_sms: tx.raw_sms,
      received_at: tx.received_at || new Date().toISOString(),
      matched_order_id: (tx.matched_order_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tx.matched_order_id)) ? tx.matched_order_id : null
    };

    if (isUuid) {
      payload.id = tx.id;
    }

    const { data, error } = await supabase
      .from('store_transactions')
      .insert(payload)
      .select()
      .single();

    if (data?.id) {
      tx.id = data.id;
    }
    return !error;
  } catch (err) {
    console.error('Error saving transaction to Supabase:', err);
    return false;
  }
}

export async function fetchTransactionsFromSupabase(): Promise<IncomingTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('store_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return getMemoryTransactions();
    }

    return data.map((t: any) => ({
      id: t.id,
      payment_method: t.payment_method || 'vodafone_cash',
      amount: Number(t.amount || 0),
      sender_phone: t.sender_phone || undefined,
      sender_name: t.sender_name || undefined,
      transaction_ref: t.transaction_ref || undefined,
      matched_order_id: t.matched_order_id || undefined,
      status: t.status || 'unmatched',
      raw_sms: t.raw_sms || '',
      received_at: t.received_at || t.created_at || new Date().toISOString(),
      created_at: t.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Error fetching transactions from Supabase:', err);
    return getMemoryTransactions();
  }
}

// --- GATEWAY DEVICES PERSISTENCE HELPERS ---

export async function fetchDevicesFromSupabase(): Promise<GatewayDevice[]> {
  try {
    const { data, error } = await supabase
      .from('store_devices')
      .select('*')
      .order('last_ping', { ascending: false });

    if (error || !data || data.length === 0) {
      return getMemoryDevices();
    }

    const fourMinsAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const devices: GatewayDevice[] = data.map((d: any) => {
      const ping = d.last_ping || new Date().toISOString();
      let devStatus: 'online' | 'standby' | 'offline' = 'offline';
      if (ping >= fourMinsAgo) {
        devStatus = 'online';
      } else if (ping >= thirtyMinsAgo) {
        devStatus = 'standby';
      } else {
        devStatus = 'offline';
      }

      return {
        id: d.id,
        device_name: d.device_name || 'Android Device',
        phone_number: d.phone_number || undefined,
        battery_level: d.battery_level !== undefined ? Number(d.battery_level) : 100,
        status: devStatus,
        last_ping: ping,
        total_sms_processed: Number(d.total_sms_processed || 0),
        app_version: d.app_version || 'v2.5.0-android',
        created_at: d.created_at || new Date().toISOString()
      };
    });

    setMemoryDevices(devices);
    return devices;
  } catch (err) {
    console.warn('Error fetching devices from Supabase:', err);
    return getMemoryDevices();
  }
}

export async function upsertDevicePingInSupabase(device: Partial<GatewayDevice>): Promise<GatewayDevice> {
  const devId = device.id || 'dev-' + (device.device_name || 'android').toLowerCase().replace(/[^a-z0-9]/g, '-');
  const now = new Date().toISOString();
  
  const existing = getMemoryDevices();
  const found = existing.find(d => d.id === devId);

  // Preserve custom name set by admin if default generic name is passed
  const isGenericName = !device.device_name || device.device_name.startsWith('Android Phone') || device.device_name.startsWith('Android Device') || device.device_name.startsWith('Android Gateway');
  const finalName = (!isGenericName && device.device_name) ? device.device_name : (found?.device_name || device.device_name || 'Android Gateway Phone');

  const updatedDevice: GatewayDevice = {
    id: devId,
    device_name: finalName,
    phone_number: device.phone_number || found?.phone_number || '01015339426',
    battery_level: device.battery_level !== undefined ? device.battery_level : (found?.battery_level || 90),
    status: 'online',
    last_ping: now,
    total_sms_processed: (found?.total_sms_processed || 0) + (device.total_sms_processed || 0),
    app_version: device.app_version || found?.app_version || 'v2.5.0-android',
    created_at: found?.created_at || now
  };

  const filtered = existing.filter(d => d.id !== devId);
  setMemoryDevices([updatedDevice, ...filtered]);

  try {
    await supabase
      .from('store_devices')
      .upsert({
        id: updatedDevice.id,
        device_name: updatedDevice.device_name,
        phone_number: updatedDevice.phone_number,
        battery_level: updatedDevice.battery_level,
        status: 'online',
        last_ping: now,
        total_sms_processed: updatedDevice.total_sms_processed,
        app_version: updatedDevice.app_version
      });
  } catch (e) {
    console.warn('Failed to upsert device in Supabase:', e);
  }

  return updatedDevice;
}

export async function updateDeviceDetailsInSupabase(id: string, details: { device_name?: string; phone_number?: string }): Promise<GatewayDevice | null> {
  try {
    const existing = getMemoryDevices();
    const found = existing.find(d => d.id === id);

    const updatedName = details.device_name?.trim() || found?.device_name || 'Android Gateway Phone';
    const updatedPhone = details.phone_number !== undefined ? details.phone_number.trim() : (found?.phone_number || '01015339426');

    const updatedDevice: GatewayDevice = {
      id,
      device_name: updatedName,
      phone_number: updatedPhone,
      battery_level: found?.battery_level || 100,
      status: found?.status || 'online',
      last_ping: found?.last_ping || new Date().toISOString(),
      total_sms_processed: found?.total_sms_processed || 0,
      app_version: found?.app_version || 'v2.5.0-android',
      created_at: found?.created_at || new Date().toISOString()
    };

    const filtered = existing.filter(d => d.id !== id);
    setMemoryDevices([updatedDevice, ...filtered]);

    await supabase
      .from('store_devices')
      .update({
        device_name: updatedName,
        phone_number: updatedPhone
      })
      .eq('id', id);

    return updatedDevice;
  } catch (err) {
    console.error('Error updating device details in Supabase:', err);
    return null;
  }
}

export async function clearDevicesInSupabase(): Promise<boolean> {
  setMemoryDevices([]);
  try {
    await supabase.from('store_devices').delete().neq('id', '___none___');
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteDeviceInSupabase(id: string): Promise<boolean> {
  const existing = getMemoryDevices();
  setMemoryDevices(existing.filter(d => d.id !== id));
  try {
    await supabase.from('store_devices').delete().eq('id', id);
    return true;
  } catch (e) {
    return false;
  }
}

// Helper to save state to localStorage if in browser
export function syncLocalCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('grad_store_products', JSON.stringify(memoryProducts));
      localStorage.setItem('grad_store_orders', JSON.stringify(memoryOrders));
      localStorage.setItem('grad_store_settings', JSON.stringify(memorySettings));
      localStorage.setItem('grad_store_transactions', JSON.stringify(memoryTransactions));
      localStorage.setItem('grad_store_devices', JSON.stringify(memoryDevices));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}

export function loadLocalCache() {
  if (typeof window !== 'undefined') {
    try {
      const p = localStorage.getItem('grad_store_products');
      if (p) memoryProducts = JSON.parse(p);
      const o = localStorage.getItem('grad_store_orders');
      if (o) memoryOrders = JSON.parse(o);
      const s = localStorage.getItem('grad_store_settings');
      if (s) memorySettings = JSON.parse(s);
      const t = localStorage.getItem('grad_store_transactions');
      if (t) memoryTransactions = JSON.parse(t);
      const d = localStorage.getItem('grad_store_devices');
      if (d) memoryDevices = JSON.parse(d);
    } catch (e) {
      console.warn('LocalStorage load failed', e);
    }
  }
}

// Global getters / mutators used by API and Frontend
export function getMemoryProducts() {
  loadLocalCache();
  return memoryProducts;
}
export function setMemoryProducts(prods: Product[]) {
  memoryProducts = prods;
  syncLocalCache();
}

export function getMemoryOrders() {
  loadLocalCache();
  return memoryOrders;
}
export function setMemoryOrders(orders: Order[]) {
  memoryOrders = orders;
  syncLocalCache();
}

export function getMemorySettings() {
  loadLocalCache();
  return memorySettings;
}
export function setMemorySettings(settings: StoreSettings) {
  memorySettings = settings;
  syncLocalCache();
}

export function getMemoryTransactions() {
  loadLocalCache();
  return memoryTransactions;
}
export function setMemoryTransactions(txs: IncomingTransaction[]) {
  memoryTransactions = txs;
  syncLocalCache();
}

export function getMemoryDevices() {
  loadLocalCache();
  // recalculate online status dynamically
  const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  return memoryDevices.map(d => ({
    ...d,
    status: d.last_ping >= threeMinsAgo ? ('online' as const) : ('offline' as const)
  }));
}
export function setMemoryDevices(devs: GatewayDevice[]) {
  memoryDevices = devs;
  syncLocalCache();
}



