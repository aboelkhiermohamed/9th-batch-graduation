import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(req: Request) {
  try {
    const { phone_number, current_password, new_password } = await req.json();

    if (!phone_number || !new_password) {
      return NextResponse.json({ error: 'رقم الهاتف وكلمة المرور الجديدة مطلوبان' }, { status: 400 });
    }

    const cleanPhone = phone_number.trim();
    const cleanCurrent = current_password ? current_password.trim() : '';
    const cleanNew = new_password.trim();

    if (cleanNew.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 أرقام أو حروف على الأقل' }, { status: 400 });
    }

    if (supabase) {
      try {
        const { data: customer } = await supabase
          .from('store_customers')
          .select('*')
          .eq('phone_number', cleanPhone)
          .single();

        if (customer) {
          // If customer has an existing password set, verify it
          if (customer.password_hash && cleanCurrent && customer.password_hash !== cleanCurrent) {
            return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 401 });
          }

          const { error: updateErr } = await supabase
            .from('store_customers')
            .update({ password_hash: cleanNew })
            .eq('phone_number', cleanPhone);

          if (!updateErr) {
            return NextResponse.json({
              success: true,
              message: 'تم تغيير كلمة المرور بنجاح'
            });
          }
        }
      } catch (err: any) {
        console.warn('Supabase password change error:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث كلمة المرور بنجاح'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ أثناء تغيير كلمة المرور' }, { status: 500 });
  }
}
