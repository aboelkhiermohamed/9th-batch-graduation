import { PaymentMethod } from '@/types';

export interface ParsedSMS {
  success: boolean;
  paymentMethod: PaymentMethod;
  amount: number;
  senderPhone?: string;
  senderName?: string;
  transactionRef?: string;
  error?: string;
}

/**
 * Normalizes phone numbers to standard 11-digit format e.g., 01012345678
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('201') && cleaned.length === 12) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Parses raw incoming SMS from Vodafone Cash or InstaPay
 */
export function parsePaymentSMS(sender: string, message: string): ParsedSMS {
  const text = message.trim();
  const lowerSender = sender.toLowerCase();

  // Determine Payment Method
  let paymentMethod: PaymentMethod = 'vodafone_cash';
  if (
    lowerSender.includes('instapay') ||
    lowerSender.includes('ipn') ||
    text.includes('InstaPay') ||
    text.includes('انستا باي') ||
    text.includes('إنستاباي')
  ) {
    paymentMethod = 'instapay';
  }

  // Extract Amount (e.g. 650 EGP, 650.00 جم, 650.00 جنيه, 650 LE, EGP 650)
  let amount = 0;
  const amountRegexes = [
    /(?:مبلغ|تحويل|استلام|دفعة|قيمة)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:جم|جنيه|EGP|LE)?/i,
    /(?:EGP|LE|جم|جنيه)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:جم|جنيه|EGP|LE)/i
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // Extract Sender Phone (e.g. من 01012345678 or from 01012345678)
  let senderPhone: string | undefined = undefined;
  const phoneRegexes = [
    /(?:من|من الرقم|الراسل|من حساب)\s*(01[0125]\d{8})/i,
    /(?:from|sender)\s*(01[0125]\d{8}|\+?201[0125]\d{8})/i,
    /(01[0125]\d{8})/
  ];

  for (const regex of phoneRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      senderPhone = normalizePhoneNumber(match[1]);
      break;
    }
  }

  // Extract Transaction Reference / Number
  let transactionRef: string | undefined = undefined;
  const refRegexes = [
    /(?:رقم العملية|رقم المرجع|المرجع|مرجع|Trans ID|Ref No|Ref)\s*:?\s*([A-Za-z0-9]+)/i,
    /(?:ID|Ref)\s*#?\s*([A-Za-z0-9]{6,})/i
  ];

  for (const regex of refRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      transactionRef = match[1];
      break;
    }
  }

  if (amount <= 0) {
    return {
      success: false,
      paymentMethod,
      amount: 0,
      error: 'Could not extract valid transaction amount from SMS body'
    };
  }

  return {
    success: true,
    paymentMethod,
    amount,
    senderPhone,
    transactionRef
  };
}
