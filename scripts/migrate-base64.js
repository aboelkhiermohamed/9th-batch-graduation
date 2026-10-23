const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function runMigration() {
  console.log('🔄 Checking Supabase connection and tables...');

  try {
    // 1. Ensure bucket exists
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.error('❌ Could not list storage buckets:', bErr.message);
      return;
    }
    const bucketExists = buckets && buckets.some(b => b.name === 'receipts');
    if (!bucketExists) {
      console.log('📦 Creating public "receipts" bucket...');
      await supabase.storage.createBucket('receipts', { public: true });
    }

    // 2. Query all orders
    const { data: orders, error: oErr } = await supabase
      .from('store_orders')
      .select('id, order_code, receipt_url, notes');

    if (oErr) {
      console.error('❌ Failed to fetch store_orders:', oErr.message);
      return;
    }

    console.log(`📊 Found ${orders.length} total orders in database.`);

    let base64Found = 0;
    let convertedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;
      let newReceiptUrl = order.receipt_url;
      let newNotes = order.notes || '';

      // Check for base64 in receipt_url or notes
      let base64Data = null;
      if (newReceiptUrl && newReceiptUrl.startsWith('data:image')) {
        base64Data = newReceiptUrl;
      } else if (newNotes && newNotes.includes('data:image')) {
        const match = newNotes.match(/data:image\/([a-zA-Z0-9.+_-]+);base64,([A-Za-z0-9+/=]+)/);
        if (match) {
          base64Data = match[0];
        }
      }

      if (base64Data) {
        base64Found++;
        const matches = base64Data.match(/^data:image\/([a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (matches) {
          const rawExt = matches[1].toLowerCase();
          const ext = rawExt.includes('png') ? 'png' : (rawExt.includes('webp') ? 'webp' : 'jpg');
          const mimeType = `image/${rawExt}`;
          const buffer = Buffer.from(matches[2], 'base64');
          const cleanCode = order.order_code || order.id;
          const fileName = `legacy-receipts/order-${cleanCode}-${Date.now()}.${ext}`;

          console.log(`🖼️ Converting Order #${cleanCode} Base64 receipt (${(buffer.length / 1024).toFixed(1)} KB) to Storage file...`);

          const { error: uploadErr } = await supabase.storage
            .from('receipts')
            .upload(fileName, buffer, {
              contentType: mimeType,
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
            newReceiptUrl = publicUrl;
            needsUpdate = true;
            console.log(`✅ Uploaded to: ${publicUrl}`);
          } else {
            console.error(`⚠️ Upload error for order #${cleanCode}:`, uploadErr.message);
          }
        }
      }

      // Clean base64 from notes text
      if (newNotes && newNotes.includes('data:image')) {
        newNotes = newNotes.replace(/data:image\/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]+/g, '[IMAGE_MIGRATED_TO_STORAGE]');
        if (newReceiptUrl) {
          newNotes = newNotes.replace(/\[RECEIPT_URL:data:[\s\S]*?\]/g, `[RECEIPT_URL:${newReceiptUrl}]`);
        } else {
          newNotes = newNotes.replace(/\[RECEIPT_URL:data:[\s\S]*?\]/g, '');
        }
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updErr } = await supabase
          .from('store_orders')
          .update({
            receipt_url: newReceiptUrl,
            notes: newNotes
          })
          .eq('id', order.id);

        if (updErr) {
          console.error(`❌ Failed to update order #${order.order_code || order.id} in DB:`, updErr.message);
        } else {
          convertedCount++;
        }
      }
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`- Orders with Base64 detected: ${base64Found}`);
    console.log(`- Successfully converted & saved to Storage: ${convertedCount}`);
  } catch (err) {
    console.error('Unhandled exception:', err);
  }
}

runMigration();
