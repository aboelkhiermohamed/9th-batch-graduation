-- ==========================================================
-- DELIVERY ZONES MANAGEMENT SYSTEM SCHEMA & MIGRATION
-- Run this in Supabase SQL Editor
-- ==========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DELIVERY ZONES TABLE
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. DELIVERY ZONE ORDERS TABLE (Junction Table with foreign key to store_orders)
CREATE TABLE IF NOT EXISTS public.delivery_zone_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    delivery_time VARCHAR(100),
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'delivered'
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivered_by VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_zone_order UNIQUE (zone_id, order_id)
);

-- 3. INDEXES FOR PERFORMANCE & BANDWIDTH EFFICIENCY
CREATE INDEX IF NOT EXISTS idx_delivery_zones_created_at ON public.delivery_zones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_zone_orders_zone_id ON public.delivery_zone_orders(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zone_orders_order_id ON public.delivery_zone_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zone_orders_status ON public.delivery_zone_orders(delivery_status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zone_orders ENABLE ROW LEVEL SECURITY;

-- Allow full access for authorized dashboard requests
DROP POLICY IF EXISTS "Allow full access delivery_zones" ON public.delivery_zones;
CREATE POLICY "Allow full access delivery_zones" ON public.delivery_zones FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access delivery_zone_orders" ON public.delivery_zone_orders;
CREATE POLICY "Allow full access delivery_zone_orders" ON public.delivery_zone_orders FOR ALL USING (true) WITH CHECK (true);

