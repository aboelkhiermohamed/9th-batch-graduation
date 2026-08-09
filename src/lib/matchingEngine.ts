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
  fetchTransactionsFromSupabase,
  updateOrderStatusInSupabase,
  supabase
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

/**
 * Attempts to match a newly submitted Order against existing UNMATCHED incoming SMS transactions.
 * Handles the scenario where SMS arrived BEFORE order submission (e.g. while customer was on checkout page).
 */
export async function matchOrderWithUnmatchedTransactions(newOrder: Order): Promise<{ matched: boolean; matchedTx?: IncomingTransaction }> {
  try {
    const transactions = await fetchTransactionsFromSupabase();
    const unmatchedTxs = transactions.filter(t => t.status === 'unmatched' || !t.matched_order_id);

    if (unmatchedTxs.length === 0) {
      return { matched: false };
    }

    const cleanCustomerPhone = normalizePhoneNumber(newOrder.customer_phone);
    const cleanSenderPhone = newOrder.sender_phone ? normalizePhoneNumber(newOrder.sender_phone) : cleanCustomerPhone;
    const cleanRef = newOrder.transaction_ref ? newOrder.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    let matchedTx: IncomingTransaction | undefined = undefined;

    // 1. Priority 1: Match by Transaction Reference Number (الرقم المرجعي)
    if (cleanRef) {
      matchedTx = unmatchedTxs.find(tx => {
        if (tx.transaction_ref) {
          const tRef = tx.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (tRef === cleanRef || (cleanRef.length > 5 && (tRef.includes(cleanRef) || cleanRef.includes(tRef)))) return true;
        }
        if (tx.raw_sms) {
          const rawClean = tx.raw_sms.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (rawClean.includes(cleanRef)) return true;
        }
        return false;
      });
    }

    // 2. Priority 2: Amount + Phone Match
    if (!matchedTx) {
      for (const tx of unmatchedTxs) {
        const amountDiff = Math.abs(Number(newOrder.total_amount) - Number(tx.amount));
        const isAmountMatch = amountDiff < 0.01 || tx.amount === 0;

        const cleanTxPhone = tx.sender_phone ? normalizePhoneNumber(tx.sender_phone) : '';

        const phoneMatches =
          (cleanTxPhone && cleanCustomerPhone && (cleanTxPhone === cleanCustomerPhone || cleanTxPhone.endsWith(cleanCustomerPhone.slice(-7)))) ||
          (cleanTxPhone && cleanSenderPhone && (cleanTxPhone === cleanSenderPhone || cleanTxPhone.endsWith(cleanSenderPhone.slice(-7)))) ||
          (tx.raw_sms && cleanCustomerPhone && cleanCustomerPhone.length >= 7 && tx.raw_sms.includes(cleanCustomerPhone.slice(-8))) ||
          (tx.raw_sms && cleanSenderPhone && cleanSenderPhone.length >= 7 && tx.raw_sms.includes(cleanSenderPhone.slice(-8)));

        if (isAmountMatch && phoneMatches) {
          matchedTx = tx;
          break;
        }
      }
    }

    // 3. Priority 3: Amount match if only 1 unmatched transaction has that exact amount
    if (!matchedTx) {
      const amountMatches = unmatchedTxs.filter(
        tx => Math.abs(Number(tx.amount) - Number(newOrder.total_amount)) < 0.01
      );
      if (amountMatches.length === 1) {
        matchedTx = amountMatches[0];
      }
    }

    if (matchedTx) {
      newOrder.status = 'auto_verified';
      newOrder.matched_transaction_id = matchedTx.id;
      newOrder.verified_at = new Date().toISOString();
      newOrder.updated_at = new Date().toISOString();

      // Mark transaction as matched
      matchedTx.status = 'matched';
      matchedTx.matched_order_id = newOrder.id;

      // Update memory state
      const currentTxs = getMemoryTransactions();
      const updatedTxs = currentTxs.map(t => t.id === matchedTx!.id ? { ...t, status: 'matched' as const, matched_order_id: newOrder.id } : t);
      setMemoryTransactions(updatedTxs);

      return { matched: true, matchedTx };
    }

    return { matched: false };
  } catch (err) {
    console.error('Error matching order with unmatched transactions:', err);
    return { matched: false };
  }
}

