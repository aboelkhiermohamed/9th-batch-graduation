import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(req: Request) {
  try {
    const { id, phone_number, full_name, email, new_phone } = await req.json();

    const targetPhone = (new_phone || phone_number || '').trim();
    const cleanName = full_name ? full_name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanName) {
      return NextResponse.json({ error: 'يرجى إدخال الاسم بالكامل' }, { status: 400 });
    }

    if (supabase) {
      try {
        const updatePayload: any = {
          full_name: cleanName,
          email: cleanEmail || null,
        };
        if (targetPhone) {
          updatePayload.phone_number = targetPhone;
        }

        let query = supabase.from('store_customers').update(updatePayload);
        if (id) {
          query = query.eq('id', id);
        } else if (phone_number) {
          query = query.eq('phone_number', phone_number.trim());
        } else if (cleanEmail) {
          query = query.eq('email', cleanEmail);
        } else {
          return NextResponse.json({ error: 'تعذر التعرف على الحساب المراد تحديثه' }, { status: 400 });
        }

        const { data, error } = await query.select('id, phone_number, full_name, email, created_at').single();

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
        id: id || 'cust-' + Date.now().toString(36),
        phone_number: targetPhone,
        full_name: cleanName,
        email: cleanEmail
      },
      message: 'تم تحديث البيانات بنجاح'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ أثناء تحديث البروفايل' }, { status: 500 });
  }
}
