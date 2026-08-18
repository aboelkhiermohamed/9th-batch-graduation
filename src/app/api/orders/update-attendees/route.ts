import { NextRequest, NextResponse } from 'next/server';
import { fetchOrdersFromSupabase, updateOrderInSupabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, order_code, item_id, attendees } = body;

    if ((!order_id && !order_code) || !attendees || !Array.isArray(attendees)) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    const orders = await fetchOrdersFromSupabase();
    const order = orders.find(o => (order_id && o.id === order_id) || (order_code && o.order_code === order_code));

    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    if (order.items && order.items.length > 0) {
      order.items = order.items.map((item, idx) => {
        if (!item_id || item.id === item_id || item.product_id === item_id || idx === 0) {
          let cleanOpt = item.customization_option || '';
          cleanOpt = cleanOpt.replace(/\[ATTENDEES:[\s\S]*?\]\]?/g, '').trim();
          return {
            ...item,
            customization_option: cleanOpt || undefined,
            attendees
          };
        }
        return item;
      });
    }

    await updateOrderInSupabase(order);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تحديث أسماء الحاضرين' }, { status: 500 });
  }
}
