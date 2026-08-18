import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { phone_number, email, full_name } = await req.json();

    const cleanPhone = phone_number ? phone_number.trim() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = full_name ? full_name.trim() : '';

    if (!cleanPhone && !cleanEmail) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الموبايل أو البريد الإلكتروني' }, { status: 400 });
    }

    if (supabase) {
      try {
        if (cleanEmail) {
          const { data: existingEmail } = await supabase
            .from('store_customers')
            .select('*')
            .eq('email', cleanEmail)
            .single();

          if (existingEmail) {
            return NextResponse.json({
              success: true,
              customer: {
                id: existingEmail.id,
                phone_number: existingEmail.phone_number,
                full_name: existingEmail.full_name,
                email: existingEmail.email,
                created_at: existingEmail.created_at
              }
            });
          }
        }

        if (cleanPhone) {
          const { data: existingPhone } = await supabase
            .from('store_customers')
            .select('*')
            .eq('phone_number', cleanPhone)
            .single();

          if (existingPhone) {
            return NextResponse.json({
              success: true,
              customer: {
                id: existingPhone.id,
                phone_number: existingPhone.phone_number,
                full_name: existingPhone.full_name,
                email: existingPhone.email,
                created_at: existingPhone.created_at
              }
            });
          }
        }

        if (cleanName && cleanPhone) {
          const { data: inserted } = await supabase
            .from('store_customers')
            .insert([{
              phone_number: cleanPhone,
              full_name: cleanName,
              email: cleanEmail || null
            }])
            .select()
            .single();

          if (inserted) {
            return NextResponse.json({
              success: true,
              customer: {
                id: inserted.id,
                phone_number: inserted.phone_number,
                full_name: inserted.full_name,
                email: inserted.email,
                created_at: inserted.created_at
              }
            });
          }
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
