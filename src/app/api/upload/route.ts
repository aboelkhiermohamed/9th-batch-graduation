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
    const bucket = (formData.get('bucket') as string) || 'receipts';

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

    // Primary strategy: Save file to local public/uploads/ (0 Supabase Storage & 0 Egress)
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
      // Fallback strategy: On serverless hosts like Vercel with read-only filesystem,
      // upload the compressed image to Supabase Storage instead of failing.
      console.warn('Local FS write failed (serverless environment), falling back to Supabase Storage:', fsErr.message);

      try {
        const storagePath = folder ? `${folder}/${fileName}` : fileName;
        const bucketName = bucket || 'receipts';

        // Check if bucket exists, create if needed
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === bucketName);
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        }

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucketName)
          .upload(storagePath, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true
          });

        if (uploadErr) {
          console.error('Supabase storage upload error:', uploadErr);
          return NextResponse.json({ error: 'خطأ أثناء رفع الصورة للتخزين السحابي: ' + uploadErr.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
          .from(bucketName)
          .getPublicUrl(storagePath);

        return NextResponse.json({
          success: true,
          url: publicUrl,
          filename: fileName
        });
      } catch (storageErr: any) {
        console.error('Storage upload exception:', storageErr);
        return NextResponse.json({ error: 'خطأ في التخزين السحابي: ' + storageErr.message }, { status: 500 });
      }
    }
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: 'خطأ في السيرفر: ' + err.message }, { status: 500 });
  }
}
