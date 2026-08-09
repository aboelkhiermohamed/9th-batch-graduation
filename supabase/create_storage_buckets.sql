-- ==========================================================
-- RUN THIS ONCE IN SUPABASE SQL EDITOR
-- Creates Storage Buckets for: Receipts + Product Images
-- ==========================================================

-- 1. Create the 'receipts' bucket (for customer payment screenshots)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  10485760,  -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the 'products' bucket (for product images uploaded from admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  10485760,  -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies for 'receipts' bucket
CREATE POLICY IF NOT EXISTS "Public read receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY IF NOT EXISTS "Anyone can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts');

-- 4. Storage RLS Policies for 'products' bucket
CREATE POLICY IF NOT EXISTS "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY IF NOT EXISTS "Anyone can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products');

CREATE POLICY IF NOT EXISTS "Anyone can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'products');
