import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { phone_number, full_name } = await req.json();

    if (!phone_number) {
      return NextResponse.json({ error: 'يرجى إدخال رقم الموبايل' }, { status: 400 });
    }

    const cleanPhone = phone_number.trim();
    const cleanName = full_name ? full_name.trim() : '';

    if (supabase) {
      const { data: existing } = await supabase
        .from('store_customers')
        .select('*')
        .eq('phone_number', cleanPhone)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          customer: {
            id: existing.id,
            phone_number: existing.phone_number,
            full_name: existing.full_name
          }
        });
      }

      if (cleanName) {
        const { data: inserted } = await supabase
          .from('store_customers')
          .insert([{ phone_number: cleanPhone, full_name: cleanName }])
          .select()
          .single();

        if (inserted) {
          return NextResponse.json({
            success: true,
            customer: {
              id: inserted.id,
              phone_number: inserted.phone_number,
              full_name: inserted.full_name
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      customer: {
        phone_number: cleanPhone,
        full_name: cleanName || 'عميل المتجر'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ في تسجيل دخول العميل' }, { status: 500 });
  }
}
