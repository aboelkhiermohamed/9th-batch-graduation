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
      if (item_id) {
        order.items = order.items.map(item => {
          if (item.id === item_id || item.product_id === item_id) {
            return { ...item, attendees };
          }
          return item;
        });
      } else {
        order.items[0].attendees = attendees;
      }
    }

    await updateOrderInSupabase(order);
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تحديث أسماء الحاضرين' }, { status: 500 });
  }
}
