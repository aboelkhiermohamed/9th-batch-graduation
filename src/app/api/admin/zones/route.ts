import { NextRequest, NextResponse } from 'next/server';
import { listDeliveryZones, createDeliveryZone } from '@/lib/deliveryZonesService';

export const dynamic = 'force-dynamic';

// GET /api/admin/zones - Returns all delivery sheets (lightweight summary)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const { zones, isUsingFallback } = await listDeliveryZones(forceRefresh);
    return NextResponse.json({
      success: true,
      zones,
      isUsingFallback
    });
  } catch (err: any) {
    console.error('Error listing delivery zones:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل كشوفات التسليم' },
      { status: 500 }
    );
  }
}

// POST /api/admin/zones - Creates a new delivery zone sheet
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, created_by, orders } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال اسم الزون أو الكشف' },
        { status: 400 }
      );
    }

    const createdZone = await createDeliveryZone({
      name: name.trim(),
      created_by: created_by?.trim() || 'Admin',
      orders: Array.isArray(orders) ? orders : []
    });

    return NextResponse.json({
      success: true,
      zone: createdZone,
      message: 'تم إنشاء كشف زون التسليم بنجاح'
    });
  } catch (err: any) {
    console.error('Error creating delivery zone:', err);
    return NextResponse.json(
      { success: false, error: 'فشل إنشاء كشف التسليم' },
      { status: 500 }
    );
  }
}
