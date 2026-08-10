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
    const bucket = (formData.get('bucket') as string) || 'receipts';
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
    const filePathInFolder = folder ? `${folder}/${fileName}` : fileName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Try Supabase Storage First
    if (supabaseKey) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePathInFolder, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });

        if (!error && data?.path) {
          const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(data.path);

          if (urlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: urlData.publicUrl,
              path: data.path,
              bucket,
            });
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload attempt skipped/failed, using local storage fallback:', storageErr);
      }
    }

    // 2. Fallback: Save file to public/uploads/ folder in Next.js app
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const destinationPath = path.join(uploadsDir, fileName);
      fs.writeFileSync(destinationPath, buffer);

      const publicUrl = `/uploads/${fileName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: fileName
      });
    } catch (fsErr: any) {
      console.error('Local FS storage error:', fsErr);
    }

    // 3. Fallback to Data URL if storage is read-only
    const base64 = buffer.toString('base64');
    const mime = file.type || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl
    });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: 'خطأ في السيرفر: ' + err.message }, { status: 500 });
  }
}
