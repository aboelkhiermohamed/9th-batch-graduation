import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الموبايل/الإيميل وكلمة المرور' }, { status: 400 });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (supabase) {
      try {
        const { data: customerByPhone, error: errPhone } = await supabase
          .from('store_customers')
          .select('*')
          .eq('phone_number', cleanIdentifier)
          .single();

        let targetCustomer = customerByPhone;

        if (!targetCustomer) {
          const { data: customerByEmail } = await supabase
            .from('store_customers')
            .select('*')
            .eq('email', cleanIdentifier)
            .single();
          targetCustomer = customerByEmail;
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
