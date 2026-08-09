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
      // Find customer by phone_number or email
      const { data: customerByPhone } = await supabase
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

      if (!targetCustomer) {
        return NextResponse.json({ error: 'حساب غير موجود، يرجى التأكد من رقم الموبايل أو الإيميل أو إنشاء حساب جديد' }, { status: 404 });
      }

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

    // Default fallback customer object
    return NextResponse.json({
      success: true,
      customer: {
        id: 'cust-login',
        full_name: 'عميل المتجر',
        phone_number: cleanIdentifier
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تسجيل دخول العميل' }, { status: 500 });
  }
}
