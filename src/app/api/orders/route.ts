import { NextRequest, NextResponse } from 'next/server';
import { Order, OrderItem } from '@/types';
import { 
  getMemoryOrders, 
  setMemoryOrders, 
  saveOrderToSupabase, 
  fetchOrdersFromSupabase, 
  updateOrderStatusInSupabase,
  fetchSettingsFromSupabase,
  clearOrdersInSupabase,
  deleteOrderFromSupabase
} from '@/lib/supabaseClient';
import { matchOrderWithUnmatchedTransactions } from '@/lib/matchingEngine';
import { isValidEgyptianPhone, normalizePhoneNumber } from '@/lib/smsParser';

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

    const cleanCustomerPhone = normalizePhoneNumber(customerPhone);

    if (!isValidEgyptianPhone(cleanCustomerPhone)) {
      return NextResponse.json(
        { error: 'رقم الموبايل غير صحيح. ينبغي إدخال رقم موبايل مصري مكون من 11 رقماً يبدأ بـ (010, 011, 012, 015)' },
        { status: 400 }
      );
    }

    const cleanSenderPhone = senderPhone && senderPhone.trim() ? normalizePhoneNumber(senderPhone) : cleanCustomerPhone;

    const orderId = generateUUID();
    const orderCode = 'GRAD-' + Math.floor(10000 + Math.random() * 90000);

    let itemsSum = 0;
    const orderItems: OrderItem[] = items.map((item: any, idx: number) => {
      const price = Number(item.unit_price || item.product?.price || 0);
      const qty = Number(item.quantity || 1);
      itemsSum += price * qty;

      const imgUrl = item.image_url || item.product?.image_url || (Array.isArray(item.product?.images) ? item.product.images[0] : undefined);
      const title = item.product_title || item.product?.title_ar || item.product?.title || 'منتج التخرج';

      return {
        id: generateUUID(),
        order_id: orderId,
        product_id: item.product_id || item.product?.id || undefined,
        product_title: title,
        image_url: imgUrl,
        selected_size: item.selectedSize || item.selected_size,
        custom_text: item.customText || item.custom_text || null,
        customization_option: item.customizationOption || item.customization_option || null,
        selected_addons: item.selected_addons || item.selectedAddons || undefined,
        attendees: item.attendees && Array.isArray(item.attendees) ? item.attendees : undefined,
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
      customer_phone: cleanCustomerPhone,
      sender_phone: cleanSenderPhone,
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

    // 0. Duplicate Transaction Ref Protection:
    // Check if transaction_ref was already used in a previously verified order
    if (newOrder.transaction_ref && newOrder.transaction_ref.trim().length >= 4) {
      const cleanRef = newOrder.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const existingOrders = await fetchOrdersFromSupabase();
      const isRefAlreadyUsed = existingOrders.some(o => {
        if (o.id === newOrder.id) return false;
        if (!o.transaction_ref) return false;
        const oRef = o.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const isVerified = o.status === 'auto_verified' || o.status === 'manual_verified' || o.status === 'ready_for_pickup' || o.status === 'delivered';
        return isVerified && oRef === cleanRef;
      });

      if (isRefAlreadyUsed) {
        console.warn(`[Order Security Warning] Duplicate transaction_ref detected: "${newOrder.transaction_ref}" for order #${newOrder.order_code}`);
        newOrder.notes = `[DUPLICATE_REF_WARNING: الرقم المرجعي (${newOrder.transaction_ref}) مستخدم سابقاً في طلب آخر مؤكد] ${newOrder.notes || ''}`;
      } else {
        // Auto-verify immediately if the payment SMS arrived BEFORE order submission (while on checkout page)
        await matchOrderWithUnmatchedTransactions(newOrder);
      }
    } else {
      await matchOrderWithUnmatchedTransactions(newOrder);
    }

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
    const cleanQuery = rawQuery.replace(/^#/, '').trim();
    const cleanPhone = normalizePhoneNumber(rawQuery);
    const digitsOnly = rawQuery.replace(/[^0-9]/g, '');
    const queryDigits = cleanPhone || digitsOnly;

    const found = orders.filter(o => {
      const p1 = normalizePhoneNumber(o.customer_phone || '');
      const p2 = normalizePhoneNumber(o.sender_phone || '');
      const rawP1 = (o.customer_phone || '').replace(/[^0-9]/g, '');
      const rawP2 = (o.sender_phone || '').replace(/[^0-9]/g, '');
      const ref = (o.transaction_ref || '').toLowerCase();
      const oCode = (o.order_code || '').toLowerCase();

      if (oCode === rawQuery || oCode === cleanQuery || `#${oCode}` === rawQuery || ref === rawQuery || ref === cleanQuery || oCode.includes(cleanQuery)) return true;
      if (queryDigits.length >= 6) {
        return p1.includes(queryDigits) || p2.includes(queryDigits) || 
               rawP1.includes(queryDigits) || rawP2.includes(queryDigits) ||
               p1.endsWith(queryDigits) || p2.endsWith(queryDigits);
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (orderId) {
      const success = await deleteOrderFromSupabase(orderId);
      return NextResponse.json({
        success,
        message: success ? 'تم حذف الطلب بنجاح 🗑️' : 'فشل حذف الطلب من قاعدة البيانات'
      });
    }

    const success = await clearOrdersInSupabase();
    return NextResponse.json({
      success,
      message: success ? 'تم تصفير وحذف كافة الطلبات والمعاملات بنجاح من قاعدة البيانات 🧹' : 'حدث خطأ أثناء تصفير الطلبات'
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/orders:', err);
    return NextResponse.json(
      { error: 'فشل عملية الحذف', message: err.message },
      { status: 500 }
    );
  }
}


