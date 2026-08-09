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
        .eq('username', cleanUsername)
        .eq('is_active', true)
        .single();

      if (data && data.password_hash === cleanPassword) {
        return NextResponse.json({
          success: true,
          admin: {
            id: data.id,
            username: data.username,
            display_name: data.display_name,
            role: data.role
          }
        });
      }
    }

    // Fallback default superadmin login
    if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
      return NextResponse.json({
        success: true,
        admin: {
          id: 'default-admin',
          username: 'admin',
          display_name: 'المدير العام (Super Admin)',
          role: 'superadmin'
        }
      });
    }

    return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'خطأ أثناء تسجيل دخول المشرف' }, { status: 500 });
  }
}
