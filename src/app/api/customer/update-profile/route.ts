import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { isValidEgyptianPhone, normalizePhoneNumber } from '@/lib/smsParser';

export async function PUT(req: Request) {
  try {
    const { id, phone_number, full_name, email, new_phone } = await req.json();

    const rawTarget = new_phone || phone_number || '';
    const targetPhone = rawTarget ? normalizePhoneNumber(rawTarget) : '';
    const cleanName = full_name ? full_name.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';

    if (!cleanName) {
      return NextResponse.json({ error: 'يرجى إدخال الاسم بالكامل' }, { status: 400 });
    }

    if (targetPhone && !isValidEgyptianPhone(targetPhone)) {
      return NextResponse.json({ error: 'رقم الموبايل غير صحيح! يجب أن يكون رقم موبايل مصري مكون من 11 رقماً يبدأ بـ (010, 011, 012, 015)' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    if (client) {
      try {
        const updatePayload: any = {
          full_name: cleanName,
          email: cleanEmail || null,
        };
        if (targetPhone) {
          updatePayload.phone_number = targetPhone;
        }

        let updatedData: any = null;

        if (cleanEmail) {
          const { data } = await client
            .from('store_customers')
            .update(updatePayload)
            .eq('email', cleanEmail)
            .select('id, phone_number, full_name, email, created_at')
            .maybeSingle();
          if (data) updatedData = data;
        }

        if (!updatedData && phone_number) {
          const { data } = await client
            .from('store_customers')
            .update(updatePayload)
            .eq('phone_number', phone_number.trim())
            .select('id, phone_number, full_name, email, created_at')
            .maybeSingle();
          if (data) updatedData = data;
        }

        if (!updatedData && id) {
          const { data } = await client
            .from('store_customers')
            .update(updatePayload)
            .eq('id', id)
            .select('id, phone_number, full_name, email, created_at')
            .maybeSingle();
          if (data) updatedData = data;
        }

        // If no existing row found, insert new customer row
        if (!updatedData) {
          const { data: inserted } = await client
            .from('store_customers')
            .insert([{
              phone_number: targetPhone || null,
              full_name: cleanName,
              email: cleanEmail || null
            }])
            .select('id, phone_number, full_name, email, created_at')
            .maybeSingle();
          if (inserted) updatedData = inserted;
        }

        if (updatedData) {
          return NextResponse.json({
            success: true,
            customer: updatedData,
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
