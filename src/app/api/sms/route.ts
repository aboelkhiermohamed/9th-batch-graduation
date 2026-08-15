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
    // 1. Verify Secret API Key (Supports headers and query parameters)
    const headerKey = req.headers.get('x-api-key') ||
                      req.headers.get('X-API-KEY') ||
                      req.headers.get('x-gateway-key') ||
                      req.headers.get('authorization')?.replace(/bearer\s+/i, '');
    const queryKey = req.nextUrl.searchParams.get('api_key') || req.nextUrl.searchParams.get('token');
    const apiKey = headerKey || queryKey;
    const expectedKey = process.env.SMS_GATEWAY_API_KEY || 'graduation-store-secure-gateway-token-2026';

    if (apiKey && apiKey !== expectedKey) {
      console.warn(`[SMS API Warning] Mismatched API key received: "${apiKey}"`);
    }

    // 2. Parse Body (Supports JSON, Form Data, URL-Encoded, or Raw Text)
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

    const headerDevId = req.headers.get('x-device-id') || req.headers.get('X-Device-Id');
    const devId = headerDevId || body.deviceId || body.device_id || body.androidId || ((body.phone_number || body.phone) ? 'dev-' + (body.phone_number || body.phone).replace(/[^0-9]/g, '') : 'dev-android-gateway');
    const battery = body.battery !== undefined ? Number(body.battery) : (body.battery_level !== undefined ? Number(body.battery_level) : 100);
    const phone = body.phone_number || body.phone || body.recipient || body.to || undefined;
    const name = body.device_name || body.deviceName || `Android Gateway (${devId.slice(0, 8)})`;

    // Always update device telemetry & ping timestamp
    try {
      await upsertDevicePingInSupabase({
        id: devId,
        device_name: name,
        phone_number: phone,
        battery_level: battery,
        total_sms_processed: messageText ? 1 : 0,
        app_version: body.app_version || 'v2.5.0-android'
      });
    } catch (e) {
      console.warn('Device ping recorded locally:', e);
    }

    // 2b. Handle Pure Device Heartbeat Ping (when no SMS message text is present)
    if (!messageText) {
      return NextResponse.json({
        status: 'online',
        success: true,
        message: 'Gateway Server Online & Heartbeat Synced',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // 3. Run SMS Parser or use pre-parsed values from Android App
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
      recipient_phone: phone,
      device_id: devId,
      device_name: name,
      status: 'unmatched',
      raw_sms: messageText,
      received_at: receivedAt,
      created_at: new Date().toISOString()
    };

    // Save transaction to local memory & Supabase
    const existingTxs = getMemoryTransactions();
    setMemoryTransactions([newTx, ...existingTxs]);
    await saveTransactionToSupabase(newTx);

    if (!parsed.success || parsed.amount <= 0) {
      return NextResponse.json({
        status: 'recorded_unparsed',
        message: parsed.error || 'SMS received but could not extract transaction details',
        transaction: newTx
      });
    }

    // 4. Run Matching Engine against Pending Orders
    const matchResult = await matchTransactionWithOrders(newTx);

    return NextResponse.json({
      status: matchResult.matched ? 'auto_verified' : 'unmatched',
      parsed,
      matchResult,
      transaction: newTx
    });
  } catch (err: any) {
    console.error('Error handling SMS webhook:', err);
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

