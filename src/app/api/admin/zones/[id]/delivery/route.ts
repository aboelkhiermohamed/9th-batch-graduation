import { NextRequest, NextResponse } from 'next/server';
import { updateOrderDeliveryStatus } from '@/lib/deliveryZonesService';

interface Params {
  params: { id: string };
}

// PATCH /api/admin/zones/[id]/delivery - Updates delivery status of an order in the sheet
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id: zoneId } = params;
    const body = await req.json();
    const { orderId, status, adminName } = body;

    if (!orderId || !status || (status !== 'delivered' && status !== 'pending')) {
      return NextResponse.json(
        { success: false, error: 'البيانات المطلوبة غير مكتملة (orderId, status)' },
        { status: 400 }
      );
    }

    const result = await updateOrderDeliveryStatus(
      zoneId,
      orderId,
      status,
      adminName || 'Admin'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'تعذر تحديث حالة التسليم لهذا الطلب' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      delivered_at: result.delivered_at,
      delivered_by: result.delivered_by,
      message: status === 'delivered' ? 'تم تأكيد تسليم الطلب بنجاح' : 'تم التراجع عن تسليم الطلب'
    });
  } catch (err: any) {
    console.error('Error updating order delivery status:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحديث حالة التسليم' },
      { status: 500 }
    );
  }
}

