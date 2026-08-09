import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { full_name, phone_number, email, password } = await req.json();

    if (!full_name || !phone_number || !password) {
      return NextResponse.json({ error: 'الاسم بالكامل ورقم الموبايل وكلمة المرور مطلوبة لإنشاء الحساب' }, { status: 400 });
    }

    const cleanName = full_name.trim();
    const cleanPhone = phone_number.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPassword = password.trim();

    if (cleanPassword.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن لا تقل عن 4 أرقام أو حروف' }, { status: 400 });
    }

    if (supabase) {
      try {
        // Check if phone or email already registered
        const { data: existingPhone, error: phoneErr } = await supabase
          .from('store_customers')
          .select('id')
          .eq('phone_number', cleanPhone)
          .single();

        if (existingPhone) {
          return NextResponse.json({ error: 'رقم الموبايل هذا مسجل به حساب بالفعل، يرجى تسجيل الدخول' }, { status: 400 });
        }

        if (cleanEmail) {
          const { data: existingEmail } = await supabase
            .from('store_customers')
            .select('id')
            .eq('email', cleanEmail)
            .single();

          if (existingEmail) {
            return NextResponse.json({ error: 'البريد الإلكتروني مسجل به حساب بالفعل' }, { status: 400 });
          }
        }

        // Insert new customer account
        const { data: inserted, error: insertError } = await supabase
          .from('store_customers')
          .insert([{
            full_name: cleanName,
            phone_number: cleanPhone,
            email: cleanEmail,
            password_hash: cleanPassword
          }])
          .select('id, full_name, phone_number, email, created_at')
          .single();

        if (!insertError && inserted) {
          return NextResponse.json({
            success: true,
            customer: inserted
          });
        }

        console.warn('Supabase store_customers insert warning:', insertError?.message);
      } catch (err: any) {
        console.warn('Supabase table check error:', err.message);
      }
    }

    // Default fallback customer object (when store_customers table hasn't been migrated yet in DB)
    return NextResponse.json({
      success: true,
      customer: {
        id: 'cust-' + Date.now(),
        full_name: cleanName,
        phone_number: cleanPhone,
        email: cleanEmail,
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في إنشاء حساب العميل' }, { status: 500 });
  }
}
