import { normalizePhoneNumber } from './smsParser';
import { Order, IncomingTransaction, OrderStatus } from '@/types';
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
  updateOrderInSupabase,
  updateTransactionStatusInSupabase,
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
  const pendingOrders = orders.filter(
    o => o.status === 'pending' || o.status === 'pending_difference' || (o.is_difference_pending && (o.difference_amount || 0) > 0)
  );

  if (pendingOrders.length === 0) {
    return { matched: false, message: 'No pending orders or partial invoices found' };
  }

  const cleanTxPhone = tx.sender_phone ? normalizePhoneNumber(tx.sender_phone) : '';
  const txRefClean = tx.transaction_ref ? tx.transaction_ref.trim().toLowerCase() : '';

  let matchedOrder: Order | undefined = undefined;

  // Helper to get expected amount for matching (difference_amount if pending difference, else total_amount)
  const getExpectedAmount = (o: Order) => {
    if ((o.is_difference_pending || o.status === 'pending_difference') && o.difference_amount && o.difference_amount > 0) {
      return o.difference_amount;
    }
    return o.total_amount;
  };

  // 1. Highest Priority: Match by Transaction Reference Number (الرقم المرجعي)
  for (const o of pendingOrders) {
    if (!o.transaction_ref) continue;
    const oRef = o.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!oRef || oRef.length < 4) continue;

    if (txRefClean) {
      const tRef = txRefClean.replace(/[^a-z0-9]/g, '');
      if (oRef === tRef || (oRef.length > 5 && (tRef.includes(oRef) || oRef.includes(tRef)))) {
        matchedOrder = o;
        break;
      }
    }
    if (tx.raw_sms) {
      const rawClean = tx.raw_sms.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rawClean.includes(oRef)) {
        matchedOrder = o;
        break;
      }
    }
  }

  // 2. Second Priority: Amount + Phone Match
  if (!matchedOrder) {
    for (const order of pendingOrders) {
      const targetAmount = getExpectedAmount(order);
      const amountDiff = Math.abs(Number(targetAmount) - Number(tx.amount));
      // Allow exact match OR fee tolerance (where tx.amount is targetAmount + cash fee up to 25 EGP)
      const isAmountMatch = amountDiff < 0.01 || tx.amount === 0 || (tx.amount >= targetAmount && (tx.amount - targetAmount) <= 25) || amountDiff <= 5;

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

  // 3. Third Priority: Phone match alone if only 1 pending order for that phone (with amount tolerance)
  if (!matchedOrder) {
    for (const order of pendingOrders) {
      const cleanCustomerPhone = normalizePhoneNumber(order.customer_phone);
      const targetAmount = getExpectedAmount(order);
      const amountDiff = Math.abs(Number(targetAmount) - Number(tx.amount));
      const isAmountMatch = amountDiff < 0.01 || tx.amount === 0 || (tx.amount >= targetAmount && (tx.amount - targetAmount) <= 25) || amountDiff <= 5;

      if (cleanCustomerPhone && cleanCustomerPhone.length >= 7 && isAmountMatch) {
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

  if (matchedOrder) {
    let confirmedLine = tx.recipient_phone;
    if (!confirmedLine && tx.raw_sms) {
      const match = tx.raw_sms.match(/(?:على رقم محفظتك|على محفظتك|محفظة|إلى رقم|إلى|خط)\s*(?:20)?(01[0125]\d{8})/i);
      if (match && match[1]) confirmedLine = match[1];
    }
    if (!confirmedLine) confirmedLine = tx.device_name || undefined;
    
    // Accumulate total paid amount for this order from all matched transactions without double counting
    const allTxs = await fetchTransactionsFromSupabase();
    const orderMatchedTxsMap = new Map<string, IncomingTransaction>();
    allTxs.filter(t => t.matched_order_id === matchedOrder!.id || t.id === tx.id).forEach(t => orderMatchedTxsMap.set(t.id, t));
    const sumTxsAmount = Array.from(orderMatchedTxsMap.values()).reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const newPaidAmount = Math.max(sumTxsAmount, Number(tx.amount || 0));
    const totalOrderAmount = Number(matchedOrder.total_amount || 0);

    // Determine if payment is complete (must cover exact total_amount)
    const isFullyPaid = newPaidAmount >= (totalOrderAmount - 0.01);
    const newStatus: OrderStatus = isFullyPaid ? 'auto_verified' : 'pending_difference';
    const remainingDiff = isFullyPaid ? 0 : Math.max(0, totalOrderAmount - newPaidAmount);
    const isDiffPending = !isFullyPaid;

    // Update order status in memory & Supabase
    const updatedOrders = orders.map(o => {
      if (o.id === matchedOrder!.id) {
        return {
          ...o,
          status: newStatus,
          paid_amount: newPaidAmount,
          difference_amount: remainingDiff,
          is_difference_pending: isDiffPending,
          matched_transaction_id: tx.id,
          confirmed_line: confirmedLine || o.confirmed_line,
          matched_device_name: tx.device_name || o.matched_device_name,
          matched_device_id: tx.device_id || o.matched_device_id,
          verified_at: isFullyPaid ? (o.verified_at || new Date().toISOString()) : o.verified_at,
          updated_at: new Date().toISOString()
        };
      }
      return o;
    });

    setMemoryOrders(updatedOrders);
    const updatedMatchedOrder = updatedOrders.find(o => o.id === matchedOrder!.id);
    if (updatedMatchedOrder) {
      await updateOrderInSupabase(updatedMatchedOrder);
    }
    await updateOrderStatusInSupabase(matchedOrder.id, newStatus, tx.id, undefined, confirmedLine, tx.device_name, tx.device_id);
    await updateTransactionStatusInSupabase(tx.id, 'matched', matchedOrder.id);

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
      message: isFullyPaid 
        ? `Successfully auto-verified full payment via Supabase for order #${matchedOrder.order_code}`
        : `Partial payment recorded (${newPaidAmount}/${totalOrderAmount} EGP). Order set to pending difference for #${matchedOrder.order_code}`
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
    const now = Date.now();
    const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours max age for SMS matching without ref

    const unmatchedTxs = transactions.filter(t => {
      if (t.status === 'matched' || t.matched_order_id) return false;
      return true;
    });

    if (unmatchedTxs.length === 0) {
      return { matched: false };
    }

    const cleanCustomerPhone = normalizePhoneNumber(newOrder.customer_phone);
    const cleanSenderPhone = newOrder.sender_phone ? normalizePhoneNumber(newOrder.sender_phone) : cleanCustomerPhone;
    const cleanRef = newOrder.transaction_ref ? newOrder.transaction_ref.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

    let matchedTx: IncomingTransaction | undefined = undefined;

    // 1. Priority 1: Match by Transaction Reference Number (الرقم المرجعي)
    if (cleanRef && cleanRef.length >= 4) {
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

    // 2. Priority 2: Amount + Phone Match (Requires fresh SMS < 48h AND phone match)
    if (!matchedTx) {
      for (const tx of unmatchedTxs) {
        const txAge = tx.created_at ? (now - new Date(tx.created_at).getTime()) : 0;
        if (txAge > MAX_AGE_MS) continue; // Ignore old SMS for general phone/amount matching

        const targetAmount = Number(newOrder.total_amount);
        const amountDiff = Math.abs(targetAmount - Number(tx.amount));
        const isAmountMatch = amountDiff < 0.01 || tx.amount === 0 || (tx.amount >= targetAmount && (tx.amount - targetAmount) <= 25) || amountDiff <= 5;

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

    if (matchedTx) {
      let confirmedLine = matchedTx.recipient_phone;
      if (!confirmedLine && matchedTx.raw_sms) {
        const match = matchedTx.raw_sms.match(/(?:على رقم محفظتك|على محفظتك|محفظة|إلى رقم|إلى|خط)\s*(?:20)?(01[0125]\d{8})/i);
        if (match && match[1]) confirmedLine = match[1];
      }
      if (!confirmedLine) confirmedLine = matchedTx.device_name || undefined;

      const orderTotal = Number(newOrder.total_amount || 0);
      const prevPaid = Number(newOrder.paid_amount || 0);

      // Sum all transactions matched to this order plus newly matchedTx without double counting
      const allTxs = await fetchTransactionsFromSupabase();
      const orderMatchedTxsMap = new Map<string, IncomingTransaction>();
      allTxs.filter(t => t.matched_order_id === newOrder.id || t.id === matchedTx!.id).forEach(t => orderMatchedTxsMap.set(t.id, t));
      const sumTxsAmount = Array.from(orderMatchedTxsMap.values()).reduce((acc, t) => acc + Number(t.amount || 0), 0);

      const paidAmount = Math.max(sumTxsAmount, Number(matchedTx.amount || 0));
      const isFullyPaid = paidAmount >= (orderTotal - 0.01);
      const newStatus: OrderStatus = isFullyPaid ? 'auto_verified' : 'pending_difference';
      const remainingDiff = isFullyPaid ? 0 : Math.max(0, orderTotal - paidAmount);

      newOrder.status = newStatus;
      newOrder.paid_amount = paidAmount;
      newOrder.difference_amount = remainingDiff;
      newOrder.is_difference_pending = !isFullyPaid;
      newOrder.matched_transaction_id = matchedTx.id;
      newOrder.confirmed_line = confirmedLine;
      newOrder.matched_device_name = matchedTx.device_name;
      newOrder.matched_device_id = matchedTx.device_id;
      if (isFullyPaid) {
        newOrder.verified_at = new Date().toISOString();
      }
      newOrder.updated_at = new Date().toISOString();

      // Mark transaction as matched
      matchedTx.status = 'matched';
      matchedTx.matched_order_id = newOrder.id;

      // Update memory state
      const currentTxs = getMemoryTransactions();
      const updatedTxs = currentTxs.map(t => t.id === matchedTx!.id ? { ...t, status: 'matched' as const, matched_order_id: newOrder.id } : t);
      setMemoryTransactions(updatedTxs);

      await updateTransactionStatusInSupabase(matchedTx.id, 'matched', newOrder.id);

      return { matched: true, matchedTx };
    }

    return { matched: false };
  } catch (err) {
    console.error('Error matching order with unmatched transactions:', err);
    return { matched: false };
  }
}

