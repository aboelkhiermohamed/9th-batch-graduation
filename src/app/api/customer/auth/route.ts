import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { phone_number, email, full_name } = await req.json();

    const cleanPhone = phone_number ? phone_number.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = full_name ? full_name.trim() : '';

    if (!cleanPhone && !cleanEmail) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الموبايل أو البريد الإلكتروني' }, { status: 400 });
    }

    const client = supabaseAdmin || supabase;

    if (client) {
      try {
        if (cleanEmail) {
          const { data: existingEmail } = await client
            .from('store_customers')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (existingEmail) {
            let needsUpdate = false;
            const updatePayload: any = {};
            if (cleanPhone && existingEmail.phone_number !== cleanPhone) {
              updatePayload.phone_number = cleanPhone;
              needsUpdate = true;
            }
            if (cleanName && existingEmail.full_name !== cleanName && cleanName !== 'عميل Google') {
              updatePayload.full_name = cleanName;
              needsUpdate = true;
            }

            if (needsUpdate) {
              const { data: updated } = await client
                .from('store_customers')
                .update(updatePayload)
                .eq('id', existingEmail.id)
                .select()
                .maybeSingle();
              if (updated) {
                return NextResponse.json({ success: true, customer: updated });
              }
            }

            return NextResponse.json({ success: true, customer: existingEmail });
          }
        }

        if (cleanPhone) {
          const { data: existingPhone } = await client
            .from('store_customers')
            .select('*')
            .eq('phone_number', cleanPhone)
            .maybeSingle();

          if (existingPhone) {
            let needsUpdate = false;
            const updatePayload: any = {};
            if (cleanEmail && existingPhone.email !== cleanEmail) {
              updatePayload.email = cleanEmail;
              needsUpdate = true;
            }
            if (cleanName && existingPhone.full_name !== cleanName && cleanName !== 'عميل Google') {
              updatePayload.full_name = cleanName;
              needsUpdate = true;
            }

            if (needsUpdate) {
              const { data: updated } = await client
                .from('store_customers')
                .update(updatePayload)
                .eq('id', existingPhone.id)
                .select()
                .maybeSingle();
              if (updated) {
                return NextResponse.json({ success: true, customer: updated });
              }
            }

            return NextResponse.json({ success: true, customer: existingPhone });
          }
        }

        const { data: inserted } = await client
          .from('store_customers')
          .insert([{
            phone_number: cleanPhone || null,
            full_name: cleanName || (cleanEmail ? cleanEmail.split('@')[0] : 'عميل المتجر'),
            email: cleanEmail || null
          }])
          .select()
          .single();

        if (inserted) {
          return NextResponse.json({ success: true, customer: inserted });
        }
      } catch (err: any) {
        console.warn('Supabase store_customers auth check error:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: 'cust-' + Date.now(),
        phone_number: cleanPhone,
        full_name: cleanName || 'عميل المتجر',
        email: cleanEmail
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تسجيل دخول العميل' }, { status: 500 });
  }
}
