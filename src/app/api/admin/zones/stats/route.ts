import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryAnalyticsSummary } from '@/lib/deliveryZonesService';

export const dynamic = 'force-dynamic';

// GET /api/admin/zones/stats - Returns comprehensive delivery metrics, zone breakdown, and item counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const stats = await getDeliveryAnalyticsSummary(forceRefresh);
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (err: any) {
    console.error('Error fetching delivery statistics:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل إحصائيات وتقارير التسليم' },
      { status: 500 }
    );
  }
}

