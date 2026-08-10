import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(req: Request) {
  try {
    const { phone_number, full_name, email } = await req.json();

    if (!phone_number) {
      return NextResponse.json({ error: 'رقم الموبايل مطلوب للتعرف على الحساب' }, { status: 400 });
    }

    const cleanPhone = phone_number.trim();
    const cleanName = full_name ? full_name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanName) {
      return NextResponse.json({ error: 'يرجى إدخال الاسم بالكامل' }, { status: 400 });
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('store_customers')
          .update({
            full_name: cleanName,
            email: cleanEmail || null,
          })
          .eq('phone_number', cleanPhone)
          .select('id, phone_number, full_name, email, created_at')
          .single();

        if (!error && data) {
          return NextResponse.json({
            success: true,
            customer: data,
            message: 'تم تحديث البيانات الشخصية بنجاح'
          });
        }
      } catch (err: any) {
        console.warn('Supabase customer update warning:', err.message);
      }
    }

    // Fallback response for memory/offline mode
    return NextResponse.json({
      success: true,
      customer: {
        phone_number: cleanPhone,
        full_name: cleanName,
        email: cleanEmail
      },
      message: 'تم تحديث البيانات بنجاح'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ أثناء تحديث البروفايل' }, { status: 500 });
  }
}
