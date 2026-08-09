import { normalizePhoneNumber } from './smsParser';
import { Order, IncomingTransaction } from '@/types';
import { 
  getMemoryOrders, 
  setMemoryOrders, 
  getMemoryProducts, 
  setMemoryProducts,
  getMemoryTransactions,
  setMemoryTransactions,
  fetchOrdersFromSupabase,
  updateOrderStatusInSupabase
} from './supabaseClient';

export interface MatchResult {
  matched: boolean;
  orderId?: string;
  orderCode?: string;
  customerName?: string;
  message: string;
}

/**
 * Attempts to match an incoming parsed transaction against pending orders.
 */
export async function matchTransactionWithOrders(tx: IncomingTransaction): Promise<MatchResult> {
  const orders = await fetchOrdersFromSupabase();
  const pendingOrders = orders.filter(o => o.status === 'pending');

  if (pendingOrders.length === 0) {
    return { matched: false, message: 'No pending orders found' };
  }

  const cleanTxPhone = tx.sender_phone ? normalizePhoneNumber(tx.sender_phone) : '';
  const txRefClean = tx.transaction_ref ? tx.transaction_ref.trim().toLowerCase() : '';

  let matchedOrder: Order | undefined = undefined;

  // 1. Highest Priority: Match by Transaction Reference Number (الرقم المرجعي)
  if (txRefClean) {
    matchedOrder = pendingOrders.find(o => {
      if (!o.transaction_ref) return false;
      const oRef = o.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const tRef = txRefClean.replace(/[^a-z0-9]/g, '');
      return oRef === tRef || (oRef.length > 5 && (tRef.includes(oRef) || oRef.includes(tRef)));
    });
  }

  // 2. Second Priority: Amount + Phone Match
  if (!matchedOrder) {
    for (const order of pendingOrders) {
      const amountDiff = Math.abs(Number(order.total_amount) - Number(tx.amount));
      const isAmountMatch = amountDiff < 0.01 || tx.amount === 0;

      const cleanCustomerPhone = normalizePhoneNumber(order.customer_phone);
      const cleanSenderPhone = order.sender_phone ? normalizePhoneNumber(order.sender_phone) : '';

      const phoneMatches = 
        (cleanTxPhone && cleanCustomerPhone && (cleanTxPhone === cleanCustomerPhone || cleanTxPhone.endsWith(cleanCustomerPhone.slice(-7)))) ||
        (cleanTxPhone && cleanSenderPhone && (cleanTxPhone === cleanSenderPhone || cleanTxPhone.endsWith(cleanSenderPhone.slice(-7)))) ||
        (tx.raw_sms && cleanCustomerPhone && cleanCustomerPhone.length >= 7 && tx.raw_sms.includes(cleanCustomerPhone.slice(-8)));

      if (isAmountMatch && phoneMatches) {
        matchedOrder = order;
        break;
      }
    }
  }

  // 3. Third Priority: Phone match alone if only 1 pending order for that phone
  if (!matchedOrder) {
    for (const order of pendingOrders) {
      const cleanCustomerPhone = normalizePhoneNumber(order.customer_phone);
      if (cleanCustomerPhone && cleanCustomerPhone.length >= 7) {
        if (
          (cleanTxPhone && (cleanTxPhone === cleanCustomerPhone || cleanTxPhone.endsWith(cleanCustomerPhone.slice(-7)))) ||
          (tx.raw_sms && tx.raw_sms.includes(cleanCustomerPhone.slice(-8)))
        ) {
          matchedOrder = order;
          break;
        }
      }
    }
  }

  // 4. Fallback: If amount matches only 1 single pending order
  if (!matchedOrder) {
    const amountMatches = pendingOrders.filter(
      o => Math.abs(Number(o.total_amount) - Number(tx.amount)) < 0.01
    );
    if (amountMatches.length === 1) {
      matchedOrder = amountMatches[0];
    }
  }

  if (matchedOrder) {
    // Update order status in memory & Supabase
    const updatedOrders = orders.map(o => {
      if (o.id === matchedOrder!.id) {
        return {
          ...o,
          status: 'auto_verified' as const,
          matched_transaction_id: tx.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      return o;
    });

    setMemoryOrders(updatedOrders);
    await updateOrderStatusInSupabase(matchedOrder.id, 'auto_verified', tx.id);

    // Update transaction status
    tx.matched_order_id = matchedOrder.id;
    tx.status = 'matched';
    const txs = getMemoryTransactions();
    setMemoryTransactions([tx, ...txs.filter(t => t.id !== tx.id)]);

    // Decrement stock for ordered products
    if (matchedOrder.items) {
      const products = getMemoryProducts();
      const updatedProducts = products.map(p => {
        const item = matchedOrder!.items?.find(i => i.product_id === p.id);
        if (item) {
          return {
            ...p,
            stock: Math.max(0, p.stock - item.quantity)
          };
        }
        return p;
      });
      setMemoryProducts(updatedProducts);
    }

    return {
      matched: true,
      orderId: matchedOrder.id,
      orderCode: matchedOrder.order_code,
      customerName: matchedOrder.customer_name,
      message: `Successfully auto-verified payment via Supabase for order #${matchedOrder.order_code}`
    };
  }

  return {
    matched: false,
    message: `No matching pending order found for amount ${tx.amount} EGP`
  };
}

