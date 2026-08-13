import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

let MEMORY_ADMINS = [
  {
    id: 'super-admin-mohamed',
    username: 'mohamedahmed077m@gmail.com',
    display_name: 'محمد ابو الخير (Super Admin)',
    role: 'superadmin',
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'default-admin',
    username: 'admin',
    display_name: 'المدير العام (Super Admin)',
    role: 'superadmin',
    is_active: true,
    created_at: new Date().toISOString()
  }
];

export async function GET() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('store_admins')
        .select('id, username, display_name, role, is_active, created_at')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return NextResponse.json(data);
      }
    }

    return NextResponse.json(MEMORY_ADMINS);
  } catch (err: any) {
    return NextResponse.json(MEMORY_ADMINS);
  }
}

export async function POST(req: Request) {
  try {
    const { username, password, display_name, role } = await req.json();

    if (!username || !password || !display_name) {
      return NextResponse.json({ error: 'جميع البيانات مطلوبة (اسم المستخدم، كلمة المرور، الاسم الظاهر)' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanDisplayName = display_name.trim();
    const adminRole = role === 'superadmin' ? 'superadmin' : 'admin';

    if (supabase) {
      const { data, error } = await supabase
        .from('store_admins')
        .insert([{
          username: cleanUsername,
          password_hash: cleanPassword,
          display_name: cleanDisplayName,
          role: adminRole,
          is_active: true
        }])
        .select('id, username, display_name, role, is_active, created_at')
        .single();

      if (error) {
        return NextResponse.json({ error: 'اسم المستخدم مأخوذ بالفعل أو حدث خطأ: ' + error.message }, { status: 400 });
      }

      return NextResponse.json(data);
    }

    // Memory fallback
    const newAdmin = {
      id: 'admin-' + Date.now(),
      username: cleanUsername,
      display_name: cleanDisplayName,
      role: adminRole,
      is_active: true,
      created_at: new Date().toISOString()
    };
    MEMORY_ADMINS.push(newAdmin);

    return NextResponse.json(newAdmin);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل إضافة المشرف' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المشرف مطلوب' }, { status: 400 });
    }

    if (supabase) {
      const { error } = await supabase
        .from('store_admins')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      MEMORY_ADMINS = MEMORY_ADMINS.filter(a => a.id !== id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل حذف المشرف' }, { status: 500 });
  }
}
