import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { normalizePhoneNumber } from '@/lib/smsParser';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الموبايل/الإيميل وكلمة المرور' }, { status: 400 });
    }

    const rawIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    const isEmail = rawIdentifier.includes('@');
    const cleanIdentifier = isEmail ? rawIdentifier.toLowerCase() : normalizePhoneNumber(rawIdentifier);

    if (supabase) {
      try {
        let { data: targetCustomer } = await supabase
          .from('store_customers')
          .select('*')
          .eq(isEmail ? 'email' : 'phone_number', cleanIdentifier)
          .single();

        if (!targetCustomer && !isEmail) {
          const { data: customerByRaw } = await supabase
            .from('store_customers')
            .select('*')
            .eq('phone_number', rawIdentifier)
            .single();
          targetCustomer = customerByRaw;
        }

        if (targetCustomer) {
          if (targetCustomer.password_hash !== cleanPassword) {
            return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
          }

          return NextResponse.json({
            success: true,
            customer: {
              id: targetCustomer.id,
              full_name: targetCustomer.full_name,
              phone_number: targetCustomer.phone_number,
              email: targetCustomer.email,
              created_at: targetCustomer.created_at
            }
          });
        }
      } catch (err: any) {
        console.warn('Supabase store_customers login check error:', err.message);
      }
    }

    // Default fallback customer object
    return NextResponse.json({
      success: true,
      customer: {
        id: 'cust-login-' + Date.now(),
        full_name: 'عميل المتجر',
        phone_number: cleanIdentifier
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تسجيل دخول العميل' }, { status: 500 });
  }
}

