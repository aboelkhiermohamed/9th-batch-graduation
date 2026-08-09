import { NextRequest, NextResponse } from 'next/server';
import { parsePaymentSMS } from '@/lib/smsParser';
import { matchTransactionWithOrders } from '@/lib/matchingEngine';
import { IncomingTransaction } from '@/types';
import { 
  getMemoryTransactions, 
  setMemoryTransactions, 
  saveTransactionToSupabase, 
  fetchTransactionsFromSupabase,
  upsertDevicePingInSupabase
} from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        body = {};
        formData.forEach((value, key) => {
          body[key] = value.toString();
        });
      } else {
        const text = await req.text();
        try {
          body = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          if (params.has('message') || params.has('sender') || params.has('text') || params.has('body')) {
            body = Object.fromEntries(params.entries());
          } else {
            body = { message: text, rawMessage: text };
          }
        }
      }
    } catch (e) {
      body = {};
    }

    const sender = body.sender || body.from || body.address || 'Vodafone';
    const messageText = body.message || body.rawMessage || body.text || body.body || body.sms || '';
    const receivedAt = body.receivedAt || body.timestamp || new Date().toISOString();

    if (!messageText) {
      return NextResponse.json({
        status: 'online',
        success: true,
        message: 'Heartbeat Synced'
      }, { status: 200 });
    }

    const parsed = parsePaymentSMS(sender, messageText);
    const amount = body.amount !== undefined ? Number(body.amount) : parsed.amount;
    const senderPhone = body.senderPhone || parsed.senderPhone;
    const senderName = body.senderName || parsed.senderName;
    const transactionRef = body.transactionReference || parsed.transactionRef;

    const transactionId = 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const newTx: IncomingTransaction = {
      id: transactionId,
      payment_method: parsed.paymentMethod || body.paymentMethod || 'vodafone_cash',
      amount: amount,
      sender_phone: senderPhone,
      sender_name: senderName,
      transaction_ref: transactionRef,
      status: 'unmatched',
      raw_sms: messageText,
      received_at: receivedAt,
      created_at: new Date().toISOString()
    };

    const existingTxs = getMemoryTransactions();
    setMemoryTransactions([newTx, ...existingTxs]);
    await saveTransactionToSupabase(newTx);

    const matchResult = await matchTransactionWithOrders(newTx);

    return NextResponse.json({
      status: matchResult.matched ? 'auto_verified' : 'unmatched',
      parsed,
      matchResult,
      transaction: newTx
    });
  } catch (err: any) {
    console.error('Error handling nested SMS webhook:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const txs = await fetchTransactionsFromSupabase();
  return NextResponse.json(txs);
}
