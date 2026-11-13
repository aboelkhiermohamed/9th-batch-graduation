import { supabase, supabaseAdmin } from './supabaseClient';
import { DeliveryZone, DeliveryZoneOrder, DeliveryItemSummary } from '@/types';
import fs from 'fs';
import path from 'path';

// Data file path for local persistence fallback if Supabase tables are not yet executed
const FALLBACK_DIR = path.join(process.cwd(), 'data');
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'delivery_zones.json');

// Table detection cache (re-checked every 60 seconds)
let tableStatusCache: { isAvailable: boolean; checkedAt: number } | null = null;

async function checkSupabaseTablesAvailable(): Promise<boolean> {
  const now = Date.now();
  if (tableStatusCache && now - tableStatusCache.checkedAt < 60000) {
    return tableStatusCache.isAvailable;
  }

  try {
    const client = supabaseAdmin || supabase;
    const { error } = await client.from('delivery_zones').select('id').limit(1);
    const isAvailable = !error || !error.message?.includes('schema cache');
    tableStatusCache = { isAvailable, checkedAt: now };
    return isAvailable;
  } catch (err) {
    tableStatusCache = { isAvailable: false, checkedAt: now };
    return false;
  }
}

// Helper to ensure fallback directory and file exist
function getFallbackData(): DeliveryZone[] {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_FILE)) {
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(FALLBACK_FILE, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading delivery zones fallback file:', err);
    return [];
  }
}

function saveFallbackData(zones: DeliveryZone[]): void {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(zones, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving delivery zones fallback file:', err);
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'z' + Date.now().toString(16).padStart(11, '0') + '-4000-8000-' + Math.random().toString(36).substring(2, 10);
}

// Helper to clean meta markers from product titles and customization text
export function cleanTextMeta(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/\[IMG:[\s\S]*?\]/gi, '')
    .replace(/\[ATTENDEES:[\s\S]*?\]/gi, '')
    .replace(/\[الإضافات:[\s\S]*?\]/gi, '')
    .replace(/\[التطريز:[\s\S]*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Format items into clean human-readable summary for printing & display
export function formatOrderItemsSummary(items: any[]): { summary: string; parsedItems: DeliveryItemSummary[] } {
  if (!items || items.length === 0) {
    return { summary: 'بدون تفاصيل', parsedItems: [] };
  }

  const parsedItems: DeliveryItemSummary[] = items.map(item => ({
    product_title: cleanTextMeta(item.product_title) || 'منتج',
    selected_size: item.selected_size ? cleanTextMeta(item.selected_size) : undefined,
    quantity: Number(item.quantity || 1),
    custom_text: item.custom_text ? cleanTextMeta(item.custom_text) : undefined,
    customization_option: item.customization_option ? cleanTextMeta(item.customization_option) : undefined
  }));

  const parts = parsedItems.map(item => {
    let text = `${item.product_title}`;
    const extras: string[] = [];
    if (item.selected_size && item.selected_size.trim()) {
      extras.push(`مقاس: ${item.selected_size.trim()}`);
    }
    if (item.quantity > 1) {
      extras.push(`كمية: ${item.quantity}`);
    }
    if (item.custom_text && item.custom_text.trim()) {
      extras.push(`تطريز: ${item.custom_text.trim()}`);
    } else if (item.customization_option && item.customization_option.trim()) {
      extras.push(`تخصيص: ${item.customization_option.trim()}`);
    }
    if (extras.length > 0) {
      text += ` (${extras.join(' | ')})`;
    }
    return text;
  });

  return {
    summary: parts.join(' + '),
    parsedItems
  };
}

// -------------------------------------------------------------
// 1. ORDER SEARCH (Lean query, directly on DB, bandwidth optimized)
// -------------------------------------------------------------
export async function searchOrderForZone(query: string): Promise<{
  order_id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  items_summary: string;
  items: DeliveryItemSummary[];
  status: string;
} | null> {
  const clean = query.trim().replace(/^#/, '');
  if (!clean) return null;

  const client = supabaseAdmin || supabase;

  // Search store_orders by ID, exact order_code, or prefixed GRAD-code
  let q = client
    .from('store_orders')
    .select('id, order_code, customer_name, customer_phone, status')
    .limit(1);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    q = q.eq('id', clean);
  } else {
    q = q.or(`order_code.eq.${clean},order_code.eq.GRAD-${clean},order_code.ilike.%${clean}%,customer_phone.ilike.%${clean}%,customer_name.ilike.%${clean}%`);
  }

  const { data: orders, error: orderErr } = await q;
  if (orderErr || !orders || orders.length === 0) {
    return null;
  }

  const foundOrder = orders[0];

  // Fetch only necessary item fields from store_order_items
  const { data: items } = await client
    .from('store_order_items')
    .select('product_title, selected_size, quantity, custom_text, customization_option')
    .eq('order_id', foundOrder.id);

  const { summary, parsedItems } = formatOrderItemsSummary(items || []);

  return {
    order_id: foundOrder.id,
    order_code: foundOrder.order_code,
    customer_name: foundOrder.customer_name,
    customer_phone: foundOrder.customer_phone,
    items_summary: summary,
    items: parsedItems,
    status: foundOrder.status
  };
}

// -------------------------------------------------------------
// 2. LIST DELIVERY ZONES (Lightweight summary for dashboard)
// -------------------------------------------------------------
export async function listDeliveryZones(): Promise<{ zones: DeliveryZone[]; isUsingFallback: boolean }> {
  const isAvailable = await checkSupabaseTablesAvailable();
  const client = supabaseAdmin || supabase;

  if (isAvailable) {
    try {
      const { data: zones, error } = await client
        .from('delivery_zones')
        .select(`
          id,
          name,
          created_by,
          created_at,
          updated_at,
          delivery_zone_orders (
            id,
            delivery_status
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && zones) {
        const mapped: DeliveryZone[] = zones.map((z: any) => {
          const zoneOrders = z.delivery_zone_orders || [];
          const total = zoneOrders.length;
          const delivered = zoneOrders.filter((zo: any) => zo.delivery_status === 'delivered').length;
          return {
            id: z.id,
            name: z.name,
            created_by: z.created_by,
            created_at: z.created_at,
            updated_at: z.updated_at,
            total_orders: total,
            delivered_orders: delivered,
            pending_orders: total - delivered
          };
        });
        return { zones: mapped, isUsingFallback: false };
      }
    } catch (err) {
      console.warn('Failed querying delivery_zones from Supabase, falling back to local storage:', err);
    }
  }

  // Fallback path
  const fallbackZones = getFallbackData();
  const mapped = fallbackZones.map(z => {
    const total = z.orders?.length || 0;
    const delivered = z.orders?.filter(o => o.delivery_status === 'delivered').length || 0;
    return {
      id: z.id,
      name: z.name,
      created_by: z.created_by,
      created_at: z.created_at,
      updated_at: z.updated_at,
      total_orders: total,
      delivered_orders: delivered,
      pending_orders: total - delivered
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { zones: mapped, isUsingFallback: true };
}

// -------------------------------------------------------------
// 3. GET SINGLE DELIVERY ZONE BY ID (Full detail with orders)
// -------------------------------------------------------------
export async function getDeliveryZoneById(zoneId: string): Promise<DeliveryZone | null> {
  const isAvailable = await checkSupabaseTablesAvailable();
  const client = supabaseAdmin || supabase;

  if (isAvailable) {
    try {
      const { data: zone, error } = await client
        .from('delivery_zones')
        .select('*')
        .eq('id', zoneId)
        .maybeSingle();

      if (!error && zone) {
        // Fetch zone orders joined with store_orders & store_order_items
        const { data: zoneOrders } = await client
          .from('delivery_zone_orders')
          .select(`
            id,
            zone_id,
            order_id,
            delivery_time,
            delivery_status,
            delivered_at,
            delivered_by,
            sort_order,
            created_at,
            updated_at,
            store_orders (
              id,
              order_code,
              customer_name,
              customer_phone,
              store_order_items (
                product_title,
                selected_size,
                quantity,
                custom_text,
                customization_option
              )
            )
          `)
          .eq('zone_id', zoneId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        const formattedOrders: DeliveryZoneOrder[] = (zoneOrders || []).map((zo: any) => {
          const storeOrder = zo.store_orders || {};
          const rawItems = storeOrder.store_order_items || [];
          const { summary, parsedItems } = formatOrderItemsSummary(rawItems);

          return {
            id: zo.id,
            zone_id: zo.zone_id,
            order_id: zo.order_id,
            order_code: storeOrder.order_code || 'ORD',
            customer_name: storeOrder.customer_name || 'عميل',
            customer_phone: storeOrder.customer_phone || '-',
            order_details: summary,
            items_summary: summary,
            items: parsedItems,
            delivery_time: zo.delivery_time || 'غير محدد',
            delivery_status: (zo.delivery_status as 'pending' | 'delivered') || 'pending',
            delivered_at: zo.delivered_at,
            delivered_by: zo.delivered_by,
            sort_order: zo.sort_order || 0,
            created_at: zo.created_at,
            updated_at: zo.updated_at
          };
        });

        const total = formattedOrders.length;
        const delivered = formattedOrders.filter(o => o.delivery_status === 'delivered').length;

        return {
          id: zone.id,
          name: zone.name,
          created_by: zone.created_by,
          created_at: zone.created_at,
          updated_at: zone.updated_at,
          total_orders: total,
          delivered_orders: delivered,
          pending_orders: total - delivered,
          orders: formattedOrders
        };
      }
    } catch (err) {
      console.warn('Error fetching zone from Supabase, falling back:', err);
    }
  }

  // Fallback path
  const fallbackZones = getFallbackData();
  const found = fallbackZones.find(z => z.id === zoneId);
  if (!found) return null;

  // Enrich order details with live store orders if needed
  if (found.orders && found.orders.length > 0) {
    const orderIds = found.orders.map(o => o.order_id).filter(Boolean);
    if (orderIds.length > 0) {
      try {
        const { data: dbOrders } = await client
          .from('store_orders')
          .select('id, order_code, customer_name, customer_phone')
          .in('id', orderIds);

        if (dbOrders && dbOrders.length > 0) {
          const orderMap = new Map(dbOrders.map(o => [o.id, o]));
          found.orders.forEach(o => {
            o.order_details = cleanTextMeta(o.order_details);
            o.items_summary = cleanTextMeta(o.items_summary);
            const live = orderMap.get(o.order_id);
            if (live) {
              o.order_code = live.order_code || o.order_code;
              o.customer_name = live.customer_name || o.customer_name;
              o.customer_phone = live.customer_phone || o.customer_phone;
            }
          });
        }
      } catch (e) {}
    }
  }

  const total = found.orders?.length || 0;
  const delivered = found.orders?.filter(o => o.delivery_status === 'delivered').length || 0;
  return {
    ...found,
    total_orders: total,
    delivered_orders: delivered,
    pending_orders: total - delivered
  };
}

// -------------------------------------------------------------
// 4. CREATE DELIVERY ZONE
// -------------------------------------------------------------
export async function createDeliveryZone(data: {
  name: string;
  created_by: string;
  orders: {
    order_id: string;
    delivery_time: string;
    order_code?: string;
    customer_name?: string;
    customer_phone?: string;
    order_details?: string;
    items_summary?: string;
    items?: DeliveryItemSummary[];
  }[];
}): Promise<DeliveryZone> {
  const zoneId = generateUUID();
  const now = new Date().toISOString();
  const client = supabaseAdmin || supabase;
  const isAvailable = await checkSupabaseTablesAvailable();

  // Deduplicate orders by order_id
  const seenOrderIds = new Set<string>();
  const uniqueOrders = data.orders.filter(o => {
    if (seenOrderIds.has(o.order_id)) return false;
    seenOrderIds.add(o.order_id);
    return true;
  });

  if (isAvailable) {
    try {
      const { data: newZone, error: zoneErr } = await client
        .from('delivery_zones')
        .insert({
          id: zoneId,
          name: data.name.trim(),
          created_by: data.created_by.trim() || 'Admin',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (!zoneErr && newZone) {
        if (uniqueOrders.length > 0) {
          const zoneOrdersPayload = uniqueOrders.map((o, idx) => ({
            id: generateUUID(),
            zone_id: zoneId,
            order_id: o.order_id,
            delivery_time: o.delivery_time || 'غير محدد',
            delivery_status: 'pending',
            sort_order: idx + 1,
            created_at: now,
            updated_at: now
          }));

          await client.from('delivery_zone_orders').insert(zoneOrdersPayload);
        }

        const fullZone = await getDeliveryZoneById(zoneId);
        if (fullZone) return fullZone;
      }
    } catch (err) {
      console.warn('Error inserting delivery zone into Supabase, saving to fallback:', err);
    }
  }

  // Fallback path
  const formattedOrders: DeliveryZoneOrder[] = uniqueOrders.map((o, idx) => ({
    id: generateUUID(),
    zone_id: zoneId,
    order_id: o.order_id,
    order_code: o.order_code || 'ORD',
    customer_name: o.customer_name || 'عميل',
    customer_phone: o.customer_phone || '-',
    order_details: o.order_details || o.items_summary || 'بدون تفاصيل',
    items_summary: o.items_summary || o.order_details || 'بدون تفاصيل',
    items: o.items || [],
    delivery_time: o.delivery_time || 'غير محدد',
    delivery_status: 'pending',
    delivered_at: null,
    delivered_by: null,
    sort_order: idx + 1,
    created_at: now,
    updated_at: now
  }));

  const newZoneObj: DeliveryZone = {
    id: zoneId,
    name: data.name.trim(),
    created_by: data.created_by.trim() || 'Admin',
    created_at: now,
    updated_at: now,
    total_orders: formattedOrders.length,
    delivered_orders: 0,
    pending_orders: formattedOrders.length,
    orders: formattedOrders
  };

  const zones = getFallbackData();
  zones.unshift(newZoneObj);
  saveFallbackData(zones);

  return newZoneObj;
}

// -------------------------------------------------------------
// 5. UPDATE DELIVERY ZONE (Name, reordering, adding/removing orders, preserving delivery status)
// -------------------------------------------------------------
export async function updateDeliveryZone(
  zoneId: string,
  data: {
    name?: string;
    orders?: {
      order_id: string;
      delivery_time: string;
      delivery_status?: 'pending' | 'delivered';
      delivered_at?: string | null;
      delivered_by?: string | null;
      order_code?: string;
      customer_name?: string;
      customer_phone?: string;
      order_details?: string;
      items_summary?: string;
      items?: DeliveryItemSummary[];
      sort_order?: number;
    }[];
  }
): Promise<DeliveryZone | null> {
  const now = new Date().toISOString();
  const client = supabaseAdmin || supabase;
  const isAvailable = await checkSupabaseTablesAvailable();

  if (isAvailable) {
    try {
      // 1. Update zone metadata
      if (data.name) {
        await client
          .from('delivery_zones')
          .update({ name: data.name.trim(), updated_at: now })
          .eq('id', zoneId);
      }

      // 2. If orders list is provided, update zone orders while preserving existing delivery status!
      if (data.orders) {
        // Fetch existing zone orders to preserve delivery statuses
        const { data: existingRows } = await client
          .from('delivery_zone_orders')
          .select('id, order_id, delivery_status, delivered_at, delivered_by')
          .eq('zone_id', zoneId);

        const existingMap = new Map((existingRows || []).map((r: any) => [r.order_id, r]));

        // Deduplicate new orders
        const seen = new Set<string>();
        const unique = data.orders.filter(o => {
          if (seen.has(o.order_id)) return false;
          seen.add(o.order_id);
          return true;
        });

        // Delete previous zone orders
        await client.from('delivery_zone_orders').delete().eq('zone_id', zoneId);

        // Re-insert with preserved statuses
        const newRows = unique.map((o, idx) => {
          const prev = existingMap.get(o.order_id);
          return {
            id: prev?.id || generateUUID(),
            zone_id: zoneId,
            order_id: o.order_id,
            delivery_time: o.delivery_time || 'غير محدد',
            delivery_status: prev?.delivery_status || o.delivery_status || 'pending',
            delivered_at: prev?.delivered_at || o.delivered_at || null,
            delivered_by: prev?.delivered_by || o.delivered_by || null,
            sort_order: o.sort_order || idx + 1,
            created_at: now,
            updated_at: now
          };
        });

        if (newRows.length > 0) {
          await client.from('delivery_zone_orders').insert(newRows);
        }
      }

      return await getDeliveryZoneById(zoneId);
    } catch (err) {
      console.warn('Error updating zone in Supabase, using fallback:', err);
    }
  }

  // Fallback path
  const zones = getFallbackData();
  const index = zones.findIndex(z => z.id === zoneId);
  if (index === -1) return null;

  const target = zones[index];
  if (data.name) target.name = data.name.trim();
  target.updated_at = now;

  if (data.orders) {
    const existingOrdersMap = new Map((target.orders || []).map(o => [o.order_id, o]));
    const seen = new Set<string>();

    const updatedOrders: DeliveryZoneOrder[] = [];
    data.orders.forEach((o, idx) => {
      if (seen.has(o.order_id)) return;
      seen.add(o.order_id);

      const prev = existingOrdersMap.get(o.order_id);
      updatedOrders.push({
        id: prev?.id || generateUUID(),
        zone_id: zoneId,
        order_id: o.order_id,
        order_code: o.order_code || prev?.order_code || 'ORD',
        customer_name: o.customer_name || prev?.customer_name || 'عميل',
        customer_phone: o.customer_phone || prev?.customer_phone || '-',
        order_details: o.order_details || o.items_summary || prev?.order_details || 'بدون تفاصيل',
        items_summary: o.items_summary || o.order_details || prev?.items_summary || 'بدون تفاصيل',
        items: o.items || prev?.items || [],
        delivery_time: o.delivery_time || prev?.delivery_time || 'غير محدد',
        delivery_status: prev?.delivery_status || o.delivery_status || 'pending',
        delivered_at: prev?.delivered_at || o.delivered_at || null,
        delivered_by: prev?.delivered_by || o.delivered_by || null,
        sort_order: o.sort_order || idx + 1,
        created_at: prev?.created_at || now,
        updated_at: now
      });
    });

    target.orders = updatedOrders;
    target.total_orders = updatedOrders.length;
    target.delivered_orders = updatedOrders.filter(o => o.delivery_status === 'delivered').length;
    target.pending_orders = target.total_orders - (target.delivered_orders || 0);
  }

  saveFallbackData(zones);
  return target;
}

// -------------------------------------------------------------
// 6. UPDATE ORDER DELIVERY STATUS (Mark as Delivered / Undo)
// -------------------------------------------------------------
export async function updateOrderDeliveryStatus(
  zoneId: string,
  orderIdOrZoneOrderId: string,
  status: 'delivered' | 'pending',
  adminName: string
): Promise<{ success: boolean; delivered_at?: string | null; delivered_by?: string | null }> {
  const now = new Date().toISOString();
  const delivered_at = status === 'delivered' ? now : null;
  const delivered_by = status === 'delivered' ? (adminName || 'Admin') : null;

  const client = supabaseAdmin || supabase;
  const isAvailable = await checkSupabaseTablesAvailable();

  if (isAvailable) {
    try {
      // Find the row by order_id or row id
      const { data: rows, error: findErr } = await client
        .from('delivery_zone_orders')
        .select('id')
        .eq('zone_id', zoneId)
        .or(`id.eq.${orderIdOrZoneOrderId},order_id.eq.${orderIdOrZoneOrderId}`)
        .limit(1);

      if (!findErr && rows && rows.length > 0) {
        const rowId = rows[0].id;
        const { error: updateErr } = await client
          .from('delivery_zone_orders')
          .update({
            delivery_status: status,
            delivered_at,
            delivered_by,
            updated_at: now
          })
          .eq('id', rowId);

        if (!updateErr) {
          return { success: true, delivered_at, delivered_by };
        }
      }
    } catch (err) {
      console.warn('Error updating delivery status in Supabase, updating fallback:', err);
    }
  }

  // Fallback path
  const zones = getFallbackData();
  const zone = zones.find(z => z.id === zoneId);
  if (!zone || !zone.orders) {
    return { success: false };
  }

  const targetOrder = zone.orders.find(
    o => o.id === orderIdOrZoneOrderId || o.order_id === orderIdOrZoneOrderId
  );

  if (!targetOrder) {
    return { success: false };
  }

  targetOrder.delivery_status = status;
  targetOrder.delivered_at = delivered_at;
  targetOrder.delivered_by = delivered_by;
  targetOrder.updated_at = now;

  zone.delivered_orders = zone.orders.filter(o => o.delivery_status === 'delivered').length;
  zone.pending_orders = (zone.total_orders || zone.orders.length) - zone.delivered_orders;
  zone.updated_at = now;

  saveFallbackData(zones);
  return { success: true, delivered_at, delivered_by };
}

// -------------------------------------------------------------
// 7. DELETE DELIVERY ZONE
// -------------------------------------------------------------
export async function deleteDeliveryZone(zoneId: string): Promise<boolean> {
  const client = supabaseAdmin || supabase;
  const isAvailable = await checkSupabaseTablesAvailable();

  if (isAvailable) {
    try {
      // Deleting the zone automatically cascades to delivery_zone_orders
      // Original store_orders are NOT touched!
      const { error } = await client.from('delivery_zones').delete().eq('id', zoneId);
      if (!error) return true;
    } catch (err) {
      console.warn('Error deleting zone from Supabase, removing from fallback:', err);
    }
  }

  const zones = getFallbackData();
  const filtered = zones.filter(z => z.id !== zoneId);
  saveFallbackData(filtered);
  return true;
}

