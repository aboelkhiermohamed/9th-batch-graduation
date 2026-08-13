import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (supabase) {
      const { data, error } = await supabase
        .from('store_admins')
        .select('*')
        .or(`username.eq.${cleanUsername},username.eq.${cleanUsername.split('@')[0]}`)
        .eq('is_active', true);

      if (data && data.length > 0) {
        const found = data.find(a => a.password_hash === cleanPassword);
        if (found) {
          return NextResponse.json({
            success: true,
            admin: {
              id: found.id,
              username: found.username,
              display_name: found.display_name,
              role: found.role
            }
          });
        }
      }
    }

    // Default Super Admin logins (Fallbacks)
    if (
      (cleanUsername === 'mohamedahmed077m@gmail.com' || cleanUsername === 'mohamedahmed077m') &&
      cleanPassword === '19312@Mo'
    ) {
      return NextResponse.json({
        success: true,
        admin: {
          id: 'super-admin-mohamed',
          username: 'mohamedahmed077m@gmail.com',
          display_name: 'محمد ابو الخير (Super Admin)',
          role: 'superadmin'
        }
      });
    }

    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ أثناء تسجيل دخول المشرف' }, { status: 500 });
  }
}
