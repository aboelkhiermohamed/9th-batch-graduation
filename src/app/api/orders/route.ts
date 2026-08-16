import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderItem } from '@/types';
import { 
  getMemoryOrders, 
  setMemoryOrders, 
  saveOrderToSupabase, 
  fetchOrdersFromSupabase, 
  updateOrderStatusInSupabase,
  fetchSettingsFromSupabase
} from '@/lib/supabaseClient';
import { matchOrderWithUnmatchedTransactions } from '@/lib/matchingEngine';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'f' + Date.now().toString(16).padStart(11, '0') + '-4000-8000-000000000000';
}

export async function POST(req: NextRequest) {
  try {
    const settings = await fetchSettingsFromSupabase();
    if (settings && settings.maintenance_mode) {
      return NextResponse.json(
        { error: 'عفواً، المتجر في وضع الصيانة والتحديث حالياً، تم تعليق استقبال الطلبات الجديدة مؤقتاً' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { customerName, customerPhone, senderPhone, transactionRef, paymentMethod, items, notes, receiptUrl, receipt_url, totalAmount: customTotal, total_amount } = body;

    if (!customerName?.trim() || !customerPhone?.trim() || !transactionRef?.trim() || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'جميع البيانات مطلوبة: الاسم بالكامل، رقم الموبايل، والرقم المرجعي للمعاملة/العملية' },
        { status: 400 }
      );
    }

    const orderId = generateUUID();
    const orderCode = 'GRAD-' + Math.floor(10000 + Math.random() * 90000);

    let itemsSum = 0;
    const orderItems: OrderItem[] = items.map((item: any, idx: number) => {
      const price = Number(item.unit_price || item.product?.price || 0);
      const qty = Number(item.quantity || 1);
      itemsSum += price * qty;

      const imgUrl = item.image_url || item.product?.image_url || (Array.isArray(item.product?.images) ? item.product.images[0] : undefined);

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product_id || item.product?.id,
        product_title: item.product_title || item.product?.title_ar || item.product?.title,
        image_url: imgUrl,
        selected_size: item.selectedSize || item.selected_size,
        custom_text: item.customText || item.custom_text || null,
        customization_option: item.customizationOption || item.customization_option || null,
        quantity: qty,
        unit_price: price,
        product: item.product
      };
    });

    const overrideTotal = customTotal || total_amount;
    const totalAmount = (overrideTotal && Number(overrideTotal) > 0) ? Number(overrideTotal) : itemsSum;

    const newOrder: Order = {
      id: orderId,
      order_code: orderCode,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      sender_phone: senderPhone?.trim() || customerPhone.trim(),
      transaction_ref: transactionRef.trim(),
      payment_method: paymentMethod || 'vodafone_cash',
      receipt_url: receiptUrl || receipt_url || undefined,
      status: 'pending',
      total_amount: totalAmount,
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: orderItems
    };

    // 0. Auto-verify immediately if the payment SMS arrived BEFORE order submission (while on checkout page)
    await matchOrderWithUnmatchedTransactions(newOrder);

    // 1. Save locally
    const existingOrders = getMemoryOrders();
    setMemoryOrders([newOrder, ...existingOrders]);

    // 2. Persist to Supabase Database
    await saveOrderToSupabase(newOrder);

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: 'تم تسجيل الطلب بنجاح وهو قيد التحقق التلقائي الآن عبر Supabase.'
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: 'فشل إرسال الطلب', message: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const phone = searchParams.get('phone') || searchParams.get('search');
  const orderId = searchParams.get('id');

  const orders = await fetchOrdersFromSupabase();

  if (orderId) {
    const found = orders.find(o => o.id === orderId);
    return NextResponse.json(found || null);
  }

  if (code) {
    const found = orders.find(o => o.order_code.toLowerCase() === code.trim().toLowerCase());
    return NextResponse.json(found ? [found] : []);
  }

  if (phone && phone.trim()) {
    const rawQuery = phone.trim().toLowerCase();
    const cleanPhone = rawQuery.replace(/[^0-9]/g, '');

    const found = orders.filter(o => {
      const p1 = (o.customer_phone || '').replace(/[^0-9]/g, '');
      const p2 = (o.sender_phone || '').replace(/[^0-9]/g, '');
      const ref = (o.transaction_ref || '').toLowerCase();
      const oCode = (o.order_code || '').toLowerCase();

      if (oCode === rawQuery || ref === rawQuery) return true;
      if (cleanPhone.length >= 7) {
        return p1.endsWith(cleanPhone) || p2.endsWith(cleanPhone) || p1 === cleanPhone;
      }
      return false;
    });
    return NextResponse.json(found);
  }

  return NextResponse.json(orders);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status, matchedTransactionId, matched_transaction_id, verifiedBy, verified_by } = body;
    const txId = matchedTransactionId || matched_transaction_id;
    const vBy = verifiedBy || verified_by;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    const orders = getMemoryOrders();
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          matched_transaction_id: txId || o.matched_transaction_id,
          verified_at: (status === 'manual_verified' || status === 'auto_verified') ? (o.verified_at || new Date().toISOString()) : o.verified_at,
          verified_by: vBy || o.verified_by,
          updated_at: new Date().toISOString()
        };
      }
      return o;
    });

    setMemoryOrders(updated);

    // Update in Supabase
    await updateOrderStatusInSupabase(orderId, status, txId, vBy);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

