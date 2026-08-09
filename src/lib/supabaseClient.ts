import { createClient } from '@supabase/supabase-js';
import { Product, Order, StoreSettings, IncomingTransaction, OrderItem, GatewayDevice } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gthedzjjumbxdaxmehqb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- INITIAL FALLBACK / SEED DATA ---
export const DEFAULT_SETTINGS: StoreSettings = {
  id: 'default',
  store_name: '9th batch graduation',
  vodafone_cash_numbers: ['01015339426'],
  instapay_ipa: '9thbatch@instapay',
  pickup_note: 'تابع جروب التليجرام',
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

// --- SUPABASE DATABASE PERSISTENCE HELPERS ---

export async function fetchProductsFromSupabase(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('store_products')
      .select('*')
      .order('created_at', { ascending: true });

    let dbProds: Product[] = [];
    if (!error && data && data.length > 0) {
      dbProds = data.map((p: any) => ({
        id: p.id,
        title: p.title || p.title_ar,
        title_ar: p.title_ar || p.title,
        description: p.description || '',
        description_ar: p.description_ar || '',
        price: Number(p.price || 0),
        category: p.category || 'Apparel',
        image_url: p.image_url || '',
        images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images) : [p.image_url]),
        size_chart_url: p.size_chart_url || undefined,
        has_customization: Boolean(p.has_customization),
        customization_label: p.customization_label || undefined,
        sizes: Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? JSON.parse(p.sizes) : []),
        addons: Array.isArray(p.addons) ? p.addons : (typeof p.addons === 'string' ? JSON.parse(p.addons) : []),
        stock: Number(p.stock || 0),
        is_active: Boolean(p.is_active),
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString()
      }));
    }

    const currentMemory = getMemoryProducts();
    const dbIds = new Set(dbProds.map(p => p.id));
    const extraLocal = currentMemory.filter(p => !dbIds.has(p.id));
    const finalProducts = [...dbProds, ...extraLocal];

    if (finalProducts.length > 0) {
      setMemoryProducts(finalProducts);
      return finalProducts;
    }

    return getMemoryProducts();
  } catch (err) {
    console.warn('Error reading products from Supabase:', err);
    return getMemoryProducts();
  }
}

export async function saveProductToSupabase(product: Product): Promise<boolean> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);

  const current = getMemoryProducts();
  const idx = current.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    current[idx] = product;
  } else {
    current.unshift(product);
  }
  setMemoryProducts([...current]);

  try {
    const payload: any = {
      title: product.title,
      title_ar: product.title_ar,
      description: product.description || '',
      description_ar: product.description_ar || '',
      price: product.price,
      category: product.category,
      image_url: product.image_url,
      images: product.images || [product.image_url],
      size_chart_url: product.size_chart_url || null,
      has_customization: product.has_customization || false,
      customization_label: product.customization_label || null,
      sizes: product.sizes,
      stock: product.stock,
      is_active: product.is_active
    };

    if (isUuid) {
      payload.id = product.id;
    }

    if (product.addons && product.addons.length > 0) {
      payload.addons = product.addons;
    }

    const { data, error } = await supabase
      .from('store_products')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase product insert warning:', error.message);
      if (error.message.includes('addons')) {
        delete payload.addons;
        const { data: retryData } = await supabase
          .from('store_products')
          .insert(payload)
          .select()
          .single();
        if (retryData?.id) {
          product.id = retryData.id;
        }
      }
    } else if (data?.id) {
      product.id = data.id;
    }

    // Refresh memory list with assigned UUID
    const updatedList = getMemoryProducts().map(p => p.id === payload.id ? { ...p, id: product.id } : p);
    setMemoryProducts(updatedList);

    return !error;
  } catch (err) {
    console.error('Failed to insert product into Supabase:', err);
    return false;
  }
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

    const settings: StoreSettings = {
      id: data.id,
      store_name: data.store_name,
      vodafone_cash_numbers: Array.isArray(data.vodafone_cash_numbers) 
        ? data.vodafone_cash_numbers 
        : (typeof data.vodafone_cash_numbers === 'string' ? JSON.parse(data.vodafone_cash_numbers) : ['01015339426']),
      instapay_ipa: data.instapay_ipa,
      pickup_note: data.pickup_note,
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
  try {
    const { error } = await supabase
      .from('store_settings')
      .upsert({
        id: 'default',
        store_name: settings.store_name,
        vodafone_cash_numbers: settings.vodafone_cash_numbers,
        instapay_ipa: settings.instapay_ipa,
        pickup_note: settings.pickup_note,
        updated_at: new Date().toISOString()
      });

    return !error;
  } catch (err) {
    console.error('Failed to save settings in Supabase:', err);
    return false;
  }
}

export async function saveOrderToSupabase(order: Order): Promise<boolean> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
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
      notes: order.notes || null
    };

    if (isUuid) {
      orderPayload.id = order.id;
    }

    let { data: insertedOrder, error: orderError } = await supabase
      .from('store_orders')
      .insert(orderPayload)
      .select()
      .single();

    // Fallback: If receipt_url column is not created in Supabase yet, retry without receipt_url
    if (orderError && orderPayload.receipt_url) {
      console.warn('Supabase store_orders insert warning (retrying without receipt_url):', orderError.message);
      delete orderPayload.receipt_url;
      const retryRes = await supabase
        .from('store_orders')
        .insert(orderPayload)
        .select()
        .single();
      insertedOrder = retryRes.data;
      orderError = retryRes.error;
    }

    if (orderError) {
      console.warn('Supabase store_orders insert final error:', orderError.message);
      // Still return true because order is already saved in memory!
    }

    if (insertedOrder?.id) {
      order.id = insertedOrder.id;
    }

    // Insert items into store_order_items
    if (order.items && order.items.length > 0) {
      const productsList = getMemoryProducts();
      const defaultUuid = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';

      const itemsPayload = order.items.map(item => {
        let pId = item.product_id || item.product?.id;
        if (!pId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pId)) {
          const match = productsList.find(p => p.title_ar === item.product_title || p.title === item.product_title);
          pId = (match && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)) ? match.id : defaultUuid;
        }

        return {
          order_id: order.id,
          product_id: pId,
          product_title: item.product_title || item.product?.title_ar || item.product?.title || 'منتج التخرج',
          selected_size: item.selected_size || (item as any).selectedSize || null,
          custom_text: item.custom_text || (item as any).customText || null,
          customization_option: item.customization_option || (item as any).customizationOption || null,
          quantity: item.quantity,
          unit_price: item.unit_price
        };
      });

      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase
          .from('store_order_items')
          .insert(itemsPayload);

        if (itemsError) {
          console.warn('Supabase store_order_items insert warning:', itemsError.message);
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

    const fetchedOrders: Order[] = dbOrders.map((o: any) => ({
      id: o.id,
      order_code: o.order_code,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      sender_phone: o.sender_phone || o.customer_phone,
      payment_method: o.payment_method,
      status: o.status,
      total_amount: Number(o.total_amount || 0),
      transaction_ref: o.transaction_ref || '',
      receipt_url: o.receipt_url || undefined,
      notes: o.notes || '',
      matched_transaction_id: o.matched_transaction_id || undefined,
      verified_at: o.verified_at || undefined,
      created_at: o.created_at || new Date().toISOString(),
      updated_at: o.updated_at || new Date().toISOString(),
      items: (o.store_order_items || []).map((item: any) => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        product_title: item.product_title,
        selected_size: item.selected_size,
        custom_text: item.custom_text || undefined,
        customization_option: item.customization_option || undefined,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0)
      }))
    }));

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

export async function updateOrderStatusInSupabase(orderId: string, status: string, matchedTxId?: string): Promise<boolean> {
  try {
    const payload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (status === 'auto_verified' || status === 'manual_verified') {
      payload.verified_at = new Date().toISOString();
    }
    if (matchedTxId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedTxId)) {
      payload.matched_transaction_id = matchedTxId;
    }

    const { error } = await supabase
      .from('store_orders')
      .update(payload)
      .eq('id', orderId);

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

    const threeMinsAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const devices: GatewayDevice[] = data.map((d: any) => ({
      id: d.id,
      device_name: d.device_name || 'Android Device',
      phone_number: d.phone_number || undefined,
      battery_level: d.battery_level !== undefined ? Number(d.battery_level) : 100,
      status: (d.last_ping >= threeMinsAgo) ? 'online' : 'offline',
      last_ping: d.last_ping || new Date().toISOString(),
      total_sms_processed: Number(d.total_sms_processed || 0),
      app_version: d.app_version || '1.0.0',
      created_at: d.created_at || new Date().toISOString()
    }));

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

  const updatedDevice: GatewayDevice = {
    id: devId,
    device_name: device.device_name || found?.device_name || 'Android Gateway Phone',
    phone_number: device.phone_number || found?.phone_number || '01015339426',
    battery_level: device.battery_level !== undefined ? device.battery_level : (found?.battery_level || 90),
    status: 'online',
    last_ping: now,
    total_sms_processed: (found?.total_sms_processed || 0) + (device.total_sms_processed || 0),
    app_version: device.app_version || found?.app_version || 'v2.4.0-android',
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



