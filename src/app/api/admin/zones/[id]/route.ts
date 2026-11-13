import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryZoneById, updateDeliveryZone, deleteDeliveryZone } from '@/lib/deliveryZonesService';

export const dynamic = 'force-dynamic';

interface Params {
  params: { id: string };
}

// GET /api/admin/zones/[id] - Returns full detail of single zone with all orders
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const zone = await getDeliveryZoneById(id);

    if (!zone) {
      return NextResponse.json(
        { success: false, error: 'كشف التسليم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      zone
    });
  } catch (err: any) {
    console.error('Error fetching delivery zone:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل بيانات كشف التسليم' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/zones/[id] - Updates sheet name, orders, delivery times
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, orders } = body;

    const updatedZone = await updateDeliveryZone(id, {
      name,
      orders
    });

    if (!updatedZone) {
      return NextResponse.json(
        { success: false, error: 'تعذر تعديل كشف التسليم، الكشف غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      zone: updatedZone,
      message: 'تم تحديث كشف التسليم بنجاح'
    });
  } catch (err: any) {
    console.error('Error updating delivery zone:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث كشف التسليم' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/zones/[id] - Deletes delivery sheet (never touches store orders)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = params;
    const success = await deleteDeliveryZone(id);

    return NextResponse.json({
      success,
      message: 'تم حذف كشف التسليم بنجاح دون المساس بالطلبات الأصلية'
    });
  } catch (err: any) {
    console.error('Error deleting delivery zone:', err);
    return NextResponse.json(
      { success: false, error: 'فشل حذف كشف التسليم' },
      { status: 500 }
    );
  }
}
