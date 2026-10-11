import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use Service Role Key for storage uploads (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gthedzjjumbxdaxmehqb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${random}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save file directly to public/uploads/ folder in Next.js app to ensure 0 Supabase Egress
    try {
      const targetSubFolder = folder ? path.join('public', 'uploads', folder) : path.join('public', 'uploads');
      const uploadsDir = path.join(process.cwd(), targetSubFolder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const destinationPath = path.join(uploadsDir, fileName);
      fs.writeFileSync(destinationPath, buffer);

      const publicUrl = folder ? `/uploads/${folder}/${fileName}` : `/uploads/${fileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: fileName
      });
    } catch (fsErr: any) {
      console.error('Local FS storage error:', fsErr);
      return NextResponse.json({ error: 'خطأ في حفظ الملف محلياً: ' + fsErr.message }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: 'خطأ في السيرفر: ' + err.message }, { status: 500 });
  }
}
