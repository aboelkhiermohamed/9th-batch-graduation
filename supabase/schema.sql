-- ==========================================================
-- 9TH BATCH GRADUATION STORE - DATABASE SCHEMA
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'merch',
    image_url TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb, -- Array of additional gallery images
    size_chart_url TEXT, -- Size chart image URL
    has_customization BOOLEAN NOT NULL DEFAULT false, -- Enable custom text input
    customization_label VARCHAR(255) DEFAULT 'الاسم أو الكلية على القطعة',
    sizes JSONB DEFAULT '[]'::jsonb, -- e.g. ["S", "M", "L", "XL", "XXL"]
    stock INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    store_name VARCHAR(255) NOT NULL DEFAULT '9th batch graduation',
    vodafone_cash_numbers JSONB NOT NULL DEFAULT '["01015339426"]'::jsonb,
    instapay_ipa VARCHAR(255) NOT NULL DEFAULT '9thbatch@instapay',
    pickup_note VARCHAR(255) NOT NULL DEFAULT 'تابع جروب التليجرام',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'vodafone_cash', -- 'vodafone_cash' | 'instapay'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'auto_verified', 'manual_verified', 'ready_for_pickup', 'delivered', 'cancelled'
    total_amount DECIMAL(10, 2) NOT NULL,
    sender_phone VARCHAR(50),
    transaction_ref VARCHAR(100),
    receipt_url TEXT, -- Payment screenshot receipt
    notes TEXT,
    matched_transaction_id UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    product_title VARCHAR(255) NOT NULL,
    selected_size VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    custom_text TEXT, -- Custom typed embroidery/print text
    customization_option VARCHAR(100), -- Custom embroidery placement or option
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. INCOMING TRANSACTIONS (SMS AUDIT LOGS)
CREATE TABLE IF NOT EXISTS public.store_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    sender_phone VARCHAR(50),
    sender_name VARCHAR(255),
    transaction_ref VARCHAR(100),
    matched_order_id UUID REFERENCES public.store_orders(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unmatched', -- 'unmatched', 'matched', 'manual_matched'
    raw_sms TEXT NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ANDROID GATEWAY DEVICES (MOBILE SMS SYNC STATUS)
CREATE TABLE IF NOT EXISTS public.store_devices (
    id VARCHAR(100) PRIMARY KEY,
    device_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    battery_level INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'online',
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total_sms_processed INTEGER DEFAULT 0,
    app_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INSERT INITIAL DEFAULT SETTINGS
INSERT INTO public.store_settings (id, store_name, vodafone_cash_numbers, instapay_ipa, pickup_note)
VALUES ('default', '9th batch graduation', '["01015339426"]'::jsonb, '9thbatch@instapay', 'تابع جروب التليجرام')
ON CONFLICT (id) DO NOTHING;

-- INSERT INITIAL SAMPLE PRODUCTS
INSERT INTO public.store_products (title, title_ar, description, description_ar, price, category, image_url, images, size_chart_url, has_customization, customization_label, sizes, stock)
VALUES 
(
  'Graduation Baseball Jacket', 
  'بيسبول هودي التخرج', 
  'Graduation Baseball jacket with custom 9th batch embroidery.', 
  'جاكيت بيسبول التخرج مع تطريز خاص بالدفعة التاسعة خامة ممتازة وبطانة مريحة.', 
  650.00, 
  'Apparel', 
  'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
  '["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=600&auto=format&fit=crop&q=80"]'::jsonb,
  'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800&auto=format&fit=crop&q=80',
  true,
  'اسم الطالب أو الكلية للتطريز على الجاكيت',
  '["S", "M", "L", "XL", "XXL"]'::jsonb, 
  100
),
(
  'Graduation Notebook', 
  'نوت بوك الدفعة التاسعة', 
  'Hardcover premium graduation notebook & planner.', 
  'نوت بوك فاخر غلاف مقوى بتصميم الدفعة التاسعة لملاحظات وذكريات التخرج.', 
  150.00, 
  'Stationery', 
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
  '["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80"]'::jsonb,
  null,
  false,
  null,
  '[]'::jsonb, 
  150
),
(
  'Graduation Ceramic Mug', 
  'ماج التخرج الحراري', 
  'Custom printed ceramic mug for 9th batch graduation.', 
  'ماج سيراميك حراري مطبوع عليه شعار وتصميم التخرج الدفعة التاسعة.', 
  120.00, 
  'Drinkware', 
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  '["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80"]'::jsonb,
  null,
  true,
  'الاسم المطلوب طباعته على الماج',
  '[]'::jsonb, 
  200
)
ON CONFLICT DO NOTHING;

-- RLS POLICIES
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active products" ON public.store_products FOR SELECT USING (true);
CREATE POLICY "Allow public read store settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Allow public create orders" ON public.store_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read orders" ON public.store_orders FOR SELECT USING (true);
CREATE POLICY "Allow public create order items" ON public.store_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order items" ON public.store_order_items FOR SELECT USING (true);
CREATE POLICY "Allow public device read and ping" ON public.store_devices FOR ALL USING (true) WITH CHECK (true);

-- Admin Full Access Policies
CREATE POLICY "Allow admin full access products" ON public.store_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access orders" ON public.store_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access order items" ON public.store_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access transactions" ON public.store_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access devices" ON public.store_devices FOR ALL USING (true) WITH CHECK (true);

